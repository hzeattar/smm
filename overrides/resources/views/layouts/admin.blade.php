<!doctype html>
<html lang="{{ Helper::getDefaultDirection() == 'rtl' ? 'ar' : 'en' }}" dir="{{ Helper::getDefaultDirection() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>{{ Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا' }}</title>
    <meta name="description" content="{{ Helper::settings('website_desc') }}">
    <meta name="robots" content="noindex,nofollow">
    <meta name="language_id" content="{{ session()->get('language_id') }}">
    <link rel="icon" type="image/svg+xml" href="{{ asset('brand/yellow-duck.svg') }}">

    @yield('css')
    <link rel="stylesheet" href="{{ asset(Helper::getDefaultDirection() == 'rtl' ? 'css/app-rtl.css' : 'css/app.css') }}">
    @if (Helper::getDefaultDirection() == 'rtl')
        <link rel="stylesheet" href="{{ asset('css/admin-rtl.css') }}">
    @endif
    <link rel="stylesheet" href="{{ asset('css/yellow-duck-theme.css') }}">
    <link rel="stylesheet" href="{{ asset('css/yellow-duck-admin.css') }}">
    <link rel="stylesheet" href="{{ asset('css/yellow-duck-polish.css') }}">
    <style>@include('layouts.style-config')</style>
    @yield('header-scripts')
</head>
<body>
<div id="page-container" class="@if (Helper::getDefaultDirection() == 'rtl') rtl-support sidebar-r @endif">
    <nav id="sidebar" aria-label="Main Navigation">
        <div class="content-header bg-primary">
            <a class="yd-sidebar-brand" href="{{ route('welcome') }}">
                <img src="{{ asset('brand/yellow-duck.svg') }}" alt="البطة الصفرا">
                <span><strong>البطة الصفرا</strong><small>خدمات السوشيال ميديا</small></span>
            </a>
            <button type="button" class="btn btn-sm d-lg-none yd-sidebar-close" aria-label="إغلاق القائمة">×</button>
        </div>

        @if(Auth::guard('admin')->check())
            @include('admin.partials.admin-sidebar')
        @else
            @include('admin.partials.user-sidebar')
        @endif
    </nav>

    @include('admin.partials.header')

    <main id="app">
        @yield('content')
    </main>

    @include('admin.partials.footer')
</div>

<script src="{{ asset('js/app.js') }}"></script>
<script>
(function () {
    function ready(fn){ if(document.readyState !== 'loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
    ready(function () {
        var page = document.getElementById('page-container');
        document.querySelectorAll('[data-action="sidebar_toggle"]').forEach(function(btn){
            btn.addEventListener('click', function(){ page.classList.toggle('yd-sidebar-open'); });
        });
        document.querySelectorAll('[data-action="sidebar_close"], .yd-sidebar-close').forEach(function(btn){
            btn.addEventListener('click', function(){ page.classList.remove('yd-sidebar-open'); });
        });
        document.querySelectorAll('.nav-main-link-submenu').forEach(function(link){
            link.addEventListener('click', function(e){
                e.preventDefault();
                var item = link.closest('.nav-main-item');
                if(item) item.classList.toggle('open');
            });
        });
        document.querySelectorAll('.admin-logout').forEach(function(link){
            link.addEventListener('click', function(e){
                e.preventDefault();
                var form = link.querySelector('form');
                if(form) form.submit();
            });
        });
        if(window.jQuery && jQuery.fn.tooltip){ jQuery('body').tooltip({selector:'[data-toggle=tooltip]'}); }
    });
})();
</script>

@if(session()->has('email_error'))
@php session()->forget('email_error') @endphp
<script>console.warn('Email configuration needs attention.');</script>
@endif
@if(Session::has('checkenv'))
@php session()->forget('checkenv') @endphp
<script>console.warn('This action is restricted by the environment middleware.');</script>
@endif

@yield('scripts')
</body>
</html>
