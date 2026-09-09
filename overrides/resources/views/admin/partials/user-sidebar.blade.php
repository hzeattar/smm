@php
    $currentUser = Auth::user();
    $avatar = $currentUser && !empty($currentUser->avatar) ? $currentUser->avatar : 'avatar.jpg';
@endphp
<div class="js-sidebar-scroll">
    <div class="smini-hidden">
        <div class="content-side content-side-full bg-black-10 d-flex align-items-center">
            <a class="img-link d-inline-block" href="{{ route('user.profil') }}">
                <img class="img-avatar img-avatar48 img-avatar-thumb" src="{{ asset('images/avatars/'.$avatar) }}" alt="">
            </a>
            <div class="ml-3">
                <a class="font-w600 text-dual" href="{{ route('user.profil') }}">
                    {{ $currentUser ? trim(($currentUser->firstname ?? '').' '.($currentUser->lastname ?? '')) : 'User' }}
                </a>
                <div class="font-size-sm font-italic text-dual">{{ $currentUser->username ?? $currentUser->email ?? '' }}</div>
            </div>
        </div>
    </div>

    <div class="content-side">
        <ul class="nav-main">
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('user.dashboard') ? 'active' : '' }}" href="{{ route('user.dashboard') }}">
                    <i class="nav-main-link-icon fas fa-cart-plus"></i>
                    <span class="nav-main-link-name">طلب جديد</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('user.orders.*') ? 'active' : '' }}" href="{{ route('user.orders.index') }}">
                    <i class="nav-main-link-icon fas fa-clipboard-list"></i>
                    <span class="nav-main-link-name">سجل الطلبات</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('user.services.*') ? 'active' : '' }}" href="{{ route('user.services.index') }}">
                    <i class="nav-main-link-icon fas fa-tags"></i>
                    <span class="nav-main-link-name">الخدمات</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('user.add-funds') ? 'active' : '' }}" href="{{ route('user.add-funds') }}">
                    <i class="nav-main-link-icon fas fa-dollar-sign"></i>
                    <span class="nav-main-link-name">إضافة رصيد</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('user.transactions.*') ? 'active' : '' }}" href="{{ route('user.transactions.index') }}">
                    <i class="nav-main-link-icon fas fa-receipt"></i>
                    <span class="nav-main-link-name">الدفع المالي</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('user.tickets.*') ? 'active' : '' }}" href="{{ route('user.tickets.index') }}">
                    <i class="nav-main-link-icon fas fa-headset"></i>
                    <span class="nav-main-link-name">التذاكر</span>
                </a>
            </li>
            <li class="nav-main-item">
                <a class="nav-main-link {{ request()->routeIs('user.profil') ? 'active' : '' }}" href="{{ route('user.profil') }}">
                    <i class="nav-main-link-icon fas fa-user-edit"></i>
                    <span class="nav-main-link-name">الملف الشخصي</span>
                </a>
            </li>
        </ul>
    </div>
</div>
