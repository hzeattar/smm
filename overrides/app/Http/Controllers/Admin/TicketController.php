<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $isAdmin = Auth::guard('admin')->check();
        $query = Ticket::query()->orderBy('id', 'desc');

        if (!$isAdmin) {
            $query->where('user_id', (int) Auth::id());
        }

        if ($request->filled('search')) {
            $search = '%' . trim((string) $request->input('search')) . '%';
            $query->where(function ($builder) use ($search) {
                $builder->where('subject', 'like', $search)
                    ->orWhere('name', 'like', $search)
                    ->orWhere('email', 'like', $search)
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
        abort_unless(Auth::check(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:190'],
            'type' => ['required', 'in:order,payment,service,api'],
            'subject' => ['required', 'string', 'max:190'],
            'message' => ['required', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:2048', 'mimes:jpg,jpeg,png,webp,pdf,txt'],
        ]);

        $file = $request->file('attachment');
        if ($file && !Schema::hasTable('yellow_duck_ticket_attachments')) {
            return back()->withErrors(['attachment' => 'تعذر حفظ المرفق بأمان حاليًا. حاول بدون مرفق أو أعد المحاولة لاحقًا.'])->withInput();
        }

        DB::transaction(function () use ($validated, $file) {
            $ticket = Ticket::create([
                'name' => $validated['name'],
                'user_id' => (int) Auth::id(),
                'email' => $validated['email'],
                'type' => $validated['type'],
                'status' => 'pending',
                'subject' => $validated['subject'],
                'message' => $validated['message'],
                'file' => null,
            ]);

            if ($file) {
                $extension = strtolower((string) $file->getClientOriginalExtension());
                $safeName = 'ticket-' . $ticket->id . '-' . Str::lower(Str::random(20)) . ($extension ? '.' . $extension : '');
                $bytes = file_get_contents($file->getRealPath());
                abort_if($bytes === false, 422, 'تعذر قراءة المرفق.');

                DB::table('yellow_duck_ticket_attachments')->insert([
                    'ticket_id' => $ticket->id,
                    'filename' => $safeName,
                    'original_name' => mb_substr((string) $file->getClientOriginalName(), 0, 190),
                    'mime' => mb_substr((string) ($file->getMimeType() ?: 'application/octet-stream'), 0, 100),
                    'data' => $bytes,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $ticket->update(['file' => $safeName]);
            }
        }, 3);

        return redirect()->back()->with('success_save', true);
    }

    public function show($id)
    {
        $ticket = $this->actorTicketQuery()->where('id', $id)->firstOrFail();
        $messages = TicketMessage::where('ticket_id', $ticket->id)->orderBy('created_at', 'asc')->get();

        return view('admin.tickets-view', compact('ticket', 'messages'));
    }

    public function update(Request $request, $id)
    {
        $ticket = $this->actorTicketQuery()->where('id', $id)->firstOrFail();
        $isAdmin = Auth::guard('admin')->check();

        if ($request->filled('status')) {
            abort_unless($isAdmin, 403);
            $data = $request->validate(['status' => ['required', 'in:pending,answered,closed']]);
            $ticket->update(['status' => $data['status']]);
            return redirect()->back()->with('success_update', true);
        }

        $data = $request->validate(['content' => ['required', 'string', 'max:10000']]);
        TicketMessage::create([
            'ticket_id' => $ticket->id,
            'response_by' => $isAdmin ? 'admin' : 'user',
            'content' => $data['content'],
        ]);

        $ticket->update(['status' => $isAdmin ? 'answered' : 'pending']);
        return redirect()->back()->with('success_update', true);
    }

    public function destroy($id)
    {
        abort_unless(Auth::guard('admin')->check(), 403);

        $ticket = Ticket::where('id', $id)->firstOrFail();
        DB::transaction(function () use ($ticket) {
            if (Schema::hasTable('yellow_duck_ticket_attachments')) {
                DB::table('yellow_duck_ticket_attachments')->where('ticket_id', $ticket->id)->delete();
            }
            $ticket->delete();
        });

        return response()->json(true, 200);
    }

    public function downloadAttachment($file)
    {
        abort_if($file !== basename($file), 404);

        if (Schema::hasTable('yellow_duck_ticket_attachments')) {
            $query = DB::table('yellow_duck_ticket_attachments as a')
                ->join('tickets as t', 't.id', '=', 'a.ticket_id')
                ->where('a.filename', $file)
                ->select('a.*', 't.user_id');

            if (!Auth::guard('admin')->check()) {
                $query->where('t.user_id', (int) Auth::id());
            }

            $attachment = $query->first();
            if ($attachment) {
                return response($attachment->data, 200)
                    ->header('Content-Type', (string) $attachment->mime)
                    ->header('Content-Disposition', 'attachment; filename="' . addslashes((string) $attachment->original_name) . '"')
                    ->header('Cache-Control', 'private, no-store')
                    ->header('X-Content-Type-Options', 'nosniff');
            }
        }

        // Backward-compatible fallback for legacy files that may still exist on disk.
        $ticketQuery = Ticket::where('file', $file);
        if (!Auth::guard('admin')->check()) {
            $ticketQuery->where('user_id', (int) Auth::id());
        }
        $ticketQuery->firstOrFail();

        $path = storage_path('uploads' . DIRECTORY_SEPARATOR . $file);
        abort_unless(is_file($path), 404);
        return response()->download($path, basename($file), ['X-Content-Type-Options' => 'nosniff']);
    }

    private function actorTicketQuery()
    {
        $query = Ticket::query();
        if (!Auth::guard('admin')->check()) {
            $query->where('user_id', (int) Auth::id());
        }
        return $query;
    }
}
