<!-- ***** Preloader Start ***** -->
<div id="preloader" aria-hidden="true">
    <div class="jumper"><div></div><div></div><div></div></div>
</div>
<!-- ***** Preloader End ***** -->

<header class="header-area header-sticky yd-public-header">
    <div class="container">
        <div class="row">
            <div class="col-12">
                <nav class="main-nav" aria-label="Primary navigation">
                    <a href="{{route('welcome')}}" class="logo yellow-duck-lockup yd-public-logo" aria-label="البطة الصفرا لخدمات السوشيال ميديا">
                        <img src="{{asset('brand/yellow-duck.svg')}}" alt="البطة الصفرا">
                        <span class="yellow-duck-brand">البطة الصفرا<small>خدمات السوشيال ميديا</small></span>
                    </a>

                    <ul class="nav">
                        <li><a class="link active" href="@if($links) {{route('welcome').'#welcome'}}@else{{'#welcome'}}@endif">{{Helper::getLang('Home')}}</a></li>
                        <li><a class="link services" href="@if($links) {{route('welcome').'#services'}}@else{{'#services'}}@endif">{{Helper::getLang('Services')}}</a></li>
                        <li><a class="link" href="@if($links) {{route('welcome').'#features'}}@else{{'#features'}}@endif">{{Helper::getLang('Features')}}</a></li>
                        <li><a class="link" href="@if($links) {{route('welcome').'#testimonials'}}@else{{'#testimonials'}}@endif">{{Helper::getLang('Testimonials')}}</a></li>
                        <li><a class="link" href="@if($links) {{route('welcome').'#contact-us'}}@else{{'#contact-us'}}@endif">{{Helper::getLang('Contact Us')}}</a></li>

                        @if (Helper::settings('user_login') === 'on')
                            <li class="login"><a href="{{route('login')}}">{{Helper::getLang('login')}}</a></li>
                        @endif
                        @if (Helper::settings('user_registration') === 'on')
                            <li class="try"><a href="{{route('register')}}">{{Helper::getLang('sign up')}}</a></li>
                        @endif

                        <li class="yd-language-item">
                            <div class="dropdown">
                                <button class="dropdown-toggle yd-language-toggle" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" type="button">
                                    <img src="{{asset('images/'.$lang->image)}}" alt="{{$lang->name}}" width="28" height="28">
                                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                                </button>
                                <div class="dropdown-menu">
                                    @foreach ($languages as $language)
                                        <a class="dropdown-item" href="{{route('languages.set-language',$language->id)}}">
                                            <img src="{{asset('images/'.$language->image)}}" alt="" width="20" height="20">
                                            <span>{{$language->name}}</span>
                                        </a>
                                    @endforeach
                                </div>
                            </div>
                        </li>
                    </ul>

                    <a class="menu-trigger" aria-label="Open navigation menu"><span>Menu</span></a>
                </nav>
            </div>
        </div>
    </div>
</header>
