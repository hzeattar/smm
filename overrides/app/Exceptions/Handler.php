<?php

namespace App\Exceptions;

use Throwable;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;

class Handler extends ExceptionHandler
{
    protected $dontReport = [
        //
    ];

    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    public function render($request, Throwable $exception)
    {
        // A login form left open across a deploy/session rotation can contain an
        // old CSRF token. Never show the raw Laravel 419 page for this case:
        // rotate the stale session/token and send the browser to a fresh form.
        if ($exception instanceof TokenMismatchException && $request->isMethod('post')) {
            if ($request->is('admin/login') || $request->is('login')) {
                if ($request->hasSession()) {
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                }

                $route = $request->is('admin/login') ? 'admin.login' : 'login';

                return redirect()
                    ->route($route)
                    ->with('csrf_expired', 'انتهت صلاحية جلسة تسجيل الدخول. تم تحديثها تلقائياً، حاول تسجيل الدخول مرة أخرى.');
            }
        }

        return parent::render($request, $exception);
    }

    protected function unauthenticated($request, AuthenticationException $exception)
    {
        if (in_array('admin', $exception->guards(), true)) {
            return $request->expectsJson()
                ? response()->json(['message' => $exception->getMessage()], 401)
                : redirect()->guest(route('admin.login'));
        }

        return $request->expectsJson()
            ? response()->json(['message' => $exception->getMessage()], 401)
            : redirect()->guest(route('login'));
    }
}
