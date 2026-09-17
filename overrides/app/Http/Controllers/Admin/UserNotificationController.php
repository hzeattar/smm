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
        $query = UserNotification::with(['user'])->orderBy('id', 'desc');

        if ($isAdmin) {
            $query->where('is_for_admin', 1);
        } else {
            $query->where('user_id', (int) Auth::id())
                ->where('is_for_admin', 0);
        }

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
            'subject' => ['required', 'string', 'max:191'],
            'content' => ['required', 'string', 'max:10000'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'is_for_admin' => ['nullable', 'boolean'],
            'icon' => ['nullable', 'string', 'max:191'],
        ]);
        $data['is_for_admin'] = !empty($data['is_for_admin']) ? 1 : 0;
        $data['viewed'] = 0;

        $userNotification = UserNotification::create($data);
        return response()->json($userNotification, 200);
    }

    public function show($id)
    {
        $query = UserNotification::with(['user'])->where('id', $id);

        if (!Auth::guard('admin')->check()) {
            $query->where('user_id', (int) Auth::id())
                ->where('is_for_admin', 0);
        }

        $userNotification = $query->firstOrFail();
        if ((int) $userNotification->viewed !== 1) {
            $userNotification->update(['viewed' => 1]);
        }

        return view('admin.user-notifications-show', compact('userNotification'));
    }

    public function destroy($id)
    {
        $query = UserNotification::where('id', $id);

        if (!Auth::guard('admin')->check()) {
            $query->where('user_id', (int) Auth::id())
                ->where('is_for_admin', 0);
        }

        $notification = $query->firstOrFail();
        return response()->json($notification->delete(), 200);
    }
}
