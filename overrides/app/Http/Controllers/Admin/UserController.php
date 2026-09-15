<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Transaction;
use App\Models\User;
use App\Traits\MainTrait;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use MainTrait;

    private const DUCK_AVATARS = [
        'duck-happy.jpg' => 'البطة السعيدة',
        'duck-cool.jpg' => 'البطة الكول',
        'duck-excited.jpg' => 'البطة المتحمسة',
        'duck-calm.jpg' => 'البطة الهادئة',
        'duck-clever.jpg' => 'البطة الذكية',
        'duck-party.jpg' => 'بطة الاحتفال',
    ];

    public function index(Request $request)
    {
        $users = User::orderBy('id', 'desc')->paginate();
        if ($request->api) {
            if ($request->filled('search')) {
                $users = $this->filter([
                    'table' => 'users',
                    'class' => User::class,
                    'search' => $request->search,
                ]);
            }
            return response()->json($users, 200);
        }

        return view('admin.users', compact('users'));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|unique:users,username',
            'firstname' => 'required|string|max:120',
            'lastname' => 'required|string|max:120',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->messages(), 400);
        }

        $data = $request->only(['username', 'firstname', 'lastname', 'email', 'status']);
        $data['password'] = Hash::make((string) $request->input('password'));
        $data['avatar'] = 'duck-happy.jpg';

        return response()->json(User::create($data), 200);
    }

    public function show($id)
    {
        return response()->json(User::findOrFail($id), 200);
    }

    public function profil(Request $request)
    {
        $isAdmin = Auth::guard('admin')->check();
        $user = $isAdmin ? Auth::guard('admin')->user() : Auth::user();
        abort_unless($user, 403);

        $duckAvatars = self::DUCK_AVATARS;
        if (!$request->isMethod('post')) {
            return view('admin.user-profil', compact('user', 'duckAvatars', 'isAdmin'));
        }

        $table = $isAdmin ? 'admins' : 'users';
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:120', Rule::unique($table, 'username')->ignore($user->id)],
            'firstname' => ['required', 'string', 'max:120'],
            'lastname' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', Rule::unique($table, 'email')->ignore($user->id)],
            'avatar_choice' => ['nullable', Rule::in(array_keys(self::DUCK_AVATARS))],
            'password' => ['nullable', 'string', 'required_with:password_new,password_new_confirm'],
            'password_new' => ['nullable', 'string', 'min:8', 'required_with:password'],
            'password_new_confirm' => ['nullable', 'same:password_new', 'required_with:password'],
        ]);

        if ($request->filled('password') && !Hash::check((string) $request->input('password'), $user->password)) {
            return back()->withErrors(['password' => 'كلمة المرور الحالية غير صحيحة.'])->withInput();
        }

        $profile = [
            'username' => $validated['username'],
            'firstname' => $validated['firstname'],
            'lastname' => $validated['lastname'],
            'email' => $validated['email'],
        ];

        if (!empty($validated['avatar_choice'])) {
            $profile['avatar'] = $validated['avatar_choice'];
        } elseif (!in_array((string) $user->avatar, array_keys(self::DUCK_AVATARS), true)) {
            $profile['avatar'] = 'duck-happy.jpg';
        }

        if ($request->filled('password_new')) {
            $profile['password'] = Hash::make((string) $request->input('password_new'));
        }

        $user->update($profile);

        return back()->with('success_update', true);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'username' => ['sometimes', 'string', 'max:120', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->messages(), 400);
        }

        $data = $request->only(['username', 'firstname', 'lastname', 'email', 'status', 'funds']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make((string) $request->input('password'));
        }
        $user->update($data);

        return response()->json($user->fresh(), 200);
    }

    public function addBalance(Request $request)
    {
        abort_unless(Gate::allows('isAdmin'), 403);

        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'amount' => 'required|numeric|min:0.0001|max:1000000',
            'note' => 'nullable|string|max:500',
        ]);

        $amount = round((float) $validated['amount'], 4);
        $admin = Auth::guard('admin')->user();

        DB::transaction(function () use ($validated, $amount, $admin) {
            $user = User::where('id', $validated['user_id'])->lockForUpdate()->firstOrFail();

            $method = PaymentMethod::firstOrCreate(
                ['name' => 'Admin Manual Credit'],
                [
                    'min' => 0,
                    'max' => 1000000,
                    'status' => 'deactive',
                    'fee' => 0,
                    'environment' => 'production',
                    'api_key' => null,
                    'private_key' => 'admin-panel',
                    'client_id' => 'Manual balance adjustment from Yellow Duck admin panel.',
                    'image' => 'admin-credit.svg',
                ]
            );

            $user->funds = round((float) $user->funds + $amount, 4);
            $user->save();

            $transaction = new Transaction();
            $transaction->method_id = $method->id;
            $transaction->transaction_id = 'ADMIN-' . now()->format('YmdHis') . '-' . $user->id . '-' . strtoupper(bin2hex(random_bytes(2)));
            $transaction->user_id = $user->id;
            $transaction->amount = $amount;
            $transaction->fee = 0;
            $transaction->profit = $amount;
            $transaction->take_fee = 0;
            $transaction->status = 'paid';
            $transaction->notes = trim(implode("\n", array_filter([
                'Admin manual balance credit.',
                'Credit USD: ' . number_format($amount, 4, '.', ''),
                'Admin: ' . ($admin ? (string) $admin->email : 'unknown'),
                'Note: ' . trim((string) ($validated['note'] ?? '')),
            ])));
            $transaction->save();
        });

        return back()->with('success', 'تمت إضافة $' . number_format($amount, 4) . ' إلى رصيد العميل وتسجيل العملية في سجل المعاملات.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        return response()->json($user->delete(), 200);
    }

    public function emailVerification(Request $request)
    {
        if ($request->isMethod('post')) {
            Auth::user()->sendEmailVerificationNotification();
            return back()->with(['verification_link' => true]);
        }

        if (!session()->has('email_verification')) {
            Auth::user()->sendEmailVerificationNotification();
        }
        session()->put('email_verification', true);

        return view('auth.verify');
    }

    public function verifyUser(EmailVerificationRequest $request)
    {
        $request->fulfill();
        return redirect('/user/dashboard')->with(['verify' => true]);
    }
}
