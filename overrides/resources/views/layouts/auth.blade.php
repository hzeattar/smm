<!doctype html>
<html lang="{{ Helper::getDefaultDirection() == 'rtl' ? 'ar' : 'en' }}" dir="{{ Helper::getDefaultDirection() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">

    <title>{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}</title>

    <meta name="description" content="{{Helper::settings('website_desc')}}">
    <meta name="keywords" content="{{Helper::settings('website_keywords')}}">
    <meta name="robots" content="noindex, nofollow">

    <meta property="og:title" content="{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}">
    <meta property="og:site_name" content="{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}">
    <meta property="og:description" content="{{Helper::settings('website_desc')}}">

    <link rel="shortcut icon" href="{{asset('brand/yellow-duck.svg')}}">
    <link rel="icon" type="image/svg+xml" href="{{asset('brand/yellow-duck.svg')}}">
    <link rel="apple-touch-icon" href="{{asset('brand/yellow-duck.svg')}}">

    <link rel="stylesheet" id="css-main" href="{{asset('admin/css/main.css')}}">
    @if (Helper::getDefaultDirection() == 'rtl')
    <link rel="stylesheet" href="{{asset('css/admin-rtl.css')}}">
    @endif
    <link rel="stylesheet" href="{{asset('css/yellow-duck-theme.css')}}">
</head>
<body>
    <div id="page-container" class="auth-brand-panel">
        @yield('content')
    </div>

    <script src="{{asset('js/app.js')}}"></script>
    <script src="{{asset('admin/js/core.js')}}"></script>
    <script src="{{asset('admin/js/app.js')}}"></script>
    <script src="{{asset('admin/js/plugins/bootstrap-notify/bootstrap-notify.min.js')}}"></script>
    <script>jQuery(function(){Dashmix.helpers('notify');});</script>

    @yield('scripts')
</body>
</html>
