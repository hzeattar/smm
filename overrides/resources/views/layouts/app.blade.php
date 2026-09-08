<!DOCTYPE html>
<html lang="{{ Helper::getDefaultDirection() == 'rtl' ? 'ar' : 'en' }}" dir="{{ Helper::getDefaultDirection() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>{{ Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا' }}</title>
    <meta name="description" content="{{ Helper::settings('website_desc') }}">
    <meta name="keywords" content="{{ Helper::settings('website_keywords') }}">
    <meta name="robots" content="index, follow">

    <link rel="icon" type="image/svg+xml" href="{{ asset('brand/yellow-duck.svg') }}">
    <link rel="apple-touch-icon" href="{{ asset('brand/yellow-duck.svg') }}">

    <meta property="og:title" content="{{ Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا' }}">
    <meta property="og:site_name" content="{{ Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا' }}">
    <meta property="og:description" content="{{ Helper::settings('website_desc') }}">
    <meta property="og:type" content="website">

    <link rel="stylesheet" href="{{ asset(Helper::getDefaultDirection() == 'rtl' ? 'css/app-rtl.css' : 'css/app.css') }}">
    <link rel="stylesheet" href="{{ asset('css/yellow-duck-theme.css') }}">
    <link rel="stylesheet" href="{{ asset('css/yellow-duck-landing.css') }}">

    <style>@include('layouts.style-config')</style>
    {!! Helper::settings('scripts_integrations') !!}
    @yield('css')
</head>
<body>
    @yield('content')

    <script src="{{ asset('js/app.js') }}"></script>
    <script>
    document.addEventListener('DOMContentLoaded', function () {
        var toggle = document.querySelector('.yd-menu-toggle');
        var nav = document.getElementById('yd-main-nav');
        if (toggle && nav) {
            toggle.addEventListener('click', function () {
                var open = nav.classList.toggle('yd-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            nav.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    nav.classList.remove('yd-open');
                    toggle.setAttribute('aria-expanded', 'false');
                });
            });
        }
    });
    </script>
    @yield('scripts')
</body>
</html>
