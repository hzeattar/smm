@extends('layouts.app')

@section('content')
@include('web.partials.header',['links'=>false])

<main class="yd-landing">
    <section class="yd-hero" id="welcome">
        <div class="container">
            <div class="yd-hero-grid">
                <div>
                    <span class="yd-kicker">🐥 منصة عربية لخدمات السوشيال ميديا</span>
                    <h1>كل خدمات السوشيال ميديا في مكان واحد مع <span>البطة الصفرا</span></h1>
                    <p>اطلب المتابعين والمشاهدات والتفاعلات والخدمات الرقمية بسهولة، تابع طلباتك من لوحة واحدة، واربط مزودي الخدمات والدفع بطريقة منظمة وقابلة للتوسع.</p>
                    <div class="yd-hero-actions">
                        @if (Helper::settings('user_registration') === 'on')
                            <a class="yd-primary-cta" href="{{ route('register') }}">ابدأ الآن</a>
                        @endif
                        @if (Helper::settings('user_login') === 'on')
                            <a class="yd-secondary-cta" href="{{ route('login') }}">عندي حساب</a>
                        @endif
                    </div>
                    <div class="yd-trust-row">
                        <span class="yd-trust-pill">طلب سريع</span>
                        <span class="yd-trust-pill">متابعة حالة الطلب</span>
                        <span class="yd-trust-pill">مزودون متعددون</span>
                        <span class="yd-trust-pill">دفع مرن</span>
                    </div>
                </div>

                <aside class="yd-hero-card" aria-label="مميزات المنصة">
                    <img src="{{ asset('brand/yellow-duck.svg') }}" alt="البطة الصفرا">
                    <h3>لوحة واحدة لكل احتياجاتك</h3>
                    <p>اختر الخدمة، أضف الرابط والكمية، وتابع الطلب من لحظة الإنشاء وحتى الإكمال.</p>
                    <div class="yd-stat-grid">
                        <div class="yd-stat"><strong>24/7</strong><span>المنصة متاحة</span></div>
                        <div class="yd-stat"><strong>API</strong><span>مزودون متعددون</span></div>
                        <div class="yd-stat"><strong>سريع</strong><span>إنشاء الطلبات</span></div>
                    </div>
                </aside>
            </div>
        </div>
    </section>

    <section class="yd-section" id="services">
        <div class="container">
            <div class="yd-section-heading">
                <span class="eyebrow">الخدمات</span>
                <h2>الخدمات الأكثر طلبًا</h2>
                <p>المنصة جاهزة لعرض خدمات مزودي الـSMM الذين سنربطهم، ويمكن إدارة الأسعار والهامش والخدمات من لوحة الإدارة.</p>
            </div>
            <div class="yd-service-grid">
                <article class="yd-service-card"><div class="yd-service-icon">📸</div><h3>Instagram</h3><p>متابعون، إعجابات، مشاهدات، تفاعل وخدمات إضافية حسب المزود.</p></article>
                <article class="yd-service-card"><div class="yd-service-icon">🎵</div><h3>TikTok</h3><p>مشاهدات، متابعون، إعجابات وتفاعل على المقاطع والحسابات.</p></article>
                <article class="yd-service-card"><div class="yd-service-icon">▶️</div><h3>YouTube</h3><p>مشاهدات، إعجابات، مشتركين وخدمات نمو للقنوات والمحتوى.</p></article>
                <article class="yd-service-card"><div class="yd-service-icon">📘</div><h3>Facebook</h3><p>تفاعل الصفحات والمنشورات والمتابعين والمشاهدات.</p></article>
                <article class="yd-service-card"><div class="yd-service-icon">✈️</div><h3>Telegram</h3><p>أعضاء، مشاهدات وتفاعل للقنوات والمجموعات وفق الخدمات المتاحة.</p></article>
                <article class="yd-service-card"><div class="yd-service-icon">⚡</div><h3>خدمات إضافية</h3><p>المنصة قابلة لإضافة أي منصة أو نوع خدمة يدعمه مزود الـAPI.</p></article>
            </div>
        </div>
    </section>

    <section class="yd-section yd-section-alt" id="features">
        <div class="container">
            <div class="yd-section-heading">
                <span class="eyebrow">ليه البطة الصفرا؟</span>
                <h2>تجربة بسيطة وسريعة</h2>
                <p>ركزنا على إن العميل يقدر يطلب ويتابع بدون تعقيد، وفي نفس الوقت تفضل الإدارة مرنة للمزودين والأسعار والمدفوعات.</p>
            </div>
            <div class="yd-feature-grid">
                <article class="yd-feature-card"><div class="yd-feature-icon">🧾</div><h3>طلبات واضحة</h3><p>كل طلب له خدمة وكمية وحالة وتكلفة ويمكن متابعته من الحساب.</p></article>
                <article class="yd-feature-card"><div class="yd-feature-icon">🔌</div><h3>ربط مزودي API</h3><p>دعم مزودين متعددين ومزامنة الخدمات والأسعار حسب البنية الحالية للسكريبت.</p></article>
                <article class="yd-feature-card"><div class="yd-feature-icon">💳</div><h3>دفع مرن</h3><p>البنية قابلة لبوابات الدفع التلقائي وكذلك طرق الدفع اليدوية والمراجعة من الإدارة.</p></article>
                <article class="yd-feature-card"><div class="yd-feature-icon">📱</div><h3>متوافق مع الموبايل</h3><p>تصميم Responsive للواجهة العامة وصفحات الحساب وتسجيل الدخول.</p></article>
                <article class="yd-feature-card"><div class="yd-feature-icon">🔐</div><h3>حسابات منفصلة</h3><p>تسجيل دخول مستقل للمستخدمين ولوحة إدارة مستقلة للأدمن.</p></article>
                <article class="yd-feature-card"><div class="yd-feature-icon">📊</div><h3>إدارة مركزية</h3><p>إدارة المستخدمين والخدمات والطلبات والمزودين والمدفوعات من مكان واحد.</p></article>
            </div>
        </div>
    </section>

    <section class="yd-section">
        <div class="container">
            <div class="yd-section-heading">
                <span class="eyebrow">طريقة الاستخدام</span>
                <h2>3 خطوات فقط</h2>
            </div>
            <div class="yd-process">
                <article class="yd-step"><b>1</b><h3>أنشئ حسابك</h3><p>سجل بياناتك وادخل إلى لوحة المستخدم الخاصة بك.</p></article>
                <article class="yd-step"><b>2</b><h3>اختر الخدمة</h3><p>حدد الخدمة والكمية والرابط المطلوب تنفيذ الخدمة عليه.</p></article>
                <article class="yd-step"><b>3</b><h3>تابع الطلب</h3><p>شاهد حالة الطلب وتفاصيله مباشرة من لوحة حسابك.</p></article>
            </div>
        </div>
    </section>

    <section class="yd-section yd-section-alt" id="faq">
        <div class="container">
            <div class="yd-section-heading">
                <span class="eyebrow">F.A.Q</span>
                <h2>الأسئلة الشائعة</h2>
            </div>
            <div class="yd-faq-list">
                @forelse($faqs as $faq)
                    <article class="yd-faq-item">
                        <h3>{{ Helper::getLang($faq->question) }}</h3>
                        <div class="answer">{!! Helper::getLang($faq->answer) !!}</div>
                    </article>
                @empty
                    <article class="yd-faq-item"><h3>كيف أبدأ؟</h3><div class="answer">أنشئ حسابًا، أضف رصيدك، ثم اختر الخدمة المناسبة وأنشئ الطلب.</div></article>
                @endforelse
            </div>
        </div>
    </section>

    <section class="yd-section" id="contact-us">
        <div class="container">
            <div class="yd-contact-wrap">
                <div class="yd-contact-copy">
                    <span class="yd-kicker">الدعم</span>
                    <h3>محتاج مساعدة؟</h3>
                    <p>ابعت رسالتك من النموذج وسيتم مراجعتها من الإدارة. بعد تسجيل الدخول تقدر كمان تستخدم نظام التذاكر من حسابك.</p>
                </div>
                <div class="yd-contact-form">
                    <h3>تواصل معنا</h3>
                    @if(session()->has('send'))<div class="alert alert-success">تم إرسال رسالتك بنجاح.</div>@endif
                    <form action="{{ route('contact-us') }}" method="POST">
                        @csrf
                        <input class="form-control" name="name" type="text" placeholder="الاسم" required>
                        <input class="form-control" name="email" type="email" placeholder="البريد الإلكتروني" required>
                        <textarea class="form-control" name="body" rows="5" placeholder="اكتب رسالتك" required></textarea>
                        <button class="btn btn-primary" type="submit">إرسال الرسالة</button>
                    </form>
                </div>
            </div>
        </div>
    </section>
</main>

@include('web.partials.footer')
@endsection
