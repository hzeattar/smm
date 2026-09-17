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

$proofColumn = DB::selectOne(
    "SELECT DATA_TYPE AS data_type, COLUMN_TYPE AS column_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'yellow_duck_deposit_proofs'
       AND COLUMN_NAME = 'data'
     LIMIT 1"
);
$proofType = strtolower((string) ($proofColumn->data_type ?? ''));
if (!in_array($proofType, ['mediumblob', 'longblob'], true)) {
    fwrite(STDERR, "Critical smoke check failed: receipt data column is {$proofType}, expected MEDIUMBLOB/LONGBLOB.\n");
    exit(83);
}

$packet = (int) (DB::selectOne('SELECT @@max_allowed_packet AS bytes')->bytes ?? 0);
if ($packet < 6 * 1024 * 1024) {
    fwrite(STDERR, "Critical smoke check failed: MySQL max_allowed_packet is too small ({$packet}).\n");
    exit(84);
}

$userId = DB::table('users')
    ->where('status', 'active')
    ->where(function ($q) {
        $q->where('username', 'yellowduck_user')->orWhere('email', 'user@yellowduck.app');
    })
    ->value('id');
if (!$userId) {
    $userId = DB::table('users')->where('status', 'active')->orderBy('id')->value('id');
}

$methods = DB::table('payment_methods')
    ->where('status', 'active')
    ->where(function ($query) {
        $query->where('name', 'like', '%Vodafone%')
            ->orWhere('name', 'like', '%InstaPay%')
            ->orWhere('name', 'like', '%Insta Pay%');
    })
    ->orderBy('id')
    ->get();

if (!$userId || $methods->isEmpty()) {
    fwrite(STDOUT, "Critical smoke check skipped manual deposit flow: no active test user/manual payment method.\n");
    exit(0);
}

// First prove that the live DB schema can persist a production-sized binary payload,
// not only the tiny 1x1 image that let earlier schema mistakes slip through.
$largeReference = 'SMOKE-LARGE-' . date('YmdHis') . '-' . bin2hex(random_bytes(3));
$largeTransactionId = null;
try {
    $firstMethod = $methods->first();
    $largeTransactionId = (int) DB::table('transactions')->insertGetId([
        'method_id' => $firstMethod->id,
        'transaction_id' => $largeReference,
        'user_id' => $userId,
        'amount' => 55,
        'fee' => 0,
        'profit' => 0,
        'take_fee' => 0,
        'status' => 'refund',
        'notes' => 'Yellow Duck manual deposit - large binary smoke DB test.',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $largeBlob = random_bytes(2 * 1024 * 1024);
    $now = now()->format('Y-m-d H:i:s');
    $pdo = DB::connection()->getPdo();
    $statement = $pdo->prepare(
        'INSERT INTO `yellow_duck_deposit_proofs` '
        . '(`transaction_id`,`mime`,`filename`,`data`,`created_at`,`updated_at`) '
        . 'VALUES (:transaction_id,:mime,:filename,:data,:created_at,:updated_at)'
    );
    $statement->bindValue(':transaction_id', $largeTransactionId, PDO::PARAM_INT);
    $statement->bindValue(':mime', 'image/jpeg', PDO::PARAM_STR);
    $statement->bindValue(':filename', 'smoke-large.jpg', PDO::PARAM_STR);
    $statement->bindParam(':data', $largeBlob, PDO::PARAM_LOB);
    $statement->bindValue(':created_at', $now, PDO::PARAM_STR);
    $statement->bindValue(':updated_at', $now, PDO::PARAM_STR);
    $statement->execute();

    $storedLength = (int) DB::table('yellow_duck_deposit_proofs')
        ->where('transaction_id', $largeTransactionId)
        ->selectRaw('OCTET_LENGTH(`data`) AS bytes')
        ->value('bytes');
    if ($storedLength !== strlen($largeBlob)) {
        throw new RuntimeException("Large binary proof persistence failed. expected=" . strlen($largeBlob) . "; stored={$storedLength}");
    }
} catch (Throwable $e) {
    fwrite(STDERR, "Critical large-receipt DB check failed: " . get_class($e) . ': ' . $e->getMessage() . "\n");
    $exitCode = 85;
} finally {
    if ($largeTransactionId) {
        DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $largeTransactionId)->delete();
        DB::table('transactions')->where('id', $largeTransactionId)->delete();
    } else {
        DB::table('transactions')->where('transaction_id', $largeReference)->delete();
    }
}
if (isset($exitCode)) {
    exit($exitCode);
}

$tmpPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'yellow-duck-deposit-e2e-' . bin2hex(random_bytes(5)) . '.jpg';
$createdTransactionIds = [];

try {
    // Generate a realistic screenshot-sized JPEG (>64 KB) so the controller test
    // exercises the same binary path as a browser receipt, not a tiny placeholder.
    $image = imagecreatetruecolor(1600, 1200);
    if (!$image) {
        throw new RuntimeException('Unable to create smoke receipt image.');
    }
    $background = imagecolorallocate($image, 245, 245, 245);
    imagefill($image, 0, 0, $background);
    for ($i = 0; $i < 7000; $i++) {
        $color = imagecolorallocate($image, random_int(0, 255), random_int(0, 255), random_int(0, 255));
        $x = random_int(0, 1599);
        $y = random_int(0, 1199);
        imagefilledrectangle($image, $x, $y, min(1599, $x + random_int(2, 25)), min(1199, $y + random_int(2, 25)), $color);
    }
    imagejpeg($image, $tmpPath, 92);
    imagedestroy($image);

    $fileSize = is_file($tmpPath) ? (int) filesize($tmpPath) : 0;
    if ($fileSize < 64 * 1024 || $fileSize > 5 * 1024 * 1024) {
        throw new RuntimeException("Smoke receipt size is not representative: {$fileSize} bytes.");
    }

    if (!Auth::loginUsingId((int) $userId)) {
        throw new RuntimeException('Could not authenticate smoke-test user.');
    }

    $controller = app(App\Http\Controllers\Admin\ManualDepositController::class);

    foreach ($methods as $method) {
        $marker = 'smoke-e2e-' . $method->id . '-' . bin2hex(random_bytes(5));
        $max = (float) $method->max;
        $min = max(1, (float) $method->min);
        $amount = $max > 0 ? min(max(1000, $min), $max) : max(1000, $min);

        $uploaded = new UploadedFile($tmpPath, $marker . '.jpg', 'image/jpeg', UPLOAD_ERR_OK, true);
        $request = Request::create(
            '/user/add-funds/manual',
            'POST',
            [
                'method_id' => (int) $method->id,
                'amount' => $amount,
                'sender_phone' => '01000000000',
            ],
            [],
            ['proof' => $uploaded]
        );

        $response = $controller->store($request);
        $status = method_exists($response, 'getStatusCode') ? (int) $response->getStatusCode() : 0;
        if ($status !== 200) {
            $body = method_exists($response, 'getContent') ? (string) $response->getContent() : '';
            $plainBody = trim(preg_replace('/\s+/', ' ', strip_tags($body)) ?? '');
            fwrite(STDERR, "Manual deposit smoke failed for method {$method->id} ({$method->name}) HTTP {$status}: " . mb_substr($plainBody, 0, 1200) . "\n");
            throw new RuntimeException("Manual deposit controller returned HTTP {$status} for {$method->name}.");
        }

        $created = DB::table('transactions')
            ->where('user_id', $userId)
            ->where('method_id', $method->id)
            ->where('notes', 'like', '%' . $marker . '%')
            ->orderByDesc('id')
            ->first();
        if (!$created) {
            throw new RuntimeException("Manual deposit success response did not persist transaction for {$method->name}.");
        }
        $createdTransactionIds[] = (int) $created->id;

        $stored = DB::table('yellow_duck_deposit_proofs')
            ->where('transaction_id', $created->id)
            ->selectRaw('OCTET_LENGTH(`data`) AS bytes')
            ->value('bytes');
        if ((int) $stored !== $fileSize) {
            throw new RuntimeException("Receipt byte mismatch for {$method->name}: expected {$fileSize}; stored " . (int) $stored);
        }
    }

    fwrite(STDOUT, "Critical smoke checks OK: classes, routes, schema={$proofType}, max_packet={$packet}, 2MB blob, and full manual-deposit flow for {$methods->count()} manual methods with {$fileSize}-byte browser-like receipt.\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Critical manual-deposit flow failed: " . get_class($e) . ': ' . $e->getMessage() . "\n");
    $exitCode = 86;
} finally {
    foreach ($createdTransactionIds as $id) {
        try {
            DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $id)->delete();
            DB::table('transactions')->where('id', $id)->delete();
        } catch (Throwable $cleanupError) {
            fwrite(STDERR, "Smoke cleanup warning for {$id}: " . $cleanupError->getMessage() . "\n");
        }
    }

    Auth::logout();
    if (is_file($tmpPath)) {
        @unlink($tmpPath);
    }
}

exit($exitCode ?? 0);
