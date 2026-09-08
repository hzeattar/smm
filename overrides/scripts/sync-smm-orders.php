<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\SmmFansFasterClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$url = trim((string) env('SMMFANSFASTER_API_URL', ''));
$key = trim((string) env('SMMFANSFASTER_API_KEY', ''));

if ($url === '' || $key === '') {
    exit(0);
}

if (!Schema::hasTable('orders') || !Schema::hasTable('services') || !Schema::hasTable('api_providers')) {
    exit(0);
}

$provider = DB::table('api_providers')->where('url', $url)->first();
if (!$provider) {
    exit(0);
}

$statusMap = [
    'pending' => 'pending',
    'processing' => 'processing',
    'in progress' => 'in progress',
    'inprogress' => 'in progress',
    'completed' => 'completed',
    'partial' => 'partial',
    'refunded' => 'refunded',
    'refund' => 'refunded',
    'canceled' => 'refunded',
    'cancelled' => 'refunded',
    'error' => 'error',
];

$finalStatuses = ['completed', 'partial', 'refunded', 'error'];

try {
    $client = new SmmFansFasterClient($url, $key);

    $orders = DB::table('orders as o')
        ->join('services as s', 's.id', '=', 'o.service_id')
        ->where('s.api_provider_id', (int) $provider->id)
        ->whereNotNull('o.order_api_id')
        ->whereNotIn('o.status', $finalStatuses)
        ->select('o.id', 'o.order_api_id', 'o.status')
        ->orderBy('o.id')
        ->get();

    $updated = 0;
    foreach ($orders->chunk(100) as $chunk) {
        $remoteIds = [];
        $localByRemote = [];

        foreach ($chunk as $order) {
            $remoteId = (int) $order->order_api_id;
            if ($remoteId <= 0) {
                continue;
            }
            $remoteIds[] = $remoteId;
            $localByRemote[(string) $remoteId] = $order;
        }

        if ($remoteIds === []) {
            continue;
        }

        $statuses = $client->statuses($remoteIds);
        foreach ($statuses as $remoteId => $remote) {
            $remoteKey = (string) $remoteId;
            if (!isset($localByRemote[$remoteKey]) || !is_array($remote)) {
                continue;
            }

            $local = $localByRemote[$remoteKey];
            if (isset($remote['error'])) {
                DB::table('orders')->where('id', $local->id)->update([
                    'api_provider_error' => mb_substr((string) $remote['error'], 0, 250),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
                continue;
            }

            $remoteStatus = strtolower(trim((string) ($remote['status'] ?? '')));
            $mapped = $statusMap[$remoteStatus] ?? null;
            if (!$mapped) {
                continue;
            }

            DB::table('orders')->where('id', $local->id)->update([
                'status' => $mapped,
                'api_provider_error' => null,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            $updated++;
        }
    }

    fwrite(STDOUT, "Provider order status sync OK. Updated={$updated}\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Provider order status sync skipped: ' . get_class($e) . "\n");
    exit(0);
}
