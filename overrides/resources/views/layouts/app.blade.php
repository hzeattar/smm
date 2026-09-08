<!DOCTYPE html>
<html lang="{{ Helper::getDefaultDirection() == 'rtl' ? 'ar' : 'en' }}" dir="{{ Helper::getDefaultDirection() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">

    <title>{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}</title>

    <meta name="description" content="{{Helper::settings('website_desc')}}">
    <meta name="keywords" content="{{Helper::settings('website_keywords')}}">
    <meta name="robots" content="index, follow">

    <link rel="shortcut icon" href="{{asset('brand/yellow-duck.svg')}}">
    <link rel="icon" type="image/svg+xml" href="{{asset('brand/yellow-duck.svg')}}">
    <link rel="apple-touch-icon" href="{{asset('brand/yellow-duck.svg')}}">

    <meta property="og:title" content="{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}">
    <meta property="og:site_name" content="{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}">
    <meta property="og:description" content="{{Helper::settings('website_desc')}}">
    <meta property="og:type" content="website">

    @if (Helper::getDefaultDirection() == 'rtl')
    <link rel="stylesheet" href="{{asset('css/app-rtl.css')}}">
    @else
    <link rel="stylesheet" href="{{asset('css/app.css')}}">
    @endif

    <link rel="stylesheet" href="{{asset('admin/css/main.css')}}">
    <link rel="stylesheet" href="{{asset('css/yellow-duck-theme.css')}}">

    <style>
        @include('layouts.style-config');
    </style>

    {!! Helper::settings('scripts_integrations') !!}
</head>
<body>
    @yield('content')

    @yield('scripts')
</body>
</html>
