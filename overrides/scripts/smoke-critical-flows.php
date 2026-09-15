<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

$requiredRoutes = [
    'user.add-funds',
    'user.manual-deposit',
    'user.transactions.index',
    'admin.transactions.index',
    'admin.transactions.proof',
    'admin.manual-balance',
];

foreach ($requiredRoutes as $route) {
    if (!Route::has($route)) {
        fwrite(STDERR, "Critical smoke check failed: missing route {$route}.\n");
        exit(81);
    }
}

$requiredTables = ['users', 'payment_methods', 'transactions', 'yellow_duck_deposit_proofs'];
foreach ($requiredTables as $table) {
    if (!Schema::hasTable($table)) {
        fwrite(STDERR, "Critical smoke check failed: missing table {$table}.\n");
        exit(82);
    }
}

$userId = DB::table('users')->orderBy('id')->value('id');
$methodId = DB::table('payment_methods')
    ->where('status', 'active')
    ->where(function ($query) {
        $query->where('name', 'like', '%Vodafone%')
            ->orWhere('name', 'like', '%InstaPay%')
            ->orWhere('name', 'like', '%Insta Pay%');
    })
    ->orderBy('id')
    ->value('id');

if (!$userId || !$methodId) {
    fwrite(STDOUT, "Critical smoke check skipped DB write test: no user/manual payment method yet.\n");
    exit(0);
}

$transactionId = null;
$smokeReference = 'SMOKE-' . date('YmdHis') . '-' . bin2hex(random_bytes(3));

try {
    $transactionId = DB::table('transactions')->insertGetId([
        'method_id' => $methodId,
        'transaction_id' => $smokeReference,
        'user_id' => $userId,
        'amount' => 55,
        'fee' => 0,
        'profit' => 0,
        'take_fee' => 0,
        'status' => 'refund',
        'notes' => "Yellow Duck manual deposit - smoke test.\nUSD credit: 1.0000",
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZLx8AAAAASUVORK5CYII=', true);
    DB::table('yellow_duck_deposit_proofs')->insert([
        'transaction_id' => $transactionId,
        'mime' => 'image/png',
        'filename' => 'smoke.png',
        'data' => 'base64:' . base64_encode($tinyPng ?: ''),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $stored = (string) DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $transactionId)->value('data');
    if (!str_starts_with($stored, 'base64:')) {
        throw new RuntimeException('Proof persistence verification failed.');
    }

    fwrite(STDOUT, "Critical smoke checks OK: routes, schema, transaction and proof persistence.\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Critical smoke check failed: " . $e->getMessage() . "\n");
    $exitCode = 83;
} finally {
    // Do not rely on SQL rollback: the legacy source schema can contain non-transactional tables.
    if ($transactionId) {
        DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $transactionId)->delete();
        DB::table('transactions')->where('id', $transactionId)->delete();
    } else {
        DB::table('transactions')->where('transaction_id', $smokeReference)->delete();
    }
}

exit($exitCode ?? 0);
