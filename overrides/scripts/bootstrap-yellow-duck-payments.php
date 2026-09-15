<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

if (!Schema::hasTable('payment_methods')) {
    fwrite(STDOUT, "Payment methods table is not ready; Yellow Duck payment bootstrap skipped.\n");
    exit(0);
}

$now = date('Y-m-d H:i:s');
$rate = 55;

if (Schema::hasTable('settings') && !DB::table('settings')->where('name', 'yellow_duck_usd_egp_rate')->exists()) {
    DB::table('settings')->insert([
        'name' => 'yellow_duck_usd_egp_rate',
        'value' => (string) $rate,
        'type' => 'general',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
}

DB::statement("CREATE TABLE IF NOT EXISTS `yellow_duck_deposit_proofs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` BIGINT UNSIGNED NOT NULL,
    `mime` VARCHAR(100) NOT NULL,
    `filename` VARCHAR(255) NULL,
    `data` MEDIUMBLOB NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `yd_deposit_proofs_transaction_unique` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$defaults = [
    [
        'name' => 'Vodafone Cash',
        'min' => 55,
        'max' => 550000,
        'status' => 'active',
        'fee' => 0,
        'environment' => 'production',
        'api_key' => null,
        'private_key' => '01205323440',
        'client_id' => 'حول على رقم فودافون كاش ثم اكتب رقم الهاتف والمبلغ في النموذج.',
        'image' => 'vodafone-cash.svg',
    ],
    [
        'name' => 'InstaPay Egypt',
        'min' => 55,
        'max' => 550000,
        'status' => 'active',
        'fee' => 0,
        'environment' => 'production',
        'api_key' => null,
        'private_key' => 'menna_206@instapay',
        'client_id' => 'استخدم QR أو حوّل إلى menna_206@instapay ثم اكتب بيانات التحويل وارفق صورة الإثبات.',
        'image' => 'instapay.svg',
    ],
];

$created = 0;
foreach ($defaults as $method) {
    $existing = DB::table('payment_methods')->where('name', $method['name'])->first();
    if (!$existing) {
        $method['created_at'] = $now;
        $method['updated_at'] = $now;
        DB::table('payment_methods')->insert($method);
        $created++;
        continue;
    }

    $updates = [];
    if ((int) $existing->min === 10 && (int) $existing->max === 100000) {
        $updates['min'] = $method['min'];
        $updates['max'] = $method['max'];
        $updates['image'] = $method['image'];
    }

    if ($method['name'] === 'InstaPay Egypt') {
        $currentDestination = trim((string) $existing->private_key);
        if ($currentDestination === '' || str_contains($currentDestination, 'ارفع QR')) {
            $updates['private_key'] = 'menna_206@instapay';
            $updates['client_id'] = $method['client_id'];
        }
    }

    if ($updates) {
        $updates['updated_at'] = $now;
        DB::table('payment_methods')->where('id', $existing->id)->update($updates);
    }
}

$ownerReset = false;
$resetFlag = strtolower(trim((string) (getenv('YELLOW_DUCK_RESET_OWNER_ACCOUNTS') ?: 'false')));
if ($resetFlag === 'true') {
    $adminHash = trim((string) (getenv('YELLOW_DUCK_ADMIN_PASSWORD_HASH') ?: ''));
    $userHash = trim((string) (getenv('YELLOW_DUCK_USER_PASSWORD_HASH') ?: ''));

    if ($adminHash === '' || $userHash === '') {
        fwrite(STDERR, "Owner credential refresh requested but hash inputs are missing.\n");
    } elseif (!Schema::hasTable('admins') || !Schema::hasTable('users')) {
        fwrite(STDERR, "Owner credential refresh skipped because auth tables are missing.\n");
    } else {
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

        $ownerReset = $adminUpdated > 0 && $userUpdated > 0;
        fwrite(STDOUT, $ownerReset
            ? "Owner account credentials refreshed successfully.\n"
            : "Owner credential refresh incomplete: expected accounts were not found.\n");
    }
}

fwrite(STDOUT, "Yellow Duck payment bootstrap complete. Created={$created}; ProofTable=yes; OwnerReset=" . ($ownerReset ? 'yes' : 'no') . "\n");
exit(0);
