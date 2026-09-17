<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserNotificationController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        [$actorId, $isForAdmin] = $this->actorScope();

        $query = UserNotification::where('user_id', $actorId)
            ->where('is_for_admin', $isForAdmin)
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = '%' . trim((string) $request->input('search')) . '%';
            $query->where(function ($builder) use ($search) {
                $builder->where('subject', 'like', $search)
                    ->orWhere('content', 'like', $search);
            });
        }

        $userNotifications = $query->paginate();
        if ($request->api) {
            return response()->json($userNotifications, 200);
        }

        return view('admin.user-notifications', compact('userNotifications'));
    }

    public function store(Request $request)
    {
        abort_unless(Auth::guard('admin')->check(), 403);

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:190'],
            'content' => ['required', 'string', 'max:10000'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'is_for_admin' => ['nullable', 'boolean'],
            'icon' => ['nullable', 'string', 'max:190'],
        ]);

        $userNotification = UserNotification::create([
            'subject' => $data['subject'],
            'content' => $data['content'],
            'user_id' => (int) $data['user_id'],
            'is_for_admin' => !empty($data['is_for_admin']) ? 1 : 0,
            'icon' => $data['icon'] ?? 'fa fa-fw fa-check-circle text-success',
            'viewed' => 0,
        ]);

        return response()->json($userNotification, 200);
    }

    public function show($id)
    {
        [$actorId, $isForAdmin] = $this->actorScope();

        $userNotification = UserNotification::with(['user'])
            ->where('id', $id)
            ->where('user_id', $actorId)
            ->where('is_for_admin', $isForAdmin)
            ->firstOrFail();

        if ((int) $userNotification->viewed !== 1) {
            $userNotification->update(['viewed' => 1]);
        }

        return view('admin.user-notifications-show', compact('userNotification'));
    }

    public function destroy($id)
    {
        [$actorId, $isForAdmin] = $this->actorScope();

        $notification = UserNotification::where('id', $id)
            ->where('user_id', $actorId)
            ->where('is_for_admin', $isForAdmin)
            ->firstOrFail();

        return response()->json($notification->delete(), 200);
    }

    private function actorScope(): array
    {
        if (Auth::guard('admin')->check()) {
            $admin = Auth::guard('admin')->user();
            abort_unless($admin, 403);
            return [(int) $admin->id, 1];
        }

        $user = Auth::user();
        abort_unless($user, 403);
        return [(int) $user->id, 0];
    }
}
