<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Transaction;
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
            $validator = Validator::make($request->all(), [
                'method_id' => 'required|integer|exists:payment_methods,id',
                'amount' => 'required|numeric|min:1',
                'sender_phone' => ['required', 'string', 'max:80', 'regex:/^[0-9+\s-]{7,25}$/'],
                'proof' => 'required|file|max:5120',
            ], [
                'sender_phone.regex' => 'اكتب رقم الهاتف الذي تم التحويل منه بشكل صحيح.',
                'proof.required' => 'يرجى إرفاق صورة إثبات التحويل.',
                'proof.file' => 'ملف إثبات التحويل غير صالح.',
                'proof.max' => 'حجم صورة إثبات التحويل يجب ألا يتجاوز 5 ميجابايت.',
            ]);

            if ($validator->fails()) {
                return redirect()->route('user.add-funds')->withErrors($validator)->withInput($request->except('proof'));
            }

            $method = PaymentMethod::where('id', (int) $request->input('method_id'))
                ->where('status', 'active')
                ->first();

            if (!$method || !$this->isManualPaymentMethod($method)) {
                return redirect()->route('user.add-funds')
                    ->withErrors(['method_id' => 'طريقة الدفع المختارة غير متاحة. استخدم فودافون كاش أو InstaPay.'])
                    ->withInput($request->except('proof'));
            }

            $amount = round((float) $request->input('amount'), 2);
            if ($amount < (float) $method->min || ((float) $method->max > 0 && $amount > (float) $method->max)) {
                return redirect()->route('user.add-funds')->withErrors(['amount' => 'المبلغ خارج حدود طريقة الدفع المختارة.'])->withInput($request->except('proof'));
            }

            $proof = $request->file('proof');
            if (!$proof || !$proof->isValid()) {
                return redirect()->route('user.add-funds')->withErrors(['proof' => 'تعذر استلام صورة إثبات التحويل. اختر الصورة مرة أخرى.'])->withInput($request->except('proof'));
            }

            $path = (string) $proof->getPathname();
            $imageInfo = @getimagesize($path);
            $detectedMime = is_array($imageInfo) ? (string) ($imageInfo['mime'] ?? '') : '';
            if (!in_array($detectedMime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                return redirect()->route('user.add-funds')->withErrors(['proof' => 'إثبات التحويل يجب أن يكون صورة JPG أو PNG أو WEBP.'])->withInput($request->except('proof'));
            }

            [$proofMime, $proofBytes] = $this->normaliseProof($path, $detectedMime);
            if ($proofBytes === '' || strlen($proofBytes) > 6 * 1024 * 1024) {
                return redirect()->route('user.add-funds')->withErrors(['proof' => 'تعذر تجهيز صورة الإثبات أو حجمها كبير جدًا. استخدم صورة أصغر.'])->withInput($request->except('proof'));
            }

            $fee = round($amount * ((float) $method->fee / 100), 2);
            $rate = YellowDuckMoney::exchangeRate();
            $credit = max(0, round(($amount - $fee) / $rate, 4));
            $destination = $this->paymentDestination($method);
            $senderPhone = trim((string) $request->input('sender_phone'));
            $proofName = mb_substr((string) $proof->getClientOriginalName(), 0, 250);

            $this->ensureDepositProofTable();

            DB::transaction(function () use ($method, $amount, $fee, $credit, $rate, $destination, $senderPhone, $proofName, $proofMime, $proofBytes) {
                $transaction = new Transaction();
                $transaction->method_id = $method->id;
                $transaction->transaction_id = 'YD-' . now()->format('YmdHis') . '-' . Auth::id() . '-' . strtoupper(bin2hex(random_bytes(3)));
                $transaction->user_id = Auth::id();
                $transaction->amount = $amount;
                $transaction->fee = 0;
                $transaction->profit = 0;
                $transaction->take_fee = $fee;
                $transaction->status = 'refund';
                $transaction->notes = trim(implode("\n", [
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
                $transaction->save();

                DB::table('yellow_duck_deposit_proofs')->insert([
                    'transaction_id' => $transaction->id,
                    'mime' => $proofMime,
                    'filename' => $proofName,
                    'data' => 'base64:' . base64_encode($proofBytes),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }, 3);

            return redirect()->route('user.transactions.index')
                ->with('success', 'تم إرسال طلب الإيداع وصورة الإثبات بنجاح. سيتم إضافة الرصيد بعد مراجعة الأدمن.');
        } catch (Throwable $e) {
            try {
                Log::error('Manual deposit submission failed', [
                    'user_id' => Auth::id(),
                    'method_id' => $request->input('method_id'),
                    'amount' => $request->input('amount'),
                    'exception' => get_class($e),
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
            } catch (Throwable $ignored) {
            }

            return redirect()->route('user.add-funds')
                ->withErrors(['deposit' => 'تعذر إرسال طلب الإيداع الآن. لم يتم اعتماد أو خصم أي رصيد. حاول مرة أخرى بعد لحظات.']);
        }
    }

    private function normaliseProof(string $path, string $mime): array
    {
        $raw = @file_get_contents($path);
        if ($raw === false || $raw === '') {
            throw new \RuntimeException('Uploaded proof file could not be read.');
        }

        if (!function_exists('imagecreatefromstring')) {
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

        $maxSide = 1600;
        $scale = min(1, $maxSide / max($width, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        if (!$target) {
            imagedestroy($source);
            return [$mime ?: 'image/jpeg', $raw];
        }

        $white = imagecolorallocate($target, 255, 255, 255);
        imagefill($target, 0, 0, $white);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        imagejpeg($target, null, 84);
        $jpeg = (string) ob_get_clean();
        imagedestroy($target);
        imagedestroy($source);

        if ($jpeg === '') {
            throw new \RuntimeException('Uploaded proof could not be normalised.');
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
}
