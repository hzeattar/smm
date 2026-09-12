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
$defaults = [
    [
        'name' => 'Vodafone Cash',
        'min' => 10,
        'max' => 100000,
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
        'min' => 10,
        'max' => 100000,
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
    $exists = DB::table('payment_methods')->where('name', $method['name'])->exists();
    if ($exists) {
        continue;
    }

    $method['created_at'] = $now;
    $method['updated_at'] = $now;
    DB::table('payment_methods')->insert($method);
    $created++;
}

fwrite(STDOUT, "Yellow Duck payment bootstrap complete. Created={$created}\n");
exit(0);
