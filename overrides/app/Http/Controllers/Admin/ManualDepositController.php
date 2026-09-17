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

class ManualDepositController extends Controller
{
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->only(['method_id', 'amount', 'sender_phone']), [
                'method_id' => 'required|integer|exists:payment_methods,id',
                'amount' => 'required|numeric|min:1',
                'sender_phone' => ['required', 'string', 'max:80', 'regex:/^[0-9+\s-]{7,25}$/'],
            ], [
                'sender_phone.regex' => 'اكتب رقم الهاتف الذي تم التحويل منه بشكل صحيح.',
            ]);

            if ($validator->fails()) {
                return response()->view('admin.deposit_failed', [
                    'message' => implode(' ', $validator->errors()->all()),
                ], 422);
            }

            $userId = (int) Auth::id();
            if ($userId <= 0) {
                return redirect()->route('login');
            }

            $method = PaymentMethod::where('id', (int) $request->input('method_id'))
                ->where('status', 'active')
                ->first();

            if (!$method || !$this->isManualPaymentMethod($method)) {
                return response()->view('admin.deposit_failed', [
                    'message' => 'طريقة الدفع المختارة غير متاحة. استخدم فودافون كاش أو InstaPay.',
                ], 422);
            }

            $amount = round((float) $request->input('amount'), 2);
            if ($amount < (float) $method->min || ((float) $method->max > 0 && $amount > (float) $method->max)) {
                return response()->view('admin.deposit_failed', [
                    'message' => 'المبلغ خارج حدود طريقة الدفع المختارة.',
                ], 422);
            }

            $proof = $request->file('proof');
            if (!$proof) {
                return response()->view('admin.deposit_failed', [
                    'message' => 'يرجى إرفاق صورة إثبات التحويل.',
                ], 422);
            }

            $uploadError = method_exists($proof, 'getError') ? (int) $proof->getError() : UPLOAD_ERR_OK;
            if ($uploadError !== UPLOAD_ERR_OK) {
                Log::warning('Manual deposit upload rejected by PHP', [
                    'user_id' => $userId,
                    'upload_error' => $uploadError,
                ]);
                return response()->view('admin.deposit_failed', [
                    'message' => $this->uploadErrorMessage($uploadError),
                ], 422);
            }

            $size = method_exists($proof, 'getSize') ? (int) $proof->getSize() : 0;
            if ($size <= 0 || $size > 5 * 1024 * 1024) {
                return response()->view('admin.deposit_failed', [
                    'message' => $size > 5 * 1024 * 1024
                        ? 'حجم صورة إثبات التحويل يجب ألا يتجاوز 5 ميجابايت.'
                        : 'صورة إثبات التحويل فارغة أو غير قابلة للقراءة.',
                ], 422);
            }

            $path = (string) $proof->getPathname();
            if ($path === '' || !is_file($path) || !is_readable($path)) {
                throw new \RuntimeException('Uploaded proof temporary file is missing or unreadable.');
            }

            $imageInfo = @getimagesize($path);
            $detectedMime = is_array($imageInfo) ? (string) ($imageInfo['mime'] ?? '') : '';
            if (!in_array($detectedMime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                return response()->view('admin.deposit_failed', [
                    'message' => 'إثبات التحويل يجب أن يكون صورة JPG أو PNG أو WEBP حقيقية.',
                ], 422);
            }

            // Keep the original validated image bytes. Earlier builds re-encoded every
            // browser upload through GD; that made the production path depend on image
            // codec details even though the DB column can safely hold the original file.
            $proofBytes = @file_get_contents($path);
            if ($proofBytes === false || $proofBytes === '') {
                throw new \RuntimeException('Uploaded proof file could not be read.');
            }
            if (strlen($proofBytes) !== $size) {
                throw new \RuntimeException('Uploaded proof size changed while being read.');
            }
            $proofMime = $detectedMime;

            $fee = round($amount * ((float) $method->fee / 100), 2);
            $rate = YellowDuckMoney::exchangeRate();
            if ($rate <= 0) {
                throw new \RuntimeException('Invalid EGP/USD exchange rate.');
            }
            $credit = max(0, round(($amount - $fee) / $rate, 4));
            $destination = $this->paymentDestination($method);
            $senderPhone = trim((string) $request->input('sender_phone'));

            $proofName = (string) $proof->getClientOriginalName();
            $proofName = basename(str_replace('\\', '/', $proofName));
            $proofName = preg_replace('/[\x00-\x1F\x7F]/u', '', $proofName) ?: '';
            $proofName = mb_substr($proofName, 0, 180);
            if ($proofName === '') {
                $proofName = 'deposit-proof.' . $this->extensionForMime($proofMime);
            }

            $reference = 'YD-' . now()->format('YmdHis') . '-' . $userId . '-' . strtoupper(bin2hex(random_bytes(3)));
            $notes = trim(implode("\n", [
                'Yellow Duck manual deposit - pending admin approval.',
                'Payment method: ' . (string) $method->name,
                'Payment destination: ' . $destination,
                'Deposit currency: EGP',
                'Deposit amount (EGP): ' . number_format($amount, 2, '.', ''),
                'Exchange rate: EGP ' . number_format($rate, 2, '.', '') . ' = USD 1',
                'USD credit: ' . number_format($credit, 4, '.', ''),
                'Sender phone: ' . $senderPhone,
                'Proof filename: ' . $proofName,
            ]));

            $this->ensureDepositProofTable();

            $transactionDbId = null;
            try {
                DB::beginTransaction();
                $now = now()->format('Y-m-d H:i:s');

                $transactionDbId = (int) DB::table('transactions')->insertGetId([
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

                if ($transactionDbId <= 0) {
                    throw new \RuntimeException('Manual deposit transaction insert did not return an id.');
                }

                // Bind the receipt as an actual LOB instead of relying on generic query
                // builder string binding for multi-megabyte binary image data.
                $pdo = DB::connection()->getPdo();
                $statement = $pdo->prepare(
                    'INSERT INTO `yellow_duck_deposit_proofs` '
                    . '(`transaction_id`,`mime`,`filename`,`data`,`created_at`,`updated_at`) '
                    . 'VALUES (:transaction_id,:mime,:filename,:data,:created_at,:updated_at)'
                );
                $statement->bindValue(':transaction_id', $transactionDbId, \PDO::PARAM_INT);
                $statement->bindValue(':mime', $proofMime, \PDO::PARAM_STR);
                $statement->bindValue(':filename', $proofName, \PDO::PARAM_STR);
                $statement->bindParam(':data', $proofBytes, \PDO::PARAM_LOB);
                $statement->bindValue(':created_at', $now, \PDO::PARAM_STR);
                $statement->bindValue(':updated_at', $now, \PDO::PARAM_STR);
                if (!$statement->execute()) {
                    throw new \RuntimeException('Manual deposit proof insert returned false.');
                }

                $storedBytes = (int) DB::table('yellow_duck_deposit_proofs')
                    ->where('transaction_id', $transactionDbId)
                    ->selectRaw('OCTET_LENGTH(`data`) AS bytes')
                    ->value('bytes');

                if ($storedBytes !== strlen($proofBytes)) {
                    throw new \RuntimeException(
                        'Manual deposit proof byte verification failed. expected=' . strlen($proofBytes) . '; stored=' . $storedBytes
                    );
                }

                DB::commit();
            } catch (Throwable $writeError) {
                try {
                    DB::rollBack();
                } catch (Throwable $ignored) {
                }

                if ($transactionDbId) {
                    try {
                        DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $transactionDbId)->delete();
                        DB::table('transactions')->where('id', $transactionDbId)->delete();
                    } catch (Throwable $cleanupError) {
                        Log::critical('Manual deposit cleanup failed after write error', [
                            'transaction_id' => $transactionDbId,
                            'reference' => $reference,
                            'cleanup_exception' => get_class($cleanupError),
                            'cleanup_message' => $cleanupError->getMessage(),
                        ]);
                    }
                }

                throw $writeError;
            }

            Log::warning('Manual deposit submitted for review', [
                'transaction_id' => $transactionDbId,
                'reference' => $reference,
                'user_id' => $userId,
                'method_id' => $method->id,
                'amount_egp' => $amount,
                'credit_usd' => $credit,
                'proof_bytes' => strlen($proofBytes),
                'proof_mime' => $proofMime,
            ]);

            return response()->view('admin.deposit_submitted', [
                'reference' => $reference,
            ], 200);
        } catch (Throwable $e) {
            $errorId = 'DEP-' . now()->format('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(2)));
            $diagnostic = [
                'error_id' => $errorId,
                'user_id' => Auth::id(),
                'method_id' => $request->input('method_id'),
                'amount' => $request->input('amount'),
                'has_proof' => $request->hasFile('proof'),
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ];

            try {
                Log::error('Manual deposit submission failed', $diagnostic);
            } catch (Throwable $ignored) {
            }

            $encoded = json_encode($diagnostic, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            @error_log('MANUAL_DEPOSIT_ERROR ' . $encoded);
            @file_put_contents('php://stderr', 'MANUAL_DEPOSIT_ERROR ' . $encoded . PHP_EOL, FILE_APPEND);

            return response()->view('admin.deposit_failed', [
                'message' => 'تعذر إرسال طلب الإيداع الآن. لم يتم اعتماد أو خصم أي رصيد. رمز المتابعة: ' . $errorId,
            ], 500);
        }
    }

    private function ensureDepositProofTable(): void
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
        return [
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/jpeg' => 'jpg',
        ][$mime] ?? 'jpg';
    }

    private function uploadErrorMessage(int $error): string
    {
        switch ($error) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return 'حجم صورة إثبات التحويل أكبر من الحد المسموح. اختر صورة أصغر من 5 ميجابايت.';
            case UPLOAD_ERR_PARTIAL:
                return 'لم يكتمل رفع صورة إثبات التحويل. أعد اختيار الصورة ثم حاول مرة أخرى.';
            case UPLOAD_ERR_NO_FILE:
                return 'يرجى إرفاق صورة إثبات التحويل.';
            case UPLOAD_ERR_NO_TMP_DIR:
            case UPLOAD_ERR_CANT_WRITE:
            case UPLOAD_ERR_EXTENSION:
                return 'تعذر رفع صورة الإثبات على الخادم حاليًا. حاول مرة أخرى أو تواصل مع الدعم.';
            default:
                return 'تعذر استلام صورة إثبات التحويل. اختر الصورة مرة أخرى.';
        }
    }
}
