@extends('layouts.auth')

@section('content')
<div class="yd-auth-shell">
    <section class="yd-auth-card" aria-labelledby="register-title">
        <a href="{{ route('welcome') }}" class="yd-auth-brand">
            <img src="{{ asset('brand/yellow-duck.svg') }}" alt="البطة الصفرا">
            <span><strong>البطة الصفرا</strong><small>لخدمات السوشيال ميديا</small></span>
        </a>

        <h1 id="register-title" class="yd-auth-title">إنشاء حساب جديد</h1>
        <p class="yd-auth-subtitle">أنشئ حسابك وابدأ إدارة الطلبات والخدمات من لوحة واحدة.</p>

        @if($errors->any())
            <div class="yd-alert">فيه بيانات محتاجة تعديل. راجع الحقول المعلّمة وحاول تاني.</div>
        @endif

        <form method="POST" action="{{ route('register') }}" novalidate>
            @csrf
            <div class="yd-field">
                <label for="username">اسم المستخدم</label>
                <input id="username" name="username" type="text" class="yd-input {{ $errors->has('username') ? 'is-invalid' : '' }}" value="{{ old('username') }}" autocomplete="username" required autofocus>
                @if($errors->has('username'))<div class="yd-error">{{ $errors->first('username') }}</div>@endif
            </div>

            <div class="yd-grid-2">
                <div class="yd-field">
                    <label for="firstname">الاسم الأول</label>
                    <input id="firstname" name="firstname" type="text" class="yd-input {{ $errors->has('firstname') ? 'is-invalid' : '' }}" value="{{ old('firstname') }}" required>
                    @if($errors->has('firstname'))<div class="yd-error">{{ $errors->first('firstname') }}</div>@endif
                </div>
                <div class="yd-field">
                    <label for="lastname">اسم العائلة</label>
                    <input id="lastname" name="lastname" type="text" class="yd-input {{ $errors->has('lastname') ? 'is-invalid' : '' }}" value="{{ old('lastname') }}" required>
                    @if($errors->has('lastname'))<div class="yd-error">{{ $errors->first('lastname') }}</div>@endif
                </div>
            </div>

            <div class="yd-field">
                <label for="email">البريد الإلكتروني</label>
                <input id="email" name="email" type="email" class="yd-input {{ $errors->has('email') ? 'is-invalid' : '' }}" value="{{ old('email') }}" autocomplete="email" required>
                @if($errors->has('email'))<div class="yd-error">{{ $errors->first('email') }}</div>@endif
            </div>

            <div class="yd-grid-2">
                <div class="yd-field">
                    <label for="password">كلمة المرور</label>
                    <input id="password" name="password" type="password" class="yd-input {{ $errors->has('password') ? 'is-invalid' : '' }}" autocomplete="new-password" required>
                    @if($errors->has('password'))<div class="yd-error">{{ $errors->first('password') }}</div>@endif
                </div>
                <div class="yd-field">
                    <label for="password-confirm">تأكيد كلمة المرور</label>
                    <input id="password-confirm" name="password_confirmation" type="password" class="yd-input" autocomplete="new-password" required>
                </div>
            </div>

            <label class="yd-terms">
                <input type="checkbox" name="terms" value="1" {{ old('terms') ? 'checked' : '' }} required>
                <span>أوافق على <a class="yd-link" href="{{ route('terms-conditions') }}" target="_blank" rel="noopener">الشروط والأحكام</a>.</span>
            </label>
            @if($errors->has('terms'))<div class="yd-error" style="margin-top:-12px;margin-bottom:14px">يجب الموافقة على الشروط والأحكام.</div>@endif

            <button class="yd-btn" type="submit">إنشاء الحساب</button>
        </form>

        <div class="yd-auth-foot">عندك حساب بالفعل؟ <a href="{{ route('login') }}">تسجيل الدخول</a></div>
        <div class="yd-back"><a class="yd-link" href="{{ route('welcome') }}">العودة للصفحة الرئيسية</a></div>
    </section>
</div>
@endsection
