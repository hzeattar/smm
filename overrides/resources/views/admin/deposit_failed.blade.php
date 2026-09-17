@extends('layouts.admin')

@section('content')
<main id="main-container" class="yd-deposit-result-page" dir="rtl">
    <section class="yd-deposit-result-card yd-deposit-error-card">
        <div class="yd-result-icon">!</div>
        <span class="yd-result-kicker">تعذر إرسال طلب الإيداع</span>
        <h1>لم يتم اعتماد أو خصم أي رصيد</h1>
        <p>{{ $message ?? 'راجع البيانات وحاول مرة أخرى. إذا استمرت المشكلة تواصل مع الدعم.' }}</p>

        <div class="yd-result-actions">
            <a class="yd-result-primary" href="{{ route('user.add-funds') }}">العودة لإضافة الرصيد</a>
            <a class="yd-result-whatsapp" href="https://wa.me/201205323440" target="_blank" rel="noopener">تواصل مع الدعم عبر واتساب</a>
        </div>
    </section>
</main>

<style>
.yd-deposit-result-page{min-height:calc(100vh - 90px);display:grid;place-items:center;padding:40px 20px;background:#f6f7f9}
.yd-deposit-result-card{box-sizing:border-box;width:min(100%,680px);padding:38px;border:1px solid #e5e7eb;border-radius:20px;background:#fff;text-align:center;box-shadow:0 18px 55px rgba(18,24,40,.10)}
.yd-deposit-error-card .yd-result-icon{width:72px;height:72px;margin:0 auto 16px;display:grid;place-items:center;border-radius:50%;background:#fff0f0;color:#b42318;font-size:36px;font-weight:950}.yd-result-kicker{display:inline-block;margin-bottom:8px;color:#a02a20;font-size:13px;font-weight:900}.yd-deposit-result-card h1{margin:0;color:#17191f;font-size:30px;font-weight:950}.yd-deposit-result-card>p{max-width:540px;margin:14px auto 0;color:#606874;font-size:15px;line-height:1.9}
.yd-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}.yd-result-actions a{display:flex;align-items:center;justify-content:center;min-height:52px;padding:0 16px;border-radius:11px;text-decoration:none;font-weight:900}.yd-result-primary{background:#f7c51e;color:#17191f}.yd-result-whatsapp{background:#1fad5b;color:#fff}
@media(max-width:640px){.yd-deposit-result-card{padding:28px 20px}.yd-deposit-result-card h1{font-size:24px}.yd-result-actions{grid-template-columns:1fr}}
</style>
@endsection
