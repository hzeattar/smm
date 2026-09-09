<?php

namespace App\Http\Controllers\Web;

use App\Models\Faq;
use App\Models\Setting;
use App\Events\NotifyEvent;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class IndexController extends Controller
{
    public function index()
    {
        try {
            $settings = Setting::whereIn('name', [
                'user_registration',
                'user_login',
                'website_desc',
                'website_title',
                'facebook_link',
                'twitter_link',
                'linkedin_link',
                'instagram_link',
            ])->pluck('value', 'name');

            $registrationEnabled = (($settings['user_registration'] ?? 'on') === 'on');
            $loginEnabled = (($settings['user_login'] ?? 'on') === 'on');
            $websiteDesc = (string) ($settings['website_desc'] ?? 'منصة سهلة وسريعة لإدارة وطلب خدمات السوشيال ميديا من مكان واحد.');
            $websiteTitle = (string) ($settings['website_title'] ?? 'البطة الصفرا لخدمات السوشيال ميديا');
            $socialLinks = [
                'facebook' => (string) ($settings['facebook_link'] ?? ''),
                'twitter' => (string) ($settings['twitter_link'] ?? ''),
                'linkedin' => (string) ($settings['linkedin_link'] ?? ''),
                'instagram' => (string) ($settings['instagram_link'] ?? ''),
            ];

            $faqs = Faq::where('status', 'active')->orderBy('sort', 'asc')->get()->map(function ($faq) {
                return [
                    'question' => $this->plainLocalizedValue($faq->question),
                    'answer' => $this->plainLocalizedValue($faq->answer),
                ];
            });

            $html = view('web.index', compact(
                'faqs',
                'registrationEnabled',
                'loginEnabled',
                'websiteDesc',
                'websiteTitle',
                'socialLinks'
            ))->render();

            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response(
                '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="cache-control" content="no-cache"><title>البطة الصفرا</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff9df;color:#171717;font-family:Tahoma,Arial,sans-serif}.box{width:min(680px,calc(100% - 32px));background:#fff;border-radius:24px;padding:40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.08)}h1{font-size:42px;margin:0 0 12px}.btn{display:inline-block;margin:8px;padding:12px 20px;border-radius:12px;background:#f6c90e;color:#171717;text-decoration:none;font-weight:700}</style></head><body><main class="box"><h1>🐥 البطة الصفرا</h1><p>المنصة تعمل، ويتم استعادة الواجهة الرئيسية بأمان.</p><a class="btn" href="/login">تسجيل الدخول</a><a class="btn" href="/register">إنشاء حساب</a></main></body></html>',
                200,
                [
                    'Content-Type' => 'text/html; charset=UTF-8',
                    'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma' => 'no-cache',
                ]
            );
        }
    }

    private function plainLocalizedValue($value): string
    {
        $value = (string) $value;
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            foreach (['ar', 'en'] as $key) {
                if (isset($decoded[$key]) && is_scalar($decoded[$key])) {
                    return trim(strip_tags((string) $decoded[$key]));
                }
            }
            foreach ($decoded as $candidate) {
                if (is_scalar($candidate)) {
                    return trim(strip_tags((string) $candidate));
                }
            }
        }
        return trim(strip_tags($value));
    }

    public function maintenanceMode()
    {
        return view('errors.503');
    }

    public function termsConditions()
    {
        return view('web.terms-conditions');
    }

    public function constactUs(Request $request)
    {
        $subject = 'البطة الصفرا لخدمات السوشيال ميديا';
        try {
            $setting = Setting::where('name', 'website_title')->first();
            if ($setting && $setting->value) {
                $subject = (string) $setting->value;
            }
        } catch (\Throwable $e) {
            report($e);
        }

        $name = strip_tags((string) $request->name);
        $email = strip_tags((string) $request->email);
        $body = strip_tags((string) $request->body);
        $body = 'from : '.$name.' <br> email :'.$email.' <br> message : '.$body;

        try {
            NotifyEvent::dispatch([
                'template' => 'admin.emails.notification',
                'user' => 'admins',
                'subject' => $subject,
                'body' => $body,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        return redirect()->back()->with(['send' => true]);
    }
}
