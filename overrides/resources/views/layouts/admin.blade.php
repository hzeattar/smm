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
    <style>
        @include('layouts.style-config')
        #sidebar,#page-header,#app,#main-container{transition:transform .22s ease,left .22s ease,right .22s ease,margin .22s ease}
        @media (min-width:992px){
            #page-container.yd-sidebar-collapsed #sidebar{transform:translateX(-105%)}
            [dir="rtl"] #page-container.yd-sidebar-collapsed #sidebar{transform:translateX(105%)}
            #page-container.yd-sidebar-collapsed #page-header{left:0!important;right:0!important}
            #page-container.yd-sidebar-collapsed #app,
            #page-container.yd-sidebar-collapsed #main-container{margin-left:0!important;margin-right:0!important}
        }
    </style>
    @yield('header-scripts')
</head>
<body>
@php
    $brandHome = Auth::guard('admin')->check()
        ? route('admin.dashboard')
        : (Auth::check() ? route('user.dashboard') : route('welcome'));
@endphp
<div id="page-container" class="@if (Helper::getDefaultDirection() == 'rtl') rtl-support sidebar-r @endif">
    <nav id="sidebar" aria-label="Main Navigation">
        <div class="content-header bg-primary">
            <a class="yd-sidebar-brand" href="{{ $brandHome }}">
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
        if (!page) return;
        var mobile = window.matchMedia('(max-width: 991px)');
        var toggles = document.querySelectorAll('[data-action="sidebar_toggle"]');

        function desktopCollapsedPreference(){
            try { return window.localStorage.getItem('yd-sidebar-collapsed') === '1'; }
            catch (e) { return false; }
        }
        function saveDesktopPreference(collapsed){
            try { window.localStorage.setItem('yd-sidebar-collapsed', collapsed ? '1' : '0'); }
            catch (e) {}
        }
        function updateToggleState(){
            var expanded = mobile.matches
                ? page.classList.contains('yd-sidebar-open')
                : !page.classList.contains('yd-sidebar-collapsed');
            toggles.forEach(function(btn){
                btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                btn.setAttribute('aria-label', expanded ? 'إغلاق القائمة' : 'فتح القائمة');
                btn.setAttribute('title', expanded ? 'إغلاق القائمة' : 'فتح القائمة');
            });
        }
        function syncForViewport(){
            if (mobile.matches) {
                page.classList.remove('yd-sidebar-collapsed');
            } else {
                page.classList.remove('yd-sidebar-open', 'sidebar-o');
                page.classList.toggle('yd-sidebar-collapsed', desktopCollapsedPreference());
            }
            updateToggleState();
        }

        toggles.forEach(function(btn){
            btn.addEventListener('click', function(e){
                e.preventDefault();
                e.stopImmediatePropagation();
                if (mobile.matches) {
                    page.classList.remove('sidebar-o');
                    page.classList.toggle('yd-sidebar-open');
                } else {
                    page.classList.remove('yd-sidebar-open', 'sidebar-o');
                    var collapsed = page.classList.toggle('yd-sidebar-collapsed');
                    saveDesktopPreference(collapsed);
                }
                updateToggleState();
            }, true);
        });

        document.querySelectorAll('[data-action="sidebar_close"], .yd-sidebar-close').forEach(function(btn){
            btn.addEventListener('click', function(e){
                e.preventDefault();
                page.classList.remove('yd-sidebar-open', 'sidebar-o');
                updateToggleState();
            });
        });

        if (mobile.addEventListener) mobile.addEventListener('change', syncForViewport);
        else if (mobile.addListener) mobile.addListener(syncForViewport);
        syncForViewport();

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
        document.addEventListener('pointerdown', function(e){
            if(e.button && e.button !== 0) return;
            var pop = document.createElement('span');
            pop.className = 'yd-duck-pop';
            pop.textContent = '🦆';
            pop.style.left = e.clientX + 'px';
            pop.style.top = e.clientY + 'px';
            document.body.appendChild(pop);
            window.setTimeout(function(){ pop.remove(); }, 760);
        }, {passive:true});
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
