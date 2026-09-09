<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $kernel = $app->make(Kernel::class);

    DB::connection()->getPdo();
    DB::select('SELECT 1');

    $checks = [];
    foreach (['/' => 'home', '/login' => 'login'] as $path => $name) {
        $request = Request::create($path, 'GET', [], [], [], [
            'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'localhost',
            'HTTPS' => 'on',
            'SERVER_PORT' => 443,
        ]);
        $response = $kernel->handle($request);
        $status = $response->getStatusCode();
        $checks[$name] = $status;
        $kernel->terminate($request, $response);
        if ($status >= 500) {
            throw new RuntimeException($name.' returned '.$status);
        }
    }

    http_response_code(200);
    echo json_encode(['ok' => true, 'db' => true, 'routes' => $checks], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'error_class' => get_class($e),
        'error' => substr($e->getMessage(), 0, 240),
    ], JSON_UNESCAPED_SLASHES);
}
