<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>{{ Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا' }}</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="{{ asset('brand/yellow-duck.svg') }}">
    <link rel="stylesheet" href="{{ asset('css/app-rtl.css') }}">
    <link rel="stylesheet" href="{{ asset('css/yellow-duck-auth.css') }}">
    <link rel="stylesheet" href="{{ asset('css/yellow-duck-polish.css') }}">
</head>
<body class="yd-auth-page">
    @yield('content')
    <script src="{{ asset('js/app.js') }}"></script>
    @yield('scripts')
</body>
</html>
