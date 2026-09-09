<?php

namespace App\Providers;

use Stripe\Stripe;
use App\Models\Setting;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class AppServiceProvider extends ServiceProvider
{
    public function register()
    {
        //
    }

    public function boot()
    {
        Schema::defaultStringLength(191);

        if (!file_exists(storage_path('installed'))) {
            return;
        }

        try {
            if (Schema::hasTable('payment_methods')) {
                $stripe = PaymentMethod::where('id', 2)->first();
                if ($stripe && !empty($stripe->private_key)) {
                    $stripe->makeVisible('private_key');
                    Stripe::setApiKey((string) $stripe->private_key);
                }

                $paypal = PaymentMethod::where('id', 1)->first();
                if ($paypal) {
                    Config::set('paypal.client_id', $paypal->client_id ?: '');
                    Config::set('paypal.secret', $paypal->private_key ?: '');
                    Config::set('paypal.settings.mode', $paypal->environment ?: 'sandbox');
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }

        VerifyEmail::toMailUsing(function ($notifiable, $url) {
            return $this->sendEmailVerificationNotification($url);
        });
    }

    public function sendEmailVerificationNotification($url)
    {
        $websiteName = '';
        $subject = 'Email Verification';
        $body = 'Please verify your email: {{activation_link}}';

        try {
            $website = Setting::where('name', 'website_title')->first();
            $websiteName = $website ? (string) $website->value : '';
            $subjectRow = Setting::where('name', 'email_verification_tpl_subject')->first();
            $bodyRow = Setting::where('name', 'email_verification_tpl')->first();
            if ($subjectRow && $subjectRow->value) $subject = (string) $subjectRow->value;
            if ($bodyRow && $bodyRow->value) $body = (string) $bodyRow->value;
        } catch (\Throwable $e) {
            report($e);
        }

        $params = ['user' => auth()->user(), 'website_name' => $websiteName, 'activation_link' => $url];
        $body = $this->replaceParameters($body, $params);
        $subject = $this->replaceParameters($subject, $params);
        $notification = ['template' => 'admin.emails.notification', 'user' => auth()->user(), 'subject' => $subject, 'body' => $body];

        return (new MailMessage())
            ->view('admin.emails.notification', compact('notification'))
            ->subject($subject);
    }

    public function replaceParameters($string, $params)
    {
        $user = $params['user'];
        $firstName = $user && isset($user->firstname) ? $user->firstname : '';
        $string = str_replace('{{firstname}}', $firstName, $string);
        $string = str_replace('{{website_name}}', $params['website_name'], $string);
        $string = str_replace('{{activation_link}}', '<a href="'.$params['activation_link'].'">Activation Link</a>', $string);
        return $string;
    }
}
