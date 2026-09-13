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

fwrite(STDOUT, "Yellow Duck payment bootstrap complete. Created={$created}\n");
exit(0);
