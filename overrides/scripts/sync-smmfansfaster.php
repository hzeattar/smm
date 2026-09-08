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
$margin = max(0, (float) env('SMMFANSFASTER_MARGIN_PERCENT', 0));
$providerStatus = strtolower((string) env('SMMFANSFASTER_PROVIDER_STATUS', 'deactive')) === 'active' ? 'active' : 'deactive';
$publish = $providerStatus === 'active' && $margin > 0;

$healthPath = public_path('provider-health.json');
$health = [
    'provider' => 'SMMFansFaster',
    'configured' => $url !== '' && $key !== '',
    'connected' => false,
    'provider_status' => $providerStatus,
    'margin_percent' => $margin,
    'services' => 0,
    'active_services' => 0,
    'unsupported_services' => 0,
    'currency' => null,
    'balance' => null,
    'updated_at' => gmdate('c'),
];

$writeHealth = static function (array $data) use ($healthPath): void {
    @file_put_contents($healthPath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
};

if ($url === '' || $key === '') {
    $writeHealth($health);
    fwrite(STDOUT, "SMMFansFaster is not configured; sync skipped.\n");
    exit(0);
}

if (!Schema::hasTable('api_providers') || !Schema::hasTable('services') || !Schema::hasTable('categories')) {
    $health['error'] = 'database_not_ready';
    $writeHealth($health);
    fwrite(STDERR, "Provider sync skipped: required database tables are missing.\n");
    exit(0);
}

try {
    $client = new SmmFansFasterClient($url, $key);
    $balance = $client->balance();
    $remoteServices = $client->services();

    $health['connected'] = true;
    $health['balance'] = isset($balance['balance']) ? (float) $balance['balance'] : null;
    $health['currency'] = $balance['currency'] ?? null;

    $now = date('Y-m-d H:i:s');
    $provider = DB::table('api_providers')->where('url', $url)->first();

    $providerData = [
        'name' => 'SMMFansFaster',
        'url' => $url,
        'api_key' => $key,
        'percentage_increase' => $margin,
        'status' => $providerStatus,
        'notes' => 'Managed by Yellow Duck runtime integration. Credentials come from Railway environment variables.',
        'updated_at' => $now,
    ];

    if ($provider) {
        DB::table('api_providers')->where('id', $provider->id)->update($providerData);
        $providerId = (int) $provider->id;
    } else {
        $providerData['services_count'] = 0;
        $providerData['created_at'] = $now;
        $providerId = (int) DB::table('api_providers')->insertGetId($providerData);
    }

    $seen = [];
    $activeCount = 0;
    $unsupportedCount = 0;
    $simpleTypes = ['default', 'package'];

    foreach ($remoteServices as $remote) {
        if (!is_array($remote) || !isset($remote['service'], $remote['name'], $remote['category'], $remote['rate'], $remote['min'], $remote['max'])) {
            continue;
        }

        $serviceId = (int) $remote['service'];
        if ($serviceId <= 0) {
            continue;
        }
        $seen[] = $serviceId;

        $categoryName = trim((string) $remote['category']);
        if ($categoryName === '') {
            $categoryName = 'Other';
        }

        $category = DB::table('categories')->where('name', $categoryName)->first();
        if ($category) {
            $categoryId = (int) $category->id;
        } else {
            $categoryId = (int) DB::table('categories')->insertGetId([
                'name' => $categoryName,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $providerType = strtolower(trim((string) ($remote['type'] ?? 'Default')));
        $isSimpleType = in_array($providerType, $simpleTypes, true);
        if (!$isSimpleType) {
            $unsupportedCount++;
        }

        $rateOriginal = round((float) $remote['rate'], 4);
        $rate = round($rateOriginal * (1 + ($margin / 100)), 4);
        $serviceStatus = ($publish && $isSimpleType) ? 'active' : 'deactive';
        if ($serviceStatus === 'active') {
            $activeCount++;
        }

        $metadata = [
            'provider_type' => $remote['type'] ?? 'Default',
            'refill' => (bool) ($remote['refill'] ?? false),
            'cancel' => (bool) ($remote['cancel'] ?? false),
            'simple_order_supported' => $isSimpleType,
        ];

        $serviceData = [
            'category_id' => $categoryId,
            'api_provider_id' => $providerId,
            'api_provider_service_id' => $serviceId,
            'type' => 'api',
            'status' => $serviceStatus,
            'name' => (string) $remote['name'],
            'rate' => $rate,
            'rate_original' => $rateOriginal,
            'min' => max(1, (int) $remote['min']),
            'max' => max(1, (int) $remote['max']),
            'percentage_increase' => $margin,
            'description' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'updated_at' => $now,
        ];

        $existing = DB::table('services')
            ->where('api_provider_id', $providerId)
            ->where('api_provider_service_id', $serviceId)
            ->first();

        if ($existing) {
            DB::table('services')->where('id', $existing->id)->update($serviceData);
        } else {
            $serviceData['created_at'] = $now;
            DB::table('services')->insert($serviceData);
        }
    }

    if ($seen !== []) {
        DB::table('services')
            ->where('api_provider_id', $providerId)
            ->whereNotIn('api_provider_service_id', $seen)
            ->update(['status' => 'deactive', 'updated_at' => $now]);
    }

    $serviceCount = DB::table('services')->where('api_provider_id', $providerId)->count();
    DB::table('api_providers')->where('id', $providerId)->update([
        'services_count' => $serviceCount,
        'updated_at' => $now,
    ]);

    $health['services'] = $serviceCount;
    $health['active_services'] = $activeCount;
    $health['unsupported_services'] = $unsupportedCount;
    $health['updated_at'] = gmdate('c');
    $writeHealth($health);

    fwrite(STDOUT, sprintf(
        "SMMFansFaster sync OK. Services=%d Active=%d Unsupported=%d Margin=%.2f%% Balance=%s %s\n",
        $serviceCount,
        $activeCount,
        $unsupportedCount,
        $margin,
        $health['balance'] === null ? 'unknown' : (string) $health['balance'],
        $health['currency'] ?: ''
    ));
    exit(0);
} catch (Throwable $e) {
    $health['error'] = 'provider_unreachable';
    $health['updated_at'] = gmdate('c');
    $writeHealth($health);
    fwrite(STDERR, 'SMMFansFaster sync failed: ' . get_class($e) . "\n");
    exit(0);
}
