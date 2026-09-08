<footer class="yd-footer">
    <div class="container">
        <div class="yd-footer-grid">
            <div class="yd-footer-brand">
                <a href="{{route('welcome')}}" class="yellow-duck-lockup" aria-label="البطة الصفرا لخدمات السوشيال ميديا">
                    <img src="{{asset('brand/yellow-duck.svg')}}" alt="البطة الصفرا">
                    <span class="yellow-duck-brand">البطة الصفرا<small>خدمات السوشيال ميديا</small></span>
                </a>
                <p>{{Helper::settings('website_desc') ?: 'منصة سهلة وسريعة لإدارة وطلب خدمات السوشيال ميديا من مكان واحد.'}}</p>
            </div>

            <div class="yd-footer-links">
                <a href="{{route('welcome')}}#services">{{Helper::getLang('Services')}}</a>
                <a href="{{route('welcome')}}#features">{{Helper::getLang('Features')}}</a>
                <a href="{{route('terms-conditions')}}">{{Helper::getLang('Terms & Conditions')}}</a>
            </div>

            <div class="yd-footer-social" aria-label="Social links">
                @if(Helper::settings('facebook_link'))
                    <a href="{{Helper::settings('facebook_link')}}" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                @endif
                @if(Helper::settings('twitter_link'))
                    <a href="{{Helper::settings('twitter_link')}}" target="_blank" rel="noopener" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                @endif
                @if(Helper::settings('linkedin_link'))
                    <a href="{{Helper::settings('linkedin_link')}}" target="_blank" rel="noopener" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                @endif
                @if(Helper::settings('instagram_link'))
                    <a href="{{Helper::settings('instagram_link')}}" target="_blank" rel="noopener" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                @endif
            </div>
        </div>

        <div class="yd-footer-bottom">
            <span>© {{Date('Y')}} {{Helper::settings('website_title') ?: 'البطة الصفرا لخدمات السوشيال ميديا'}}</span>
            <span class="yd-footer-badge">Yellow Duck SMM</span>
        </div>
    </div>
</footer>
