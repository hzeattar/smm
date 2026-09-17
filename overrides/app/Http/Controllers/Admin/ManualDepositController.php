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
            // Validate scalar fields separately from the upload. Laravel 8's generic
            // file rule can incorrectly reject programmatically-created UploadedFile
            // instances used by our production smoke test, and it gives us less useful
            // diagnostics for real browser upload errors.
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

            [$proofMime, $proofBytes] = $this->normaliseProof($path, $detectedMime);
            if ($proofBytes === '' || strlen($proofBytes) > 900 * 1024) {
                return response()->view('admin.deposit_failed', [
                    'message' => 'تعذر تجهيز صورة الإثبات. جرّب صورة أخرى أو تواصل مع الدعم.',
                ], 422);
            }

            $fee = round($amount * ((float) $method->fee / 100), 2);
            $rate = YellowDuckMoney::exchangeRate();
            $credit = max(0, round(($amount - $fee) / $rate, 4));
            $destination = $this->paymentDestination($method);
            $senderPhone = trim((string) $request->input('sender_phone'));
            $proofName = mb_substr((string) $proof->getClientOriginalName(), 0, 250);
            if ($proofName === '') {
                $proofName = 'deposit-proof.jpg';
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
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if ($transactionDbId <= 0) {
                    throw new \RuntimeException('Manual deposit transaction insert did not return an id.');
                }

                $proofInserted = DB::table('yellow_duck_deposit_proofs')->insert([
                    'transaction_id' => $transactionDbId,
                    'mime' => $proofMime,
                    'filename' => $proofName,
                    'data' => $proofBytes,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (!$proofInserted) {
                    throw new \RuntimeException('Manual deposit proof insert returned false.');
                }

                $proofStored = DB::table('yellow_duck_deposit_proofs')
                    ->where('transaction_id', $transactionDbId)
                    ->exists();
                if (!$proofStored) {
                    throw new \RuntimeException('Manual deposit proof could not be verified after insert.');
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

            Log::info('Manual deposit submitted for review', [
                'transaction_id' => $transactionDbId,
                'reference' => $reference,
                'user_id' => $userId,
                'method_id' => $method->id,
                'amount_egp' => $amount,
                'credit_usd' => $credit,
                'proof_bytes' => strlen($proofBytes),
            ]);

            return response()->view('admin.deposit_submitted', [
                'reference' => $reference,
            ], 200);
        } catch (Throwable $e) {
            $diagnostic = [
                'user_id' => Auth::id(),
                'method_id' => $request->input('method_id'),
                'amount' => $request->input('amount'),
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ];

            try {
                Log::error('Manual deposit submission failed', $diagnostic);
            } catch (Throwable $ignored) {
            }

            @error_log('MANUAL_DEPOSIT_ERROR ' . json_encode($diagnostic, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            return response()->view('admin.deposit_failed', [
                'message' => 'تعذر إرسال طلب الإيداع الآن. لم يتم اعتماد أو خصم أي رصيد. حاول مرة أخرى، وإذا استمرت المشكلة تواصل مع الدعم عبر واتساب.',
            ], 500);
        }
    }

    private function normaliseProof(string $path, string $mime): array
    {
        $raw = @file_get_contents($path);
        if ($raw === false || $raw === '') {
            throw new \RuntimeException('Uploaded proof file could not be read.');
        }

        if (!function_exists('imagecreatefromstring')) {
            if (strlen($raw) > 900 * 1024) {
                throw new \RuntimeException('GD unavailable and proof image exceeds safe database size.');
            }
            return [$mime ?: 'image/jpeg', $raw];
        }

        $source = @imagecreatefromstring($raw);
        if (!$source) {
            throw new \RuntimeException('Uploaded proof is not a readable image.');
        }

        $width = imagesx($source);
        $height = imagesy($source);
        if ($width < 1 || $height < 1) {
            imagedestroy($source);
            throw new \RuntimeException('Uploaded proof has invalid dimensions.');
        }

        $maxSide = 1280;
        $scale = min(1, $maxSide / max($width, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        if (!$target) {
            imagedestroy($source);
            throw new \RuntimeException('Could not allocate proof image buffer.');
        }

        $white = imagecolorallocate($target, 255, 255, 255);
        imagefill($target, 0, 0, $white);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        $jpeg = '';
        foreach ([82, 74, 66, 58, 50] as $quality) {
            ob_start();
            imagejpeg($target, null, $quality);
            $candidate = (string) ob_get_clean();
            if ($candidate !== '') {
                $jpeg = $candidate;
            }
            if ($candidate !== '' && strlen($candidate) <= 850 * 1024) {
                break;
            }
        }

        imagedestroy($target);
        imagedestroy($source);

        if ($jpeg === '' || strlen($jpeg) > 900 * 1024) {
            throw new \RuntimeException('Uploaded proof could not be compressed to a safe size.');
        }

        return ['image/jpeg', $jpeg];
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
