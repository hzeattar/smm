<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Setting;
use Illuminate\Http\Request;

class CheckForMaintenanceMode
{
    public function handle(Request $request, Closure $next)
    {
        if (!file_exists(storage_path('installed'))) {
            return $next($request);
        }

        try {
            $setting = Setting::where('name', 'maintenance_mode')->first();
            if ($setting && $setting->value === 'on' && !$request->is('admin/*') && !$request->is('503')) {
                return redirect('503');
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return $next($request);
    }
}
