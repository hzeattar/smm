<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

try {
    $requiredClasses = [
        App\Http\Controllers\Admin\AdminUserManagementController::class,
        App\Http\Controllers\Admin\UserController::class,
        App\Http\Controllers\Admin\OrderController::class,
    ];

    foreach ($requiredClasses as $class) {
        if (!class_exists($class)) {
            throw new RuntimeException("Missing admin user-control class: {$class}");
        }
    }

    $requiredRoutes = [
        'admin.users.index',
        'admin.users.manage',
        'admin.users.manage.profile',
        'admin.users.manage.balance',
        'admin.users.manage.order',
        'admin.users.manage.services',
    ];

    foreach ($requiredRoutes as $route) {
        if (!Route::has($route)) {
            throw new RuntimeException("Missing admin user-control route: {$route}");
        }
    }

    $requiredColumns = [
        'users' => ['id', 'username', 'firstname', 'lastname', 'email', 'password', 'status', 'funds'],
        'orders' => ['id', 'user_id', 'service_id', 'quantity', 'link', 'total', 'status', 'order_api_id'],
        'services' => ['id', 'name', 'rate', 'min', 'max', 'status'],
        'transactions' => ['id', 'method_id', 'transaction_id', 'user_id', 'amount', 'status', 'notes'],
    ];

    foreach ($requiredColumns as $table => $columns) {
        if (!Schema::hasTable($table)) {
            throw new RuntimeException("Missing table required by admin user control: {$table}");
        }
        foreach ($columns as $column) {
            if (!Schema::hasColumn($table, $column)) {
                throw new RuntimeException("Missing {$table}.{$column} required by admin user control");
            }
        }
    }

    $compiler = app('blade.compiler');
    foreach (['admin/users.blade.php', 'admin/user_manage.blade.php'] as $relative) {
        $path = resource_path('views/' . $relative);
        if (!is_file($path)) {
            throw new RuntimeException("Missing admin user-control view: {$relative}");
        }
        $compiler->compile($path);
        $compiled = $compiler->getCompiledPath($path);
        if (!is_file($compiled) || filesize($compiled) < 1) {
            throw new RuntimeException("Blade compilation failed for {$relative}");
        }
    }

    fwrite(STDOUT, "Admin user-control smoke OK: classes, routes, schema and Blade compilation.\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Admin user-control smoke failed: ' . get_class($e) . ': ' . $e->getMessage() . "\n");
    exit(88);
}
