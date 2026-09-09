@php
    $isAdmin = Auth::guard('admin')->check();
    $currentUser = $isAdmin ? Auth::guard('admin')->user() : Auth::user();
@endphp
<header id="page-header">
    <div class="content-header">
        <div class="d-flex align-items-center">
            <button type="button" class="btn btn-dual" data-toggle="layout" data-action="sidebar_toggle" aria-label="فتح القائمة">
                <i class="fa fa-fw fa-bars"></i>
            </button>
        </div>

        <div class="d-flex align-items-center">
            <div class="dropdown d-inline-block">
                <button type="button" class="btn btn-dual" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="اللغة">
                    <i class="fa fa-globe"></i>
                    <i class="fa fa-fw fa-angle-down ml-1 d-none d-sm-inline-block"></i>
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
                <button type="button" class="btn btn-dual" id="page-header-notifications-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="الإشعارات">
                    <i class="fa fa-fw fa-bell"></i>
                    <span class="badge badge-secondary badge-pill">{{ (int) ($notifications_count ?? 0) }}</span>
                </button>
                <div class="dropdown-menu dropdown-menu-lg dropdown-menu-right p-0" aria-labelledby="page-header-notifications-dropdown">
                    <div class="bg-primary rounded-top font-w600 text-white text-center p-3">الإشعارات</div>
                    <ul class="nav-items my-2">
                        @forelse (($notifications ?? collect())->take(4) as $notif)
                            <li @if((string) $notif->viewed === '0') style="background-color:#f7f8f9" @endif>
                                <a class="text-dark media py-2" href="{{ $isAdmin ? route('admin.user-notifications.show', $notif->id) : route('user.user-notifications.show', $notif->id) }}">
                                    <div class="mx-3"><i class="{{ $notif->icon ?: 'fa fa-bell' }}"></i></div>
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
                            <i class="fa fa-fw fa-eye mr-1"></i> عرض الكل
                        </a>
                    </div>
                </div>
            </div>

            <div class="dropdown d-inline-block">
                <button type="button" class="btn btn-dual" id="page-header-user-dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="الحساب">
                    <i class="fa fa-fw fa-user"></i>
                    <i class="fa fa-fw fa-angle-down ml-1 d-none d-sm-inline-block"></i>
                </button>
                <div class="dropdown-menu dropdown-menu-right p-0" aria-labelledby="page-header-user-dropdown">
                    <div class="bg-primary rounded-top font-w600 text-white text-center p-3">
                        {{ $currentUser ? trim(($currentUser->firstname ?? '').' '.($currentUser->lastname ?? '')) : 'الحساب' }}
                    </div>
                    <div class="p-2">
                        <a class="dropdown-item" href="{{ $isAdmin ? route('admin.profil') : route('user.profil') }}">
                            <i class="far fa-fw fa-user mr-1"></i> الملف الشخصي
                        </a>
                        <div role="separator" class="dropdown-divider"></div>
                        <a class="dropdown-item admin-logout" href="#">
                            <i class="far fa-fw fa-arrow-alt-circle-left mr-1"></i> تسجيل الخروج
                            <form action="{{ $isAdmin ? route('admin.logout') : route('logout') }}" method="post">@csrf</form>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>
