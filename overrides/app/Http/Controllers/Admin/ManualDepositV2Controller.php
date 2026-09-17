<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Support\YellowDuckMoney;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Throwable;

class ManualDepositV2Controller extends Controller
{
    public function store(Request $request)
    {
        $traceId = 'MD-' . now()->format('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(2)));
        $this->trace('start', ['trace_id' => $traceId, 'user_id' => Auth::id(), 'content_length' => $request->server('CONTENT_LENGTH')]);

        try {
            $validator = Validator::make($request->only(['method_id', 'amount', 'sender_phone']), [
                'method_id' => 'required|integer|exists:payment_methods,id',
                'amount' => 'required|numeric|min:1',
                'sender_phone' => ['required', 'string', 'max:80', 'regex:/^[0-9+\s-]{7,25}$/'],
            ], [
                'sender_phone.regex' => 'اكتب رقم الهاتف الذي تم التحويل منه بشكل صحيح.',
            ]);

            if ($validator->fails()) {
                return $this->failed(implode(' ', $validator->errors()->all()), 422);
            }

            $userId = (int) Auth::id();
            if ($userId <= 0) {
                return redirect()->route('login');
            }

            $method = PaymentMethod::query()
                ->whereKey((int) $request->input('method_id'))
                ->where('status', 'active')
                ->first();

            if (!$method || !$this->isManualPaymentMethod($method)) {
                return $this->failed('طريقة الدفع المختارة غير متاحة. استخدم فودافون كاش أو InstaPay.', 422);
            }

            $amount = round((float) $request->input('amount'), 2);
            if ($amount < (float) $method->min || ((float) $method->max > 0 && $amount > (float) $method->max)) {
                return $this->failed('المبلغ خارج حدود طريقة الدفع المختارة.', 422);
            }

            [$proofBytes, $proofMime, $proofName] = $this->extractProof($request);

            $fee = round($amount * ((float) $method->fee / 100), 2);
            $rate = YellowDuckMoney::exchangeRate();
            if ($rate <= 0) {
                throw new \RuntimeException('Invalid EGP/USD exchange rate.');
            }
            $credit = max(0, round(($amount - $fee) / $rate, 4));
            $destination = $this->paymentDestination($method);
            $senderPhone = trim((string) $request->input('sender_phone'));
            $reference = 'YD-' . now()->format('YmdHis') . '-' . $userId . '-' . strtoupper(bin2hex(random_bytes(3)));

            $notes = implode("\n", [
                'Yellow Duck manual deposit - pending admin approval.',
                'Payment method: ' . (string) $method->name,
                'Payment destination: ' . $destination,
                'Deposit currency: EGP',
                'Deposit amount (EGP): ' . number_format($amount, 2, '.', ''),
                'Exchange rate: EGP ' . number_format($rate, 2, '.', '') . ' = USD 1',
                'USD credit: ' . number_format($credit, 4, '.', ''),
                'Sender phone: ' . $senderPhone,
                'Proof filename: ' . $proofName,
                'Trace ID: ' . $traceId,
            ]);

            $this->ensureProofTable();

            $transactionDbId = DB::transaction(function () use ($method, $reference, $userId, $amount, $fee, $notes, $proofMime, $proofName, $proofBytes) {
                $now = now()->format('Y-m-d H:i:s');
                $id = (int) DB::table('transactions')->insertGetId([
                    'method_id' => $method->id,
                    'transaction_id' => $reference,
                    'user_id' => $userId,
                    'amount' => $amount,
                    'fee' => 0,
                    'profit' => 0,
                    'take_fee' => $fee,
                    'status' => 'refund',
                    'notes' => $notes,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                if ($id <= 0) {
                    throw new \RuntimeException('Transaction insert did not return an id.');
                }

                $pdo = DB::connection()->getPdo();
                $statement = $pdo->prepare(
                    'INSERT INTO `yellow_duck_deposit_proofs` '
                    . '(`transaction_id`,`mime`,`filename`,`data`,`created_at`,`updated_at`) '
                    . 'VALUES (:transaction_id,:mime,:filename,:data,:created_at,:updated_at)'
                );
                $statement->bindValue(':transaction_id', $id, \PDO::PARAM_INT);
                $statement->bindValue(':mime', $proofMime, \PDO::PARAM_STR);
                $statement->bindValue(':filename', $proofName, \PDO::PARAM_STR);
                $statement->bindParam(':data', $proofBytes, \PDO::PARAM_LOB);
                $statement->bindValue(':created_at', $now, \PDO::PARAM_STR);
                $statement->bindValue(':updated_at', $now, \PDO::PARAM_STR);
                if (!$statement->execute()) {
                    throw new \RuntimeException('Receipt persistence failed.');
                }

                $storedBytes = (int) DB::table('yellow_duck_deposit_proofs')
                    ->where('transaction_id', $id)
                    ->selectRaw('OCTET_LENGTH(`data`) AS bytes')
                    ->value('bytes');

                if ($storedBytes !== strlen($proofBytes)) {
                    throw new \RuntimeException('Receipt verification failed.');
                }

                return $id;
            }, 1);

            $this->trace('success', [
                'trace_id' => $traceId,
                'transaction_id' => $transactionDbId,
                'reference' => $reference,
                'user_id' => $userId,
                'method_id' => $method->id,
                'proof_bytes' => strlen($proofBytes),
                'proof_mime' => $proofMime,
            ]);

            return response()->view('admin.deposit_submitted', ['reference' => $reference], 200)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        } catch (Throwable $e) {
            $this->trace('exception', [
                'trace_id' => $traceId,
                'user_id' => Auth::id(),
                'method_id' => $request->input('method_id'),
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            try {
                Log::error('Manual deposit V2 failed', [
                    'trace_id' => $traceId,
                    'exception' => get_class($e),
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
            } catch (Throwable $ignored) {
            }

            return $this->failed('تعذر إرسال طلب الإيداع الآن. لم يتم اعتماد أو خصم أي رصيد. رمز المتابعة: ' . $traceId, 500);
        }
    }

    private function extractProof(Request $request): array
    {
        $dataUrl = trim((string) $request->input('proof_data', ''));
        if ($dataUrl !== '') {
            if (strlen($dataUrl) > 8 * 1024 * 1024) {
                throw new \RuntimeException('Encoded receipt exceeds safe request size.');
            }
            if (!preg_match('#^data:(image/(?:jpeg|png|webp));base64,(.+)$#s', $dataUrl, $m)) {
                throw new \RuntimeException('Encoded receipt format is invalid.');
            }
            $bytes = base64_decode($m[2], true);
            if ($bytes === false || $bytes === '') {
                throw new \RuntimeException('Encoded receipt could not be decoded.');
            }
            if (strlen($bytes) > 5 * 1024 * 1024) {
                throw new \RuntimeException('Receipt exceeds 5MB.');
            }
            $info = @getimagesizefromstring($bytes);
            $mime = is_array($info) ? (string) ($info['mime'] ?? '') : '';
            if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                throw new \RuntimeException('Receipt is not a supported image.');
            }
            $name = $this->sanitizeFilename((string) $request->input('proof_name', 'receipt.' . $this->extensionForMime($mime)));
            return [$bytes, $mime, $name];
        }

        $proof = $request->file('proof');
        if (!$proof) {
            throw new \RuntimeException('Receipt image is required.');
        }
        $uploadError = method_exists($proof, 'getError') ? (int) $proof->getError() : UPLOAD_ERR_OK;
        if ($uploadError !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('PHP upload error code ' . $uploadError . '.');
        }
        $size = method_exists($proof, 'getSize') ? (int) $proof->getSize() : 0;
        if ($size <= 0 || $size > 5 * 1024 * 1024) {
            throw new \RuntimeException('Receipt file size is invalid.');
        }
        $path = (string) $proof->getPathname();
        if ($path === '' || !is_file($path) || !is_readable($path)) {
            throw new \RuntimeException('Receipt temporary file is unavailable.');
        }
        $bytes = file_get_contents($path);
        if ($bytes === false || $bytes === '') {
            throw new \RuntimeException('Receipt file could not be read.');
        }
        $info = @getimagesizefromstring($bytes);
        $mime = is_array($info) ? (string) ($info['mime'] ?? '') : '';
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw new \RuntimeException('Receipt is not a supported image.');
        }
        return [$bytes, $mime, $this->sanitizeFilename((string) $proof->getClientOriginalName())];
    }

    private function failed(string $message, int $status)
    {
        return response()->view('admin.deposit_failed', ['message' => $message], $status)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    private function sanitizeFilename(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?: '';
        $name = mb_substr($name, 0, 180);
        return $name !== '' ? $name : 'deposit-proof.jpg';
    }

    private function ensureProofTable(): void
    {
        if (Schema::hasTable('yellow_duck_deposit_proofs')) {
            return;
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
    }

    private function paymentDestination(PaymentMethod $method): string
    {
        $name = strtolower((string) $method->name);
        $destination = trim((string) $method->private_key);
        if (str_contains($name, 'vodafone')) {
            return $destination !== '' ? $destination : '01205323440';
        }
        if (str_contains($name, 'instapay') || str_contains($name, 'insta pay')) {
            return ($destination !== '' && !str_contains($destination, 'ارفع QR')) ? $destination : 'menna_206@instapay';
        }
        return $destination !== '' ? $destination : (string) $method->name;
    }

    private function isManualPaymentMethod(PaymentMethod $method): bool
    {
        $name = strtolower((string) $method->name);
        return str_contains($name, 'vodafone') || str_contains($name, 'instapay') || str_contains($name, 'insta pay');
    }

    private function extensionForMime(string $mime): string
    {
        return ['image/png' => 'png', 'image/webp' => 'webp', 'image/jpeg' => 'jpg'][$mime] ?? 'jpg';
    }

    private function trace(string $stage, array $context = []): void
    {
        $line = 'MANUAL_DEPOSIT_TRACE ' . $stage . ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        @error_log($line);
        $fh = @fopen('/proc/1/fd/2', 'ab');
        if ($fh) {
            @fwrite($fh, $line . PHP_EOL);
            @fclose($fh);
        }
    }
}
