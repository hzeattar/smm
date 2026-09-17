<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $isAdmin = Auth::guard('admin')->check() || Gate::allows('isAdmin');
        $query = Ticket::query()->orderBy('id', 'desc');

        if (!$isAdmin) {
            $userId = (int) Auth::id();
            abort_if($userId <= 0, 401);
            $query->where('user_id', $userId);
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($builder) use ($search) {
                if (ctype_digit($search)) {
                    $builder->orWhere('id', (int) $search);
                }
                $builder->orWhere('subject', 'like', '%' . $search . '%')
                    ->orWhere('status', 'like', '%' . $search . '%')
                    ->orWhere('type', 'like', '%' . $search . '%');
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
        abort_if(Auth::guard('admin')->check(), 403);
        $this->authorize('isUser');

        $validated = $request->validate([
            'name' => ['required','string','max:100'],
            'email' => ['required','email','max:190'],
            'type' => ['required','string','max:100'],
            'subject' => ['required','string','max:190'],
            'message' => ['required','string','max:10000'],
            'attachment' => ['nullable','file','max:5120','mimes:jpg,jpeg,png,pdf,txt,doc,docx'],
        ]);

        $ticketData = [
            'user_id' => (int) Auth::id(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'type' => $validated['type'],
            'subject' => $validated['subject'],
            'message' => $this->sanitizeRichText($validated['message']),
        ];

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $extension = strtolower((string) $file->getClientOriginalExtension());
            $safeName = date('YmdHis') . '-' . Str::random(16) . ($extension ? '.' . $extension : '');
            $uploadDir = storage_path('uploads');
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0770, true);
            }
            $file->move($uploadDir, $safeName);
            $ticketData['file'] = $safeName;
        }

        Ticket::create($ticketData);
        return redirect()->back()->with('success_save', true);
    }

    public function show($id)
    {
        $ticket = $this->authorizedTicket($id);
        $messages = TicketMessage::where('ticket_id', $ticket->id)->orderBy('created_at', 'asc')->get();
        return view('admin.tickets-view', compact('ticket','messages'));
    }

    public function update(Request $request, $id)
    {
        $ticket = $this->authorizedTicket($id);
        $isAdmin = Auth::guard('admin')->check() || Gate::allows('isAdmin');

        if (!is_null($request->input('status'))) {
            abort_unless($isAdmin, 403);
            $validated = $request->validate([
                'status' => ['required','string','max:50'],
            ]);
            $ticket->update(['status' => $validated['status']]);
        } else {
            $validated = $request->validate([
                'content' => ['required','string','max:10000'],
            ]);

            TicketMessage::create([
                'ticket_id' => $ticket->id,
                'content' => $this->sanitizeRichText($validated['content']),
                'response_by' => $isAdmin ? 'admin' : 'user',
            ]);

            $ticket->update(['status' => $isAdmin ? 'answered' : 'pending']);
        }

        session()->put('success_update', true);
        return redirect()->back();
    }

    public function destroy($id)
    {
        $ticket = $this->authorizedTicket($id);
        return response()->json($ticket->delete(), 200);
    }

    public function downloadAttachment($file)
    {
        $safeFile = basename((string) $file);
        abort_if($safeFile !== (string) $file || $safeFile === '', 404);

        $isAdmin = Auth::guard('admin')->check() || Gate::allows('isAdmin');
        $query = Ticket::where('file', $safeFile);
        if (!$isAdmin) {
            $userId = (int) Auth::id();
            abort_if($userId <= 0, 401);
            $query->where('user_id', $userId);
        }
        $query->firstOrFail();

        $path = storage_path('uploads' . DIRECTORY_SEPARATOR . $safeFile);
        abort_unless(is_file($path), 404);
        return response()->download($path);
    }

    private function authorizedTicket($id): Ticket
    {
        $isAdmin = Auth::guard('admin')->check() || Gate::allows('isAdmin');
        $query = Ticket::where('id', $id);
        if (!$isAdmin) {
            $userId = (int) Auth::id();
            abort_if($userId <= 0, 401);
            $query->where('user_id', $userId);
        }
        return $query->firstOrFail();
    }

    private function sanitizeRichText(string $html): string
    {
        $clean = strip_tags($html, '<p><br><strong><b><em><i><u><ul><ol><li><blockquote><a>');
        $clean = preg_replace('/\son\w+\s*=\s*(["\']).*?\1/iu', '', $clean) ?? $clean;
        $clean = preg_replace('/javascript\s*:/iu', '', $clean) ?? $clean;
        return $clean;
    }
}
