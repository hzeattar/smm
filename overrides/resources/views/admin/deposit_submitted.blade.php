@extends('layouts.admin')

@section('content')
<main id="main-container" class="yd-deposit-result-page" dir="rtl">
    <section class="yd-deposit-result-card">
        <div class="yd-result-icon">✓</div>
        <span class="yd-result-kicker">تم استلام طلب الإيداع</span>
        <h1>طلبك الآن قيد المراجعة</h1>
        <p>بمجرد التأكد من التحويل وصورة الإثبات سيتم إضافة الرصيد إلى حسابك.</p>

        @if(!empty($reference))
            <div class="yd-result-reference">
                <small>رقم الطلب</small>
                <strong>{{ $reference }}</strong>
            </div>
        @endif

        <div class="yd-result-note">
            <strong>مهم</strong>
            <span>لا يتم إضافة أي رصيد قبل مراجعة التحويل واعتماده من الإدارة.</span>
        </div>

        <div class="yd-result-actions">
            <a class="yd-result-primary" href="{{ route('user.transactions.index') }}">متابعة سجل المدفوعات</a>
            <a class="yd-result-whatsapp" href="https://wa.me/201205323440" target="_blank" rel="noopener">تواصل مع الدعم عبر واتساب</a>
        </div>
    </section>
</main>

<style>
.yd-deposit-result-page{min-height:calc(100vh - 90px);display:grid;place-items:center;padding:40px 20px;background:#f6f7f9}
.yd-deposit-result-card{box-sizing:border-box;width:min(100%,680px);padding:38px;border:1px solid #e5e7eb;border-radius:20px;background:#fff;text-align:center;box-shadow:0 18px 55px rgba(18,24,40,.10)}
.yd-result-icon{width:72px;height:72px;margin:0 auto 16px;display:grid;place-items:center;border-radius:50%;background:#e9f9ef;color:#159447;font-size:36px;font-weight:950}
.yd-result-kicker{display:inline-block;margin-bottom:8px;color:#9a7300;font-size:13px;font-weight:900}.yd-deposit-result-card h1{margin:0;color:#17191f;font-size:32px;font-weight:950}.yd-deposit-result-card>p{max-width:520px;margin:14px auto 0;color:#606874;font-size:16px;line-height:1.9}
.yd-result-reference{display:grid;gap:5px;margin:24px auto 0;padding:14px 18px;border-radius:12px;background:#f7f8fa}.yd-result-reference small{color:#77808d;font-weight:800}.yd-result-reference strong{direction:ltr;unicode-bidi:plaintext;color:#17191f;font-size:16px;word-break:break-all}
.yd-result-note{display:grid;gap:4px;margin-top:16px;padding:14px 16px;border:1px solid #f2d36a;border-radius:12px;background:#fff9df;color:#5c4a00}.yd-result-note strong{font-size:13px}.yd-result-note span{font-size:13px;line-height:1.7}
.yd-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.yd-result-actions a{display:flex;align-items:center;justify-content:center;min-height:52px;padding:0 16px;border-radius:11px;text-decoration:none;font-weight:900}.yd-result-primary{background:#f7c51e;color:#17191f}.yd-result-whatsapp{background:#1fad5b;color:#fff}
@media(max-width:640px){.yd-deposit-result-card{padding:28px 20px}.yd-deposit-result-card h1{font-size:25px}.yd-result-actions{grid-template-columns:1fr}}
</style>
@endsection
