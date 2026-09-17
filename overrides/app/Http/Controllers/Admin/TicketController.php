<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TicketController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $isAdmin = Auth::guard('admin')->check();
        $query = Ticket::orderBy('id', 'desc');

        if (!$isAdmin) {
            $query->where('user_id', (int) Auth::id());
        }

        if ($request->filled('search')) {
            $search = '%' . trim((string) $request->input('search')) . '%';
            $query->where(function ($builder) use ($search) {
                $builder->where('subject', 'like', $search)
                    ->orWhere('message', 'like', $search)
                    ->orWhere('status', 'like', $search);
            });
        }

        $tickets = $query->paginate();

        if ($request->api) {
            return response()->json($tickets, 200);
        }

        return view('admin.tickets', compact('tickets'));
    }

    public function store(Request $request)
    {
        abort_unless(!Auth::guard('admin')->check() && Auth::check(), 403);

        $validated = $request->validate([
            'type' => ['required', 'in:order,payment,service,api'],
            'subject' => ['required', 'string', 'max:191'],
            'message' => ['required', 'string', 'max:10000'],
            'attachment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        if ($request->hasFile('attachment')) {
            abort_unless(
                Schema::hasTable('yellow_duck_ticket_attachments'),
                503,
                'تعذر تجهيز تخزين المرفقات حاليًا. حاول مرة أخرى بعد قليل.'
            );
        }

        $user = Auth::user();
        $displayName = trim((string) ($user->firstname ?? '') . ' ' . (string) ($user->lastname ?? ''));
        if ($displayName === '') {
            $displayName = (string) ($user->username ?? $user->email);
        }

        $ticket = DB::transaction(function () use ($request, $validated, $user, $displayName) {
            $ticket = Ticket::create([
                'name' => $displayName,
                'user_id' => (int) $user->id,
                'email' => (string) $user->email,
                'type' => $validated['type'],
                'status' => 'pending',
                'subject' => $validated['subject'],
                'message' => $validated['message'],
                'file' => null,
            ]);

            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $extension = strtolower((string) ($file->getClientOriginalExtension() ?: 'bin'));
                $storedName = 'ticket-' . $ticket->id . '-' . bin2hex(random_bytes(8)) . '.' . $extension;
                $bytes = file_get_contents($file->getRealPath());
                abort_if($bytes === false, 422, 'تعذر قراءة الملف المرفق.');

                DB::table('yellow_duck_ticket_attachments')->insert([
                    'ticket_id' => (int) $ticket->id,
                    'filename' => $storedName,
                    'mime' => (string) ($file->getMimeType() ?: 'application/octet-stream'),
                    'size_bytes' => strlen($bytes),
                    'data' => $bytes,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $ticket->update(['file' => $storedName]);
            }

            return $ticket->fresh();
        });

        if ($request->expectsJson()) {
            return response()->json($ticket, 201);
        }

        return redirect()->back()->with('success_save', true);
    }

    public function show($id)
    {
        $ticket = $this->ticketQueryForCurrentActor()->where('id', $id)->firstOrFail();
        $messages = TicketMessage::where('ticket_id', $ticket->id)
            ->orderBy('created_at', 'asc')
            ->get();

        return view('admin.tickets-view', compact('ticket', 'messages'));
    }

    public function update(Request $request, $id)
    {
        $isAdmin = Auth::guard('admin')->check();
        $ticket = $this->ticketQueryForCurrentActor()->where('id', $id)->firstOrFail();

        if ($request->filled('status')) {
            abort_unless($isAdmin, 403);
            $data = $request->validate([
                'status' => ['required', 'in:pending,answered,closed'],
            ]);
            $ticket->update(['status' => $data['status']]);
        } else {
            $data = $request->validate([
                'content' => ['required', 'string', 'max:10000'],
            ]);

            TicketMessage::create([
                'ticket_id' => (int) $ticket->id,
                'response_by' => $isAdmin ? 'admin' : 'user',
                'content' => $data['content'],
            ]);

            $ticket->update(['status' => $isAdmin ? 'answered' : 'pending']);
        }

        if ($request->expectsJson()) {
            return response()->json($ticket->fresh(), 200);
        }

        return redirect()->back()->with('success_update', true);
    }

    public function destroy($id)
    {
        $ticket = $this->ticketQueryForCurrentActor()->where('id', $id)->firstOrFail();

        if (Schema::hasTable('yellow_duck_ticket_attachments')) {
            DB::table('yellow_duck_ticket_attachments')->where('ticket_id', $ticket->id)->delete();
        }

        return response()->json($ticket->delete(), 200);
    }

    public function downloadAttachment($file)
    {
        $safeName = basename((string) $file);
        abort_if($safeName === '' || $safeName !== (string) $file, 404);

        $ticket = $this->ticketQueryForCurrentActor()->where('file', $safeName)->firstOrFail();

        if (Schema::hasTable('yellow_duck_ticket_attachments')) {
            $attachment = DB::table('yellow_duck_ticket_attachments')
                ->where('ticket_id', $ticket->id)
                ->where('filename', $safeName)
                ->first();

            if ($attachment) {
                return response((string) $attachment->data, 200)
                    ->header('Content-Type', (string) ($attachment->mime ?: 'application/octet-stream'))
                    ->header('Content-Disposition', 'attachment; filename="' . addslashes($safeName) . '"')
                    ->header('Content-Length', (string) ((int) $attachment->size_bytes))
                    ->header('Cache-Control', 'private, no-store')
                    ->header('X-Content-Type-Options', 'nosniff');
            }
        }

        // Backward-compatible fallback for legacy attachments created before persistent DB storage.
        $legacyPath = storage_path('uploads' . DIRECTORY_SEPARATOR . $safeName);
        abort_unless(is_file($legacyPath), 404);

        return response()->download($legacyPath, $safeName, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function ticketQueryForCurrentActor()
    {
        $query = Ticket::query();
        if (!Auth::guard('admin')->check()) {
            $query->where('user_id', (int) Auth::id());
        }

        return $query;
    }
}
