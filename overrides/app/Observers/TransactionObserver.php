<?php

namespace App\Observers;

use App\Events\NotifyEvent;
use App\Models\Setting;
use App\Models\Transaction;
use Illuminate\Support\Facades\Log;
use Throwable;

class TransactionObserver
{
    public function creating(Transaction $transaction)
    {
        // Financial writes must never depend on notification delivery.
    }

    public function created(Transaction $transaction)
    {
        $this->notifySafely($transaction);
    }

    public function updated(Transaction $transaction)
    {
        // No side effects here; balance reconciliation is handled by the controller.
    }

    public function updating(Transaction $transaction)
    {
    }

    public function deleted(Transaction $transaction)
    {
    }

    public function restored(Transaction $transaction)
    {
    }

    public function forceDeleted(Transaction $transaction)
    {
    }

    private function notifySafely(Transaction $transaction): void
    {
        try {
            $active = Setting::where('name', 'payment_notification_tpl_active')->value('value');
            if ($active !== 'on') {
                return;
            }

            $subjectTemplate = Setting::where('name', 'payment_notification_tpl_subject')->value('value');
            $bodyTemplate = Setting::where('name', 'payment_notification_tpl')->value('value');
            if (!$subjectTemplate || !$bodyTemplate) {
                Log::warning('Payment notification skipped: template settings are incomplete', [
                    'transaction_id' => $transaction->id,
                ]);
                return;
            }

            $transaction->loadMissing(['user', 'paymentMethod']);
            if (!$transaction->user || !$transaction->paymentMethod) {
                Log::warning('Payment notification skipped: related user or payment method is missing', [
                    'transaction_id' => $transaction->id,
                ]);
                return;
            }

            $websiteName = (string) (Setting::where('name', 'website_title')->value('value') ?: '');
            $replacements = [
                '{{amount}}' => (string) ((float) $transaction->amount - (float) $transaction->take_fee),
                '{{firstname}}' => (string) ($transaction->user->firstname ?? ''),
                '{{balance}}' => (string) ($transaction->user->funds ?? 0),
                '{{currency}}' => '$',
                '{{method_name}}' => (string) ($transaction->paymentMethod->name ?? ''),
                '{{transaction_number}}' => (string) $transaction->transaction_id,
                '{{website_name}}' => $websiteName,
            ];

            $subject = strtr((string) $subjectTemplate, $replacements);
            $body = strtr((string) $bodyTemplate, $replacements);

            NotifyEvent::dispatch([
                'template' => 'admin.emails.notification',
                'user' => $transaction->user,
                'website_name' => $websiteName,
                'transaction' => $transaction,
                'subject' => $subject,
                'body' => $body,
            ]);
        } catch (Throwable $e) {
            // A notification failure must never roll back or surface as a payment/deposit error.
            Log::error('Payment notification failed after transaction creation', [
                'transaction_id' => $transaction->id,
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);
        }
    }
}
