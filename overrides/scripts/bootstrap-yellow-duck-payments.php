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
        'private_key' => 'ارفع QR أو ضع رابط InstaPay من لوحة الأدمن.',
        'client_id' => 'استخدم QR أو رابط InstaPay، ثم اكتب بيانات التحويل في النموذج.',
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
    } elseif ((int) $existing->min === 10 && (int) $existing->max === 100000) {
        // Upgrade only the defaults this project created; never overwrite an admin's own limits.
        DB::table('payment_methods')->where('id', $existing->id)->update([
            'min' => $method['min'],
            'max' => $method['max'],
            'image' => $method['image'],
            'updated_at' => $now,
        ]);
    }
}

$ownerReset = false;
if (strtolower((string) env('YELLOW_DUCK_RESET_OWNER_ACCOUNTS', 'false')) === 'true') {
    $adminHash = trim((string) env('YELLOW_DUCK_ADMIN_PASSWORD_HASH', ''));
    $userHash = trim((string) env('YELLOW_DUCK_USER_PASSWORD_HASH', ''));

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

fwrite(STDOUT, "Yellow Duck payment bootstrap complete. Created={$created}; OwnerReset=" . ($ownerReset ? 'yes' : 'no') . "\n");
exit(0);
