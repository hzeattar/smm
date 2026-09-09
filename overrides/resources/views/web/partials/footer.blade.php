<footer class="yd-footer">
    <div class="container">
        <div class="yd-footer-grid">
            <div class="yd-footer-brand">
                <a href="{{ route('welcome') }}" class="yellow-duck-lockup" aria-label="البطة الصفرا لخدمات السوشيال ميديا">
                    <img src="{{ asset('brand/yellow-duck.svg') }}" alt="البطة الصفرا">
                    <span class="yellow-duck-brand">البطة الصفرا<small>خدمات السوشيال ميديا</small></span>
                </a>
                <p>{{ $websiteDesc ?? 'منصة سهلة وسريعة لإدارة وطلب خدمات السوشيال ميديا من مكان واحد.' }}</p>
            </div>

            <div class="yd-footer-links">
                <a href="{{ route('welcome') }}#services">الخدمات</a>
                <a href="{{ route('welcome') }}#features">المميزات</a>
                <a href="{{ route('terms-conditions') }}">الشروط والأحكام</a>
            </div>

            <div class="yd-footer-social" aria-label="Social links">
                @if(!empty($socialLinks['facebook']))
                    <a href="{{ $socialLinks['facebook'] }}" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                @endif
                @if(!empty($socialLinks['twitter']))
                    <a href="{{ $socialLinks['twitter'] }}" target="_blank" rel="noopener" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                @endif
                @if(!empty($socialLinks['linkedin']))
                    <a href="{{ $socialLinks['linkedin'] }}" target="_blank" rel="noopener" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                @endif
                @if(!empty($socialLinks['instagram']))
                    <a href="{{ $socialLinks['instagram'] }}" target="_blank" rel="noopener" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                @endif
            </div>
        </div>

        <div class="yd-footer-bottom">
            <span>© {{ date('Y') }} {{ $websiteTitle ?? 'البطة الصفرا لخدمات السوشيال ميديا' }}</span>
            <span class="yd-footer-badge">Yellow Duck SMM</span>
        </div>
    </div>
</footer>
