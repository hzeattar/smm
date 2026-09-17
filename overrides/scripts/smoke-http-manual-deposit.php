<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$console = $app->make(Illuminate\Contracts\Console\Kernel::class);
$console->bootstrap();

use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\File\UploadedFile;

$userId = DB::table('users')
    ->where('status', 'active')
    ->where(function ($q) {
        $q->where('username', 'yellowduck_user')->orWhere('email', 'user@yellowduck.app');
    })
    ->value('id');

$method = DB::table('payment_methods')
    ->where('status', 'active')
    ->where(function ($q) {
        $q->where('name', 'like', '%Vodafone%')
          ->orWhere('name', 'like', '%InstaPay%')
          ->orWhere('name', 'like', '%Insta Pay%');
    })
    ->orderBy('id')
    ->first();

if (!$userId || !$method) {
    fwrite(STDOUT, "HTTP manual-deposit smoke skipped: no active user/manual method.\n");
    exit(0);
}

$tmpPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'yd-http-smoke-' . bin2hex(random_bytes(5)) . '.jpg';
$createdId = null;
$httpKernel = null;
$request = null;
$response = null;

try {
    $image = imagecreatetruecolor(1400, 1000);
    if (!$image) {
        throw new RuntimeException('Could not allocate HTTP smoke image.');
    }
    $bg = imagecolorallocate($image, 245, 245, 245);
    imagefill($image, 0, 0, $bg);
    for ($i = 0; $i < 4500; $i++) {
        $color = imagecolorallocate($image, random_int(0, 255), random_int(0, 255), random_int(0, 255));
        $x = random_int(0, 1399);
        $y = random_int(0, 999);
        imagefilledrectangle($image, $x, $y, min(1399, $x + random_int(2, 22)), min(999, $y + random_int(2, 22)), $color);
    }
    imagejpeg($image, $tmpPath, 90);
    imagedestroy($image);

    $fileSize = (int) filesize($tmpPath);
    if ($fileSize < 64 * 1024 || $fileSize > 5 * 1024 * 1024) {
        throw new RuntimeException("HTTP smoke image size is not representative: {$fileSize}");
    }

    $session = app('session')->driver();
    $session->start();
    Auth::guard('web')->setUser(App\Models\User::findOrFail((int) $userId));

    // Persist the same guard marker Laravel's SessionGuard expects on the next request.
    $guardKey = Auth::guard('web')->getName();
    $session->put($guardKey, (int) $userId);
    $token = $session->token();
    $sessionId = $session->getId();
    $session->save();

    $cookieName = (string) config('session.cookie');
    $encryptedCookie = app('encrypter')->encrypt($sessionId, false);

    $marker = 'http-smoke-' . bin2hex(random_bytes(5));
    $max = (float) $method->max;
    $min = max(1, (float) $method->min);
    $amount = $max > 0 ? min(max(1000, $min), $max) : max(1000, $min);

    $uploaded = new UploadedFile($tmpPath, $marker . '.jpg', 'image/jpeg', UPLOAD_ERR_OK, true);
    $request = Request::create(
        '/user/add-funds/manual',
        'POST',
        [
            '_token' => $token,
            'method_id' => (int) $method->id,
            'amount' => $amount,
            'sender_phone' => '01000000000',
        ],
        [$cookieName => $encryptedCookie],
        ['proof' => $uploaded],
        [
            'HTTP_HOST' => parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost',
            'HTTPS' => 'on',
            'SERVER_PORT' => '443',
            'HTTP_ACCEPT' => 'text/html,application/xhtml+xml',
            'HTTP_USER_AGENT' => 'YellowDuckProductionHttpSmoke/1.0',
        ]
    );

    $httpKernel = app(HttpKernel::class);
    $response = $httpKernel->handle($request);
    $status = (int) $response->getStatusCode();
    $body = (string) $response->getContent();

    if ($status !== 200) {
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags($body)) ?? '');
        throw new RuntimeException('Full HTTP stack returned ' . $status . ': ' . mb_substr($plain, 0, 1500));
    }

    $created = DB::table('transactions')
        ->where('user_id', (int) $userId)
        ->where('method_id', (int) $method->id)
        ->where('notes', 'like', '%' . $marker . '%')
        ->orderByDesc('id')
        ->first();

    if (!$created) {
        throw new RuntimeException('Full HTTP stack returned 200 but no transaction was persisted.');
    }
    $createdId = (int) $created->id;

    $storedBytes = (int) DB::table('yellow_duck_deposit_proofs')
        ->where('transaction_id', $createdId)
        ->selectRaw('OCTET_LENGTH(`data`) AS bytes')
        ->value('bytes');

    if ($storedBytes !== $fileSize) {
        throw new RuntimeException("Full HTTP proof mismatch expected={$fileSize}; stored={$storedBytes}");
    }

    fwrite(STDOUT, "Full HTTP manual-deposit smoke OK: middleware, encrypted DB session, CSRF, auth, upload, controller, DB transaction and response rendering. bytes={$fileSize}\n");
} catch (Throwable $e) {
    fwrite(STDERR, "FULL_HTTP_MANUAL_DEPOSIT_SMOKE_FAILED " . get_class($e) . ': ' . $e->getMessage() . "\n");
    fwrite(STDERR, $e->getTraceAsString() . "\n");
    exit(87);
} finally {
    if ($httpKernel && $request && $response) {
        try {
            $httpKernel->terminate($request, $response);
        } catch (Throwable $ignored) {
        }
    }
    if ($createdId) {
        try {
            DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $createdId)->delete();
            DB::table('transactions')->where('id', $createdId)->delete();
        } catch (Throwable $ignored) {
        }
    }
    if (is_file($tmpPath)) {
        @unlink($tmpPath);
    }
}

exit(0);
