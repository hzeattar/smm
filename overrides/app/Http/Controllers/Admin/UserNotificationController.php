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
        $isAdmin = Auth::guard('admin')->check();
        $ownerId = $isAdmin ? (int) Auth::guard('admin')->id() : (int) Auth::id();
        abort_if($ownerId <= 0, 401);

        $query = UserNotification::where('user_id', $ownerId)
            ->where('is_for_admin', $isAdmin ? 1 : 0)
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($builder) use ($search) {
                if (ctype_digit($search)) {
                    $builder->orWhere('id', (int) $search);
                }
                $builder->orWhere('title', 'like', '%' . $search . '%')
                    ->orWhere('message', 'like', '%' . $search . '%');
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

        $validated = $request->validate([
            'user_id' => ['required','integer'],
            'title' => ['nullable','string','max:190'],
            'message' => ['required','string','max:10000'],
            'is_for_admin' => ['nullable','boolean'],
            'viewed' => ['nullable','boolean'],
        ]);

        $notification = UserNotification::create([
            'user_id' => (int) $validated['user_id'],
            'title' => $validated['title'] ?? null,
            'message' => $validated['message'],
            'is_for_admin' => (int) ($validated['is_for_admin'] ?? 0),
            'viewed' => (int) ($validated['viewed'] ?? 0),
        ]);

        return response()->json($notification, 200);
    }

    public function show($id)
    {
        $notification = $this->authorizedNotification($id);
        if (!(bool) $notification->viewed) {
            $notification->update(['viewed' => 1]);
        }
        return view('admin.user-notifications-show', ['userNotification' => $notification]);
    }

    public function destroy($id)
    {
        $notification = $this->authorizedNotification($id);
        return response()->json($notification->delete(), 200);
    }

    private function authorizedNotification($id): UserNotification
    {
        $isAdmin = Auth::guard('admin')->check();
        $ownerId = $isAdmin ? (int) Auth::guard('admin')->id() : (int) Auth::id();
        abort_if($ownerId <= 0, 401);

        return UserNotification::where('id', $id)
            ->where('user_id', $ownerId)
            ->where('is_for_admin', $isAdmin ? 1 : 0)
            ->firstOrFail();
    }
}
