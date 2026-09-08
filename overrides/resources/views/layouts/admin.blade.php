<!doctype html>
<html lang="{{ Helper::getDefaultDirection() == 'rtl' ? 'ar' : 'en' }}" dir="{{ Helper::getDefaultDirection() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">

    <title>{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}</title>
    <meta name="description" content="{{Helper::settings('website_desc')}}">
    <meta name="keywords" content="{{Helper::settings('website_keywords')}}">
    <meta name="robots" content="noindex, nofollow">
    <meta name="language_id" content="{{session()->get('language_id')}}">

    <meta property="og:title" content="{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}">
    <meta property="og:site_name" content="{{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}">
    <meta property="og:description" content="{{Helper::settings('website_desc')}}">
    <meta property="og:type" content="website">

    <link rel="shortcut icon" href="{{asset('brand/yellow-duck.svg')}}">
    <link rel="icon" type="image/svg+xml" href="{{asset('brand/yellow-duck.svg')}}">
    <link rel="apple-touch-icon" href="{{asset('brand/yellow-duck.svg')}}">

    <style>@include('layouts.style-config');</style>
    @yield('css')

    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
    <link rel="stylesheet" id="css-main" href="{{asset('admin/css/main.css')}}">
    @if (Helper::getDefaultDirection() == 'rtl')
    <link rel="stylesheet" href="{{asset('css/admin-rtl.css')}}">
    @endif
    <link rel="stylesheet" href="{{asset('css/yellow-duck-theme.css')}}">

    @yield('header-scripts')
</head>
<body>
<div id="page-container" class="sidebar-o sidebar-dark enable-page-overlay side-scroll page-header-fixed page-header-dark page-header-glass main-content-boxed @if (Helper::getDefaultDirection() == 'rtl') rtl-support sidebar-r @endif">

    <nav id="sidebar" aria-label="Main Navigation">
        <div class="smini-visible-block">
            <div class="content-header bg-primary">
                <a class="yellow-duck-lockup" href="{{route('welcome')}}" aria-label="البطة الصفرا">
                    <img src="{{asset('brand/yellow-duck.svg')}}" alt="البطة الصفرا">
                </a>
            </div>
        </div>

        <div class="smini-hidden">
            <div class="content-header justify-content-lg-center bg-primary">
                <a class="yellow-duck-lockup" href="{{route('welcome')}}">
                    <img src="{{asset('brand/yellow-duck.svg')}}" alt="البطة الصفرا">
                    <span class="yellow-duck-brand">البطة الصفرا<small>خدمات السوشيال ميديا</small></span>
                </a>
                <div class="d-lg-none">
                    <a class="ml-2" data-toggle="layout" data-action="sidebar_close" href="javascript:void(0)" style="color:#17191f">
                        <i class="fa fa-times-circle"></i>
                    </a>
                </div>
            </div>
        </div>

        @if(Auth::guard('admin')->check())
            @include('admin.partials.admin-sidebar')
        @else
            @include('admin.partials.user-sidebar')
        @endif
    </nav>

    @include('admin.partials.header')

    <div id="app">
        @yield('content')
    </div>

    @include('admin.partials.footer')
</div>

<script src="{{asset('admin/js/core/jquery.min.js')}}"></script>
<script src="{{asset('admin/js/core/bootstrap.bundle.min.js')}}"></script>
<script src="{{asset('js/app.js')}}"></script>
<script src="{{asset('admin/js/core.js')}}"></script>
<script src="{{asset('admin/js/app.js')}}"></script>
<script src="{{asset('admin/js/plugins/bootstrap-notify/bootstrap-notify.min.js')}}"></script>
<script>
    jQuery(function(){
        Dashmix.helpers('notify');
        $("body").tooltip({ selector: '[data-toggle=tooltip]' });
    });
</script>

@if(session()->has('email_error'))
@php session()->forget('email_error') @endphp
<script>jQuery(function(){ window.utilities.notify('error','Email can not be sent. please check your configuration'); });</script>
@endif

@if(Session::has('checkenv'))
<script>jQuery(function(){ window.utilities.notify('error',"for security reasons you can't update data in demo version"); });</script>
@php session()->forget('checkenv') @endphp
@endif

@yield('scripts')
</body>
</html>
