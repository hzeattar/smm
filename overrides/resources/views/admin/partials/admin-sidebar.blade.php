@php
    $admin = Auth::guard('admin')->user();
    $avatar = $admin && !empty($admin->avatar) ? $admin->avatar : 'avatar.jpg';
    $isUsersOpen = request()->routeIs('admin.users.*') || request()->routeIs('admin.admins.*');
    $isSettingsOpen = request()->routeIs('admin.settings.*') || request()->routeIs('admin.languages.*') || request()->routeIs('admin.faqs.*') || request()->routeIs('admin.announcements.*');
@endphp

<div class="js-sidebar-scroll">
    <div class="smini-hidden">
        <div class="content-side content-side-full yd-sidebar-profile">
            <img class="img-avatar img-avatar48" src="{{ asset('images/avatars/' . $avatar) }}" alt="Admin">
            <div>
                <strong>{{ trim(($admin->firstname ?? 'Yellow Duck') . ' ' . ($admin->lastname ?? 'Admin')) }}</strong>
                <span>{{ $admin->username ?? 'yellowduck_admin' }}</span>
            </div>
        </div>
    </div>

    <div class="content-side">
        <ul class="nav-main">
            <li class="nav-main-heading">الإدارة</li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.dashboard') ? 'active' : '' }}" href="{{ route('admin.dashboard') }}">
                    <i class="nav-main-link-icon fas fa-tachometer-alt"></i>
                    <span class="nav-main-link-name">لوحة التحكم</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.orders.*') ? 'active' : '' }}" href="{{ route('admin.orders.index') }}">
                    <i class="nav-main-link-icon fas fa-clipboard-list"></i>
                    <span class="nav-main-link-name">الطلبات</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.services.*') ? 'active' : '' }}" href="{{ route('admin.services.index') }}">
                    <i class="nav-main-link-icon fas fa-layer-group"></i>
                    <span class="nav-main-link-name">الخدمات</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.categories.*') ? 'active' : '' }}" href="{{ route('admin.categories.index') }}">
                    <i class="nav-main-link-icon fas fa-tags"></i>
                    <span class="nav-main-link-name">الأقسام</span>
                </a>
            </li>

            <li class="nav-main-heading">الماليات</li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.transactions.*') ? 'active' : '' }}" href="{{ route('admin.transactions.index') }}">
                    <i class="nav-main-link-icon fas fa-receipt"></i>
                    <span class="nav-main-link-name">المعاملات</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.payment-methods.*') ? 'active' : '' }}" href="{{ route('admin.payment-methods.index') }}">
                    <i class="nav-main-link-icon fas fa-money-check-alt"></i>
                    <span class="nav-main-link-name">طرق الدفع</span>
                </a>
            </li>

            <li class="nav-main-heading">التشغيل</li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.api-providers.*') ? 'active' : '' }}" href="{{ route('admin.api-providers.index') }}">
                    <i class="nav-main-link-icon fas fa-network-wired"></i>
                    <span class="nav-main-link-name">مزودو الخدمات</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('admin.tickets.*') ? 'active' : '' }}" href="{{ route('admin.tickets.index') }}">
                    <i class="nav-main-link-icon fas fa-headset"></i>
                    <span class="nav-main-link-name">التذاكر</span>
                </a>
            </li>

            <li class="nav-main-item {{ $isUsersOpen ? 'open' : '' }}">
                <a class="nav-main-link nav-main-link-submenu" href="#">
                    <i class="nav-main-link-icon fa fa-users"></i>
                    <span class="nav-main-link-name">المستخدمون</span>
                </a>
                <ul class="nav-main-submenu">
                    <li class="nav-main-item">
                        <a class="nav-main-link {{ request()->routeIs('admin.users.*') ? 'active' : '' }}" href="{{ route('admin.users.index') }}">
                            <span class="nav-main-link-name">عملاء الموقع</span>
                        </a>
                    </li>
                    <li class="nav-main-item">
                        <a class="nav-main-link {{ request()->routeIs('admin.admins.*') ? 'active' : '' }}" href="{{ route('admin.admins.index') }}">
                            <span class="nav-main-link-name">مديرو النظام</span>
                        </a>
                    </li>
                </ul>
            </li>

            <li class="nav-main-item {{ $isSettingsOpen ? 'open' : '' }}">
                <a class="nav-main-link nav-main-link-submenu" href="#">
                    <i class="nav-main-link-icon fa fa-cogs"></i>
                    <span class="nav-main-link-name">الإعدادات</span>
                </a>
                <ul class="nav-main-submenu">
                    <li class="nav-main-item"><a class="nav-main-link {{ request()->routeIs('admin.settings.general') ? 'active' : '' }}" href="{{ route('admin.settings.general') }}">الإعدادات العامة</a></li>
                    <li class="nav-main-item"><a class="nav-main-link {{ request()->routeIs('admin.settings.default') ? 'active' : '' }}" href="{{ route('admin.settings.default') }}">إعدادات الخدمات</a></li>
                    <li class="nav-main-item"><a class="nav-main-link {{ request()->routeIs('admin.settings.apparence') ? 'active' : '' }}" href="{{ route('admin.settings.apparence') }}">المظهر</a></li>
                    <li class="nav-main-item"><a class="nav-main-link {{ request()->routeIs('admin.languages.*') ? 'active' : '' }}" href="{{ route('admin.languages.index') }}">اللغات</a></li>
                    <li class="nav-main-item"><a class="nav-main-link {{ request()->routeIs('admin.faqs.*') ? 'active' : '' }}" href="{{ route('admin.faqs.index') }}">الأسئلة الشائعة</a></li>
                    <li class="nav-main-item"><a class="nav-main-link {{ request()->routeIs('admin.announcements.*') ? 'active' : '' }}" href="{{ route('admin.announcements.index') }}">التحديثات</a></li>
                </ul>
            </li>
        </ul>
    </div>
</div>
