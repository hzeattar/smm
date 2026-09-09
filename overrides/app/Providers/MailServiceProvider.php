<?php

namespace App\Providers;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\ServiceProvider;

class MailServiceProvider extends ServiceProvider
{
    public function register()
    {
        //
    }

    public function boot()
    {
        if (app()->runningUnitTests() || !file_exists(storage_path('installed'))) {
            return;
        }

        try {
            $settings = Setting::where('type', 'email')->orderBy('id', 'desc')->get()->pluck('value', 'name');
            $map = [
                'mail.mailers.smtp.transport' => 'MAIL_DRIVER',
                'mail.mailers.smtp.host' => 'MAIL_HOST',
                'mail.mailers.smtp.port' => 'MAIL_PORT',
                'mail.mailers.smtp.encryption' => 'MAIL_ENCRYPTION',
                'mail.mailers.smtp.username' => 'MAIL_USERNAME',
                'mail.mailers.smtp.password' => 'MAIL_PASSWORD',
            ];
            foreach ($map as $configKey => $settingKey) {
                if ($settings->has($settingKey) && $settings[$settingKey] !== null && $settings[$settingKey] !== '') {
                    Config::set($configKey, $settings[$settingKey]);
                }
            }
            Config::set('mail.mailers.smtp.timeout', 5);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
