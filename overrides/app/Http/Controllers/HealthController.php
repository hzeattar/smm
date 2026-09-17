<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class HealthController extends Controller
{
    public function __invoke()
    {
        $checks = [
            'app' => true,
            'database' => false,
            'schema' => false,
            'sessions' => false,
        ];

        try {
            DB::select('SELECT 1');
            $checks['database'] = true;

            $required = ['users', 'admins', 'services', 'orders', 'transactions'];
            $checks['schema'] = collect($required)->every(function ($table) {
                return Schema::hasTable($table);
            });

            $checks['sessions'] = config('session.driver') !== 'database' || Schema::hasTable('sessions');
        } catch (Throwable $e) {
            $checks['error'] = class_basename($e);
        }

        $ready = $checks['database'] && $checks['schema'] && $checks['sessions'];

        return response()->json([
            'service' => 'yellow-duck-smm',
            'status' => $ready ? 'ok' : 'degraded',
            'checks' => $checks,
            'timestamp' => now()->toIso8601String(),
        ], $ready ? 200 : 503)
            ->header('Cache-Control', 'no-store');
    }
}
