<header class="header-area header-sticky yd-public-header">
    <div class="container">
        <div class="row">
            <div class="col-12">
                <nav class="main-nav" aria-label="التنقل الرئيسي">
                    <a href="{{ route('welcome') }}" class="logo yellow-duck-lockup yd-public-logo" aria-label="البطة الصفرا لخدمات السوشيال ميديا">
                        <img src="{{ asset('brand/yellow-duck.svg') }}" alt="البطة الصفرا">
                        <span class="yellow-duck-brand">البطة الصفرا<small>خدمات السوشيال ميديا</small></span>
                    </a>

                    <button class="yd-menu-toggle" type="button" aria-expanded="false" aria-controls="yd-main-nav">القائمة</button>

                    <ul class="nav" id="yd-main-nav">
                        <li><a class="link active" href="{{ $links ? route('welcome').'#welcome' : '#welcome' }}">الرئيسية</a></li>
                        <li><a class="link" href="{{ $links ? route('welcome').'#services' : '#services' }}">الخدمات</a></li>
                        <li><a class="link" href="{{ $links ? route('welcome').'#features' : '#features' }}">المميزات</a></li>
                        <li><a class="link" href="{{ $links ? route('welcome').'#faq' : '#faq' }}">الأسئلة الشائعة</a></li>
                        <li><a class="link" href="{{ $links ? route('welcome').'#contact-us' : '#contact-us' }}">تواصل معنا</a></li>

                        @if ($loginEnabled ?? true)
                            <li class="login"><a href="{{ route('login') }}">تسجيل الدخول</a></li>
                        @endif
                        @if ($registrationEnabled ?? true)
                            <li class="try"><a href="{{ route('register') }}">إنشاء حساب</a></li>
                        @endif

                        @if(isset($languages) && count($languages))
                            <li class="yd-language-item">
                                <div class="dropdown">
                                    <button class="yd-language-toggle dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                        <span>{{ isset($lang) && $lang ? $lang->name : 'Language' }}</span><span aria-hidden="true">▾</span>
                                    </button>
                                    <div class="dropdown-menu">
                                        @foreach ($languages as $language)
                                            <a class="dropdown-item" href="{{ route('languages.set-language', $language->id) }}">{{ $language->name }}</a>
                                        @endforeach
                                    </div>
                                </div>
                            </li>
                        @endif
                    </ul>
                </nav>
            </div>
        </div>
    </div>
</header>
