<?php

namespace App\Providers;

use App\Helpers\Helper;
use App\Models\Setting;
use App\Models\Category;
use App\Models\Language;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class ViewServiceProvider extends ServiceProvider
{
    public function register()
    {
        //
    }

    public function boot()
    {
        view()->composer('admin.modals.service-modal', function ($view) {
            try {
                $view->with('categories', Category::getActive());
            } catch (\Throwable $e) {
                report($e);
                $view->with('categories', collect());
            }
        });

        view()->composer('web.partials.header', function ($view) {
            try {
                $view->with('languages', Language::getActive());
                $view->with('lang', Helper::getCurrentLanguage());
            } catch (\Throwable $e) {
                report($e);
                $view->with('languages', collect());
                $view->with('lang', null);
            }
        });

        view()->composer('admin.partials.header', function ($view) {
            $notifications = collect();
            $notificationsCount = 0;
            try {
                $user = Auth::guard('admin')->check() ? Auth::guard('admin')->user() : Auth::user();
                if ($user) {
                    $isForAdmin = Auth::guard('admin')->check() ? 1 : 0;
                    $notifications = UserNotification::where('user_id', $user->id)
                        ->where('is_for_admin', $isForAdmin)
                        ->orderBy('created_at', 'desc')->get();
                    $notificationsCount = UserNotification::where('user_id', $user->id)
                        ->where('is_for_admin', $isForAdmin)
                        ->where('viewed', '0')->count();
                }
            } catch (\Throwable $e) {
                report($e);
            }
            $view->with('notifications', $notifications);
            $view->with('notifications_count', $notificationsCount);
        });

        view()->composer('admin.emails.notification', function ($view) {
            $websiteName = '';
            $websiteLogo = '';
            try {
                $name = Setting::where('name', 'website_title')->first();
                $logo = Setting::where('name', 'website_logo')->first();
                $websiteName = $name ? (string) $name->value : '';
                $websiteLogo = $logo ? (string) $logo->value : '';
            } catch (\Throwable $e) {
                report($e);
            }
            $protocol = isset($_SERVER['HTTPS']) ? 'https://' : 'http://';
            $host = $_SERVER['HTTP_HOST'] ?? '';
            $domain = $host ? $protocol.$host : '';
            $view->with('domain', $domain);
            $view->with('logo', $websiteLogo ? $domain.'/images/'.$websiteLogo : '');
            $view->with('website_name', $websiteName);
        });
    }
}
