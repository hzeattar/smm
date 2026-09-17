<?php

use App\Helpers\Helper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\Web\IndexController;

Route::get('/', [IndexController::class, 'index'])->name('welcome');
Route::get('/terms-conditions', [IndexController::class, 'termsConditions'])->name('terms-conditions');
Route::post('/contact-us', [IndexController::class, 'constactUs'])->name('contact-us');
Route::get('languages/set-language/{id}', [LanguageController::class, 'setLanguage'])->name('languages.set-language');

Route::get('/user', function () {
    return redirect('/user/dashboard');
})->middleware('auth');

Route::get('/health', function () {
    try {
        DB::select('SELECT 1');
        return response()->json([
            'service' => 'yellow-duck-smm',
            'state' => 'ready',
            'database' => 'ok',
        ], 200);
    } catch (\Throwable $e) {
        report($e);
        return response()->json([
            'service' => 'yellow-duck-smm',
            'state' => 'degraded',
            'database' => 'unavailable',
        ], 503);
    }
})->name('health');

$disabled_routes = [];

try {
    if (file_exists(storage_path('installed')) && Schema::hasTable('settings')) {
        if (Helper::settings('user_registration') === 'off') {
            $disabled_routes['register'] = false;
        }
        if (Helper::settings('email_verification') === 'off') {
            $disabled_routes['verify'] = false;
        }
        if (Helper::settings('user_login') === 'off') {
            $disabled_routes['login'] = false;
        }
        if (Helper::settings('maintenance_mode') === 'on') {
            Route::get('/503', [IndexController::class, 'maintenanceMode'])->name('maintenance-mode');
        }
    }
} catch (\Throwable $e) {
    report($e);
}

Auth::routes($disabled_routes);
