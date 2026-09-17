<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\File\UploadedFile;

$requiredClasses = [
    App\Http\Controllers\Admin\ManualDepositController::class,
    App\Http\Controllers\Admin\TransactionController::class,
    App\Observers\TransactionObserver::class,
    App\Support\YellowDuckMoney::class,
];

foreach ($requiredClasses as $class) {
    if (!class_exists($class)) {
        fwrite(STDERR, "Critical smoke check failed: missing class {$class}.\n");
        exit(80);
    }
}

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

$userId = DB::table('users')->where('status', 'active')->orderBy('id')->value('id');
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
    fwrite(STDOUT, "Critical smoke check skipped DB write test: no active user/manual payment method yet.\n");
    exit(0);
}

$directTransactionId = null;
$directReference = 'SMOKE-DB-' . date('YmdHis') . '-' . bin2hex(random_bytes(3));

try {
    $directTransactionId = DB::table('transactions')->insertGetId([
        'method_id' => $methodId,
        'transaction_id' => $directReference,
        'user_id' => $userId,
        'amount' => 55,
        'fee' => 0,
        'profit' => 0,
        'take_fee' => 0,
        'status' => 'refund',
        'notes' => "Yellow Duck manual deposit - smoke DB test.\nUSD credit: 1.0000",
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZLx8AAAAASUVORK5CYII=', true);
    DB::table('yellow_duck_deposit_proofs')->insert([
        'transaction_id' => $directTransactionId,
        'mime' => 'image/png',
        'filename' => 'smoke-db.png',
        'data' => $tinyPng ?: '',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $storedLength = (int) DB::table('yellow_duck_deposit_proofs')
        ->where('transaction_id', $directTransactionId)
        ->selectRaw('OCTET_LENGTH(data) AS bytes')
        ->value('bytes');

    if ($storedLength < 1) {
        throw new RuntimeException('Binary proof persistence verification failed.');
    }
} catch (Throwable $e) {
    fwrite(STDERR, "Critical smoke DB write failed: " . get_class($e) . ': ' . $e->getMessage() . "\n");
    $exitCode = 83;
} finally {
    if ($directTransactionId) {
        DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $directTransactionId)->delete();
        DB::table('transactions')->where('id', $directTransactionId)->delete();
    } else {
        DB::table('transactions')->where('transaction_id', $directReference)->delete();
    }
}

if (isset($exitCode)) {
    exit($exitCode);
}

$marker = 'smoke-e2e-' . bin2hex(random_bytes(5));
$tmpPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $marker . '.jpg';
$response = null;

try {
    $image = imagecreatetruecolor(64, 64);
    if (!$image) {
        throw new RuntimeException('Unable to create smoke proof image.');
    }
    $bg = imagecolorallocate($image, 245, 245, 245);
    imagefill($image, 0, 0, $bg);
    imagejpeg($image, $tmpPath, 80);
    imagedestroy($image);

    if (!is_file($tmpPath) || filesize($tmpPath) < 1) {
        throw new RuntimeException('Smoke proof image was not written.');
    }

    if (!Auth::loginUsingId((int) $userId)) {
        throw new RuntimeException('Could not authenticate smoke-test user.');
    }

    $uploaded = new UploadedFile($tmpPath, $marker . '.jpg', 'image/jpeg', UPLOAD_ERR_OK, true);
    $request = Request::create(
        '/user/add-funds/manual',
        'POST',
        [
            'method_id' => (int) $methodId,
            'amount' => 55,
            'sender_phone' => '01000000000',
        ],
        [],
        ['proof' => $uploaded]
    );

    $controller = app(App\Http\Controllers\Admin\ManualDepositController::class);
    $response = $controller->store($request);
    $status = method_exists($response, 'getStatusCode') ? (int) $response->getStatusCode() : 0;

    if ($status !== 200) {
        $body = method_exists($response, 'getContent') ? (string) $response->getContent() : '';
        $plainBody = trim(preg_replace('/\s+/', ' ', strip_tags($body)) ?? '');
        if ($plainBody !== '') {
            fwrite(STDERR, "Manual deposit smoke response: " . mb_substr($plainBody, 0, 1600) . "\n");
        }

        $logPath = storage_path('logs/laravel.log');
        $logTail = '';
        if (is_file($logPath)) {
            $size = filesize($logPath);
            $fh = fopen($logPath, 'rb');
            if ($fh) {
                if ($size > 12000) {
                    fseek($fh, -12000, SEEK_END);
                }
                $logTail = stream_get_contents($fh) ?: '';
                fclose($fh);
            }
        }
        fwrite(STDERR, "Critical manual-deposit controller smoke failed with HTTP {$status}.\n");
        if ($logTail !== '') {
            fwrite(STDERR, "--- laravel.log tail ---\n{$logTail}\n--- end laravel.log tail ---\n");
        }
        throw new RuntimeException("Manual deposit controller returned HTTP {$status}.");
    }

    $created = DB::table('transactions')
        ->where('user_id', $userId)
        ->where('method_id', $methodId)
        ->where('notes', 'like', '%' . $marker . '%')
        ->orderByDesc('id')
        ->first();

    if (!$created) {
        throw new RuntimeException('Manual deposit controller returned success but did not persist the transaction.');
    }

    $proofExists = DB::table('yellow_duck_deposit_proofs')
        ->where('transaction_id', $created->id)
        ->exists();

    if (!$proofExists) {
        throw new RuntimeException('Manual deposit controller persisted transaction without proof.');
    }

    fwrite(STDOUT, "Critical smoke checks OK: classes, routes, schema, binary proof persistence and full manual-deposit controller flow.\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Critical manual-deposit flow failed: " . get_class($e) . ': ' . $e->getMessage() . "\n");
    $exitCode = 84;
} finally {
    try {
        $rows = DB::table('transactions')
            ->where('user_id', $userId)
            ->where('method_id', $methodId)
            ->where('notes', 'like', '%' . $marker . '%')
            ->pluck('id');
        foreach ($rows as $id) {
            DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $id)->delete();
            DB::table('transactions')->where('id', $id)->delete();
        }
    } catch (Throwable $cleanupError) {
        fwrite(STDERR, "Smoke cleanup warning: " . $cleanupError->getMessage() . "\n");
    }

    Auth::logout();
    if (is_file($tmpPath)) {
        @unlink($tmpPath);
    }
}

exit($exitCode ?? 0);
