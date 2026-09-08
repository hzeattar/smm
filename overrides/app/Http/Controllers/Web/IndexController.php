<?php

namespace App\Http\Controllers\Web;

use App\Models\Faq;
use App\Helpers\Helper;
use App\Events\NotifyEvent;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class IndexController extends Controller
{
    public function index()
    {
        try {
            $faqs = Faq::where('status', 'active')->orderBy('sort', 'asc')->get();
            return view('web.index', compact('faqs'));
        } catch (\Throwable $e) {
            report($e);

            return response()->view('errors.database-setup', [
                'brandName' => 'البطة الصفرا',
                'brandSubtitle' => 'لخدمات السوشيال ميديا',
            ], 200);
        }
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
        $subject = Helper::settings('website_title');
        $name = strip_tags($request->name);
        $email = strip_tags($request->email);
        $body = strip_tags($request->body);
        $body = 'from : '.$name.' <br> '.'email :'.$email.' <br> '.' message : '.$body;
        $notification = ['template'=>'admin.emails.notification','user'=>'admins','subject'=>$subject,'body'=>$body];
        NotifyEvent::dispatch($notification);
        return redirect()->back()->with(['send'=>true]);
    }
}
