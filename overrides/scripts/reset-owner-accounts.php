<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

if (strtolower((string) env('YELLOW_DUCK_RESET_OWNER_ACCOUNTS', 'false')) !== 'true') {
    fwrite(STDOUT, "Owner account reset disabled; skipping.\n");
    exit(0);
}

$adminHash = trim((string) env('YELLOW_DUCK_ADMIN_PASSWORD_HASH', ''));
$userHash = trim((string) env('YELLOW_DUCK_USER_PASSWORD_HASH', ''));

if ($adminHash === '' || $userHash === '') {
    fwrite(STDERR, "Owner account reset requested but hash inputs are missing.\n");
    exit(2);
}

if (!Schema::hasTable('admins') || !Schema::hasTable('users')) {
    fwrite(STDERR, "Owner account reset skipped because auth tables are missing.\n");
    exit(3);
}

$now = date('Y-m-d H:i:s');

$adminUpdated = DB::table('admins')
    ->where('email', 'admin@yellowduck.app')
    ->update([
        'password' => $adminHash,
        'status' => 'active',
        'remember_token' => null,
        'updated_at' => $now,
    ]);

$userUpdated = DB::table('users')
    ->where('email', 'user@yellowduck.app')
    ->update([
        'password' => $userHash,
        'status' => 'active',
        'email_verified_at' => $now,
        'remember_token' => null,
        'updated_at' => $now,
    ]);

if ($adminUpdated < 1 || $userUpdated < 1) {
    fwrite(STDERR, "Owner account reset incomplete: expected accounts were not found.\n");
    exit(4);
}

fwrite(STDOUT, "Owner account credentials refreshed successfully.\n");
exit(0);
