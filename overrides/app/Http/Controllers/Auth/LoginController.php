<?php

namespace App\Http\Controllers\Auth;

use App\Models\Setting;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Providers\RouteServiceProvider;
use Illuminate\Foundation\Auth\AuthenticatesUsers;

class LoginController extends Controller
{
    use AuthenticatesUsers;

    protected $redirectTo = RouteServiceProvider::HOME;

    public function __construct()
    {
        $this->middleware('guest')->except('logout');
    }

    protected function credentials(Request $request)
    {
        return [
            'password' => $request->input('password'),
            $this->username() => $request->input('username'),
        ];
    }

    protected function validateLogin(Request $request)
    {
        $rules = ['password' => 'required|string'];
        $rules['username'] = $this->username() === 'email'
            ? 'required|email|string'
            : 'required|string';
        $request->validate($rules);
    }

    public function username()
    {
        return filter_var(request()->input('username'), FILTER_VALIDATE_EMAIL)
            ? 'email'
            : 'username';
    }

    public function login(Request $request)
    {
        $this->validateLogin($request);

        if (method_exists($this, 'hasTooManyLoginAttempts') && $this->hasTooManyLoginAttempts($request)) {
            $this->fireLockoutEvent($request);
            return $this->sendLockoutResponse($request);
        }

        if (Auth::attempt($this->credentials($request), $request->filled('remember'))) {
            $user = auth()->user();

            if (!$user || $user->status !== 'active') {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                return back()->with(['account_disabled' => true]);
            }

            $verifySetting = Setting::where('name', 'email_verification_tpl_active')->first();
            if ($verifySetting && $verifySetting->value === 'on' && is_null($user->email_verified_at)) {
                $this->clearLoginAttempts($request);
                return redirect('user/verify/email');
            }

            $this->clearLoginAttempts($request);
            return $this->sendLoginResponse($request);
        }

        $this->incrementLoginAttempts($request);
        return $this->sendFailedLoginResponse($request);
    }
}
