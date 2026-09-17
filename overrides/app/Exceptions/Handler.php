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
            try {
                $request = request();
                if ($request && $request->is('user/add-funds/manual')) {
                    $diagnostic = [
                        'method' => $request->method(),
                        'path' => $request->path(),
                        'user_id' => optional($request->user())->id,
                        'has_proof' => $request->hasFile('proof'),
                        'content_length' => $request->server('CONTENT_LENGTH'),
                        'exception' => get_class($e),
                        'message' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ];
                    $encoded = json_encode($diagnostic, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    @error_log('MANUAL_DEPOSIT_HTTP_EXCEPTION ' . $encoded);
                    @file_put_contents('php://stderr', 'MANUAL_DEPOSIT_HTTP_EXCEPTION ' . $encoded . PHP_EOL, FILE_APPEND);
                }
            } catch (Throwable $ignored) {
            }
        });
    }

    public function render($request, Throwable $exception)
    {
        // Forms left open across a deployment/session rotation can contain an old
        // CSRF token. Refresh those sessions instead of returning a raw framework page.
        if ($exception instanceof TokenMismatchException && $request->isMethod('post')) {
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            if ($request->is('admin/login') || $request->is('login')) {
                $route = $request->is('admin/login') ? 'admin.login' : 'login';
                return redirect()
                    ->route($route)
                    ->with('csrf_expired', 'انتهت صلاحية جلسة تسجيل الدخول. تم تحديثها تلقائياً، حاول تسجيل الدخول مرة أخرى.');
            }

            if ($request->is('user/add-funds/manual')) {
                return redirect()
                    ->route('user.add-funds')
                    ->with('csrf_expired', 'تم تحديث جلسة الدفع. أعد اختيار صورة الإيصال ثم أرسل الطلب مرة أخرى.');
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
