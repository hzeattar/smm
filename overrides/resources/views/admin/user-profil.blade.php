@extends('layouts.admin')

@section('content')
<main id="main-container" class="yd-profile-page" dir="rtl">
    <section class="yd-profile-heading">
        <div>
            <span>{{ $isAdmin ? 'حساب الإدارة' : 'حساب المستخدم' }}</span>
            <h1>الملف الشخصي</h1>
            <p>عدّل بياناتك واختر شخصية البطة التي تظهر داخل حسابك.</p>
        </div>
        <img src="{{ asset('images/avatars/' . (array_key_exists((string) $user->avatar, $duckAvatars) ? $user->avatar : 'duck-happy.jpg')) }}" alt="صورتك الحالية">
    </section>

    @if(session('success_update'))
        <div class="yd-profile-alert success">تم تحديث الملف الشخصي بنجاح.</div>
    @endif

    @if($errors->any())
        <div class="yd-profile-alert error">
            @foreach($errors->all() as $error)<div>{{ $error }}</div>@endforeach
        </div>
    @endif

    <form class="yd-profile-form" action="{{ $isAdmin ? route('admin.post-profil') : route('user.post-profil') }}" method="POST">
        @csrf
        <section class="yd-profile-panel">
            <div class="yd-profile-panel-head">
                <div>
                    <span>اختر صورتك</span>
                    <h2>شخصيات البطة الصفرا</h2>
                </div>
                <i class="fa fa-smile"></i>
            </div>

            @php($currentAvatar = array_key_exists((string) $user->avatar, $duckAvatars) ? $user->avatar : 'duck-happy.jpg')
            <div class="yd-avatar-grid">
                @foreach($duckAvatars as $file => $label)
                    <label class="yd-avatar-choice">
                        <input type="radio" name="avatar_choice" value="{{ $file }}" {{ old('avatar_choice', $currentAvatar) === $file ? 'checked' : '' }}>
                        <span>
                            <img src="{{ asset('images/avatars/' . $file) }}" alt="{{ $label }}">
                            <strong>{{ $label }}</strong>
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </span>
                    </label>
                @endforeach
            </div>
            <p class="yd-profile-note"><i class="fa fa-shield-alt"></i> لا يوجد رفع ملفات. اختر صورة جاهزة وآمنة من المجموعة.</p>
        </section>

        <section class="yd-profile-panel">
            <div class="yd-profile-panel-head">
                <div>
                    <span>بيانات الحساب</span>
                    <h2>المعلومات الأساسية</h2>
                </div>
                <i class="fa fa-user-circle"></i>
            </div>
            <div class="yd-profile-fields">
                <label><span>اسم المستخدم</span><input name="username" value="{{ old('username', $user->username) }}" required></label>
                <label><span>البريد الإلكتروني</span><input type="email" name="email" value="{{ old('email', $user->email) }}" readonly required></label>
                <label><span>الاسم الأول</span><input name="firstname" value="{{ old('firstname', $user->firstname) }}" required></label>
                <label><span>اسم العائلة</span><input name="lastname" value="{{ old('lastname', $user->lastname) }}" required></label>
            </div>
        </section>

        <section class="yd-profile-panel">
            <div class="yd-profile-panel-head">
                <div>
                    <span>اختياري</span>
                    <h2>تغيير كلمة المرور</h2>
                </div>
                <i class="fa fa-lock"></i>
            </div>
            <div class="yd-profile-fields yd-password-fields">
                <label><span>كلمة المرور الحالية</span><input type="password" name="password" autocomplete="current-password"></label>
                <label><span>كلمة المرور الجديدة</span><input type="password" name="password_new" autocomplete="new-password" minlength="8"></label>
                <label><span>تأكيد كلمة المرور الجديدة</span><input type="password" name="password_new_confirm" autocomplete="new-password" minlength="8"></label>
            </div>
        </section>

        <div class="yd-profile-actions">
            <a href="{{ $isAdmin ? route('admin.dashboard') : route('user.dashboard') }}">إلغاء</a>
            <button type="submit"><i class="fa fa-check-circle"></i> حفظ التغييرات</button>
        </div>
    </form>
</main>
@endsection
