@extends('layouts.auth')

@section('content')
@php($isAdmin = request()->is('admin/*'))
<div class="yd-auth-shell">
    <section class="yd-auth-card" aria-labelledby="auth-title">
        <a href="{{ route('welcome') }}" class="yd-auth-brand">
            <img src="{{ asset('brand/yellow-duck.svg') }}" alt="البطة الصفرا">
            <span><strong>البطة الصفرا</strong><small>لخدمات السوشيال ميديا</small></span>
        </a>

        @if($isAdmin)
            <div class="yd-admin-badge">لوحة الإدارة</div>
        @endif

        <h1 id="auth-title" class="yd-auth-title">{{ $isAdmin ? 'دخول الإدارة' : 'تسجيل الدخول' }}</h1>
        <p class="yd-auth-subtitle">{{ $isAdmin ? 'ادخل بيانات حساب الإدارة للوصول إلى لوحة التحكم.' : 'ادخل بيانات حسابك لإدارة الطلبات والرصيد والخدمات.' }}</p>

        @if($errors->any())
            <div class="yd-alert">تعذر تسجيل الدخول. راجع البيانات وحاول مرة أخرى.</div>
        @endif
        @if(session()->has('account_disabled'))
            <div class="yd-alert">هذا الحساب غير نشط حاليًا.</div>
        @endif

        <form action="{{ $isAdmin ? route('admin.login') : route('login') }}" method="POST" novalidate>
            @csrf
            <div class="yd-field">
                <label for="username">البريد الإلكتروني أو اسم المستخدم</label>
                <input class="yd-input {{ ($errors->has('username') || $errors->has('email')) ? 'is-invalid' : '' }}" id="username" name="username" type="text" value="{{ old('username') }}" autocomplete="username" autofocus required>
                @if($errors->has('username'))<div class="yd-error">{{ $errors->first('username') }}</div>@endif
                @if($errors->has('email'))<div class="yd-error">{{ $errors->first('email') }}</div>@endif
            </div>

            <div class="yd-field">
                <label for="password">كلمة المرور</label>
                <input class="yd-input {{ $errors->has('password') ? 'is-invalid' : '' }}" id="password" name="password" type="password" autocomplete="current-password" required>
                @if($errors->has('password'))<div class="yd-error">{{ $errors->first('password') }}</div>@endif
            </div>

            <div class="yd-auth-row">
                <label class="yd-check"><input type="checkbox" name="remember" value="1" {{ old('remember', true) ? 'checked' : '' }}><span>تذكرني</span></label>
                <a class="yd-link" href="{{ $isAdmin ? route('admin.password.request') : route('password.request') }}">نسيت كلمة المرور؟</a>
            </div>

            <button class="yd-btn" type="submit">{{ $isAdmin ? 'دخول لوحة الإدارة' : 'تسجيل الدخول' }}</button>
        </form>

        @unless($isAdmin)
            <div class="yd-auth-foot">ليس لديك حساب؟ <a href="{{ route('register') }}">إنشاء حساب جديد</a></div>
        @endunless
        <div class="yd-back"><a class="yd-link" href="{{ route('welcome') }}">العودة للصفحة الرئيسية</a></div>
    </section>
</div>
@endsection
