@php
    $isAdmin = Auth::guard('admin')->check();
    $currentUser = $isAdmin ? Auth::guard('admin')->user() : Auth::user();
@endphp
<style>
    #page-header .yd-header-icon{width:20px;height:20px;display:inline-block;vertical-align:middle;flex:0 0 auto;color:#3f4652}
    #page-header .yd-header-chevron{width:14px;height:14px;margin-inline-start:5px}
    #page-header .btn-dual{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:38px;min-height:38px}
    #page-header .dropdown-item .yd-header-icon,#page-header .nav-items .yd-header-icon{width:17px;height:17px;margin-inline-end:7px}
</style>
<header id="page-header">
    <div class="content-header">
        <div class="d-flex align-items-center">
            <button type="button" class="btn btn-dual" data-toggle="layout" data-action="sidebar_toggle" aria-label="فتح القائمة" title="القائمة">
                <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
        </div>

        <div class="d-flex align-items-center">
            <div class="dropdown d-inline-block">
                <button type="button" class="btn btn-dual" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="اللغة" title="اللغة">
                    <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3C9.6 5.5 8.4 8.5 8.4 12S9.6 18.5 12 21"/>
                    </svg>
                    <svg class="yd-header-icon yd-header-chevron d-none d-sm-inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="m7 10 5 5 5-5"/>
                    </svg>
                </button>
                <div class="dropdown-menu dropdown-menu-right p-0">
                    <div class="list-group">
                        @forelse (($languages ?? collect()) as $language)
                            <a href="{{ $isAdmin ? route('admin.languages.set-language', $language->id) : route('user.languages.set-language', $language->id) }}" class="list-group-item list-group-item-action">
                                @if(!empty($language->image))
                                    <img width="20" src="{{ asset('images/'.$language->image) }}" alt="">
                                @endif
                                {{ $language->name }}
                            </a>
                        @empty
                            <span class="list-group-item">العربية</span>
                        @endforelse
                    </div>
                </div>
            </div>

            <div class="dropdown d-inline-block">
                <button type="button" class="btn btn-dual" id="page-header-notifications-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="الإشعارات" title="الإشعارات">
                    <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                        <path d="M10 21h4"/>
                    </svg>
                    <span class="badge badge-secondary badge-pill">{{ (int) ($notifications_count ?? 0) }}</span>
                </button>
                <div class="dropdown-menu dropdown-menu-lg dropdown-menu-right p-0" aria-labelledby="page-header-notifications-dropdown">
                    <div class="bg-primary rounded-top font-w600 text-white text-center p-3">الإشعارات</div>
                    <ul class="nav-items my-2">
                        @forelse (($notifications ?? collect())->take(4) as $notif)
                            <li @if((string) $notif->viewed === '0') style="background-color:#f7f8f9" @endif>
                                <a class="text-dark media py-2" href="{{ $isAdmin ? route('admin.user-notifications.show', $notif->id) : route('user.user-notifications.show', $notif->id) }}">
                                    <div class="mx-3 d-flex align-items-center">
                                        <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                                            <path d="M10 21h4"/>
                                        </svg>
                                    </div>
                                    <div class="media-body font-size-sm pr-2">
                                        <div class="font-w600">{{ $notif->subject }}</div>
                                        <div class="text-muted font-italic">{{ method_exists($notif, 'getTime') ? $notif->getTime() : $notif->created_at }}</div>
                                    </div>
                                </a>
                            </li>
                        @empty
                            <li class="p-3 text-center text-muted">لا توجد إشعارات جديدة</li>
                        @endforelse
                    </ul>
                    <div class="p-2 border-top">
                        <a class="btn btn-light btn-block text-center" href="{{ $isAdmin ? route('admin.user-notifications.index') : route('user.user-notifications.index') }}">
                            <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/>
                                <circle cx="12" cy="12" r="2.5"/>
                            </svg>
                            عرض الكل
                        </a>
                    </div>
                </div>
            </div>

            <div class="dropdown d-inline-block">
                <button type="button" class="btn btn-dual" id="page-header-user-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="الحساب" title="الحساب">
                    <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>
                    </svg>
                    <svg class="yd-header-icon yd-header-chevron d-none d-sm-inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="m7 10 5 5 5-5"/>
                    </svg>
                </button>
                <div class="dropdown-menu dropdown-menu-right p-0" aria-labelledby="page-header-user-dropdown">
                    <div class="bg-primary rounded-top font-w600 text-white text-center p-3">
                        {{ $currentUser ? trim(($currentUser->firstname ?? '').' '.($currentUser->lastname ?? '')) : 'الحساب' }}
                    </div>
                    <div class="p-2">
                        <a class="dropdown-item d-flex align-items-center" href="{{ $isAdmin ? route('admin.profil') : route('user.profil') }}">
                            <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="12" cy="8" r="4"/>
                                <path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>
                            </svg>
                            الملف الشخصي
                        </a>
                        <div role="separator" class="dropdown-divider"></div>
                        <a class="dropdown-item admin-logout d-flex align-items-center" href="#">
                            <svg class="yd-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M10 17l5-5-5-5M15 12H3"/>
                                <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>
                            </svg>
                            تسجيل الخروج
                            <form action="{{ $isAdmin ? route('admin.logout') : route('logout') }}" method="post">@csrf</form>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>
