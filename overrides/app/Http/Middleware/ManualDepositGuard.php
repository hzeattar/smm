<?php

namespace App\Http\Middleware;

use Closure;
use Throwable;

class ManualDepositGuard
{
    public function handle($request, Closure $next)
    {
        if (!$request->is('user/add-funds/manual')) {
            return $next($request);
        }

        $traceId = 'MDG-' . now()->format('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(2)));
        $this->trace('enter', [
            'trace_id' => $traceId,
            'method' => $request->method(),
            'content_length' => $request->server('CONTENT_LENGTH'),
            'content_type' => $request->server('CONTENT_TYPE'),
        ]);

        try {
            $response = $next($request);
            $status = method_exists($response, 'getStatusCode') ? (int) $response->getStatusCode() : 0;
            $this->trace('leave', ['trace_id' => $traceId, 'status' => $status]);
            return $response;
        } catch (Throwable $e) {
            $this->trace('exception', [
                'trace_id' => $traceId,
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            try {
                return response()->view('admin.deposit_failed', [
                    'message' => 'تعذر إرسال طلب الإيداع الآن. لم يتم اعتماد أو خصم أي رصيد. رمز المتابعة: ' . $traceId,
                ], 500)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            } catch (Throwable $renderError) {
                $this->trace('render_exception', [
                    'trace_id' => $traceId,
                    'exception' => get_class($renderError),
                    'message' => $renderError->getMessage(),
                    'file' => $renderError->getFile(),
                    'line' => $renderError->getLine(),
                ]);

                return response(
                    '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تعذر إرسال الإيداع</title><body style="font-family:Arial;background:#f6f7f9;padding:40px;text-align:center"><div style="max-width:680px;margin:auto;background:#fff;padding:36px;border-radius:18px"><h1>تعذر إرسال طلب الإيداع</h1><p>لم يتم اعتماد أو خصم أي رصيد.</p><p>رمز المتابعة: ' . e($traceId) . '</p><p><a href="/user/add-funds">العودة لإضافة الرصيد</a></p></div></body></html>',
                    500,
                    ['Content-Type' => 'text/html; charset=UTF-8']
                );
            }
        }
    }

    private function trace(string $stage, array $context): void
    {
        $line = 'MANUAL_DEPOSIT_GUARD ' . $stage . ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        @error_log($line);
        $fh = @fopen('/proc/1/fd/2', 'ab');
        if ($fh) {
            @fwrite($fh, $line . PHP_EOL);
            @fclose($fh);
        }
    }
}
