@extends('layouts.admin')

@section('content')
<main id="main-container" class="yd-funds-page" dir="rtl">
    @php
        $methods = $paymentMethods instanceof \Illuminate\Support\Collection ? $paymentMethods : collect($paymentMethods);
        $selected = $methods->firstWhere('name', 'Vodafone Cash') ?: $methods->first();
        $vodafoneNumber = '01205323440';
        $instapayAccount = 'menna_206@instapay';
        $exchangeRate = \App\Support\YellowDuckMoney::exchangeRate();
        $instapayQrData = '';
        $instapayQrDataPath = public_path('images/instapay-qr-data.txt');
        if (is_file($instapayQrDataPath)) {
            $instapayQrData = trim((string) @file_get_contents($instapayQrDataPath));
        }
    @endphp

    <section class="yd-funds-hero">
        <div>
            <span>إضافة رصيد</span>
            <h1>حوّل بأمان وسيتم مراجعة الإيداع من الأدمن</h1>
            <p>كل {{ number_format($exchangeRate, 0) }} جنيه مصري يتم اعتمادها تضيف 1 دولار إلى رصيد حسابك. الرصيد يضاف بعد اعتماد الأدمن.</p>
        </div>
        <a href="{{ route('user.transactions.index') }}">سجل المدفوعات</a>
    </section>

    @if(session('success'))
        <div class="yd-funds-alert success">{{ session('success') }}</div>
    @endif

    @if($errors->any())
        <div class="yd-funds-alert error">
            <strong>راجع البيانات التالية:</strong>
            <ul>
                @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    @if($methods->isEmpty())
        <section class="yd-funds-empty">لا توجد طرق دفع مفعلة الآن. يمكن للأدمن تفعيلها من لوحة الإدارة.</section>
    @else
        <section class="yd-funds-grid">
            <aside class="yd-payment-methods" aria-label="طرق الدفع">
                <h2>اختر طريقة الدفع</h2>
                @foreach($methods as $method)
                    @php $isActive = $selected && $method->id === $selected->id; @endphp
                    <button type="button" class="{{ $isActive ? 'active' : '' }}" data-method="{{ $method->id }}">
                        <img src="{{ asset('images/' . $method->image) }}" alt="{{ $method->name }}">
                        <span>{{ $method->name }}</span>
                        <small>من {{ number_format((float) $method->min, 0) }} إلى {{ number_format((float) $method->max, 0) }} ج.م</small>
                    </button>
                @endforeach
            </aside>

            <section class="yd-payment-panels">
                @foreach($methods as $method)
                    @php
                        $lowerName = strtolower($method->name);
                        $isVodafone = stripos($lowerName, 'vodafone') !== false;
                        $isInstapay = stripos($lowerName, 'instapay') !== false || stripos($lowerName, 'insta') !== false;
                        $qrValue = trim((string) $method->api_key);
                        $showImageQr = $qrValue && preg_match('/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i', $qrValue);
                    @endphp
                    <article class="yd-payment-panel {{ $selected && $method->id === $selected->id ? 'active' : '' }}" data-panel="{{ $method->id }}">
                        <div class="yd-payment-head">
                            <div>
                                <span>طريقة الدفع</span>
                                <h2>{{ $method->name }}</h2>
                            </div>
                            <img src="{{ asset('images/' . $method->image) }}" alt="{{ $method->name }}">
                        </div>

                        <div class="yd-payment-instructions">
                            @if($isVodafone)
                                <div class="yd-wallet-number">
                                    <small>رقم فودافون كاش</small>
                                    <strong>{{ $vodafoneNumber }}</strong>
                                </div>
                                <p>حوّل المبلغ على الرقم الموضح ثم أدخل بيانات التحويل وأرفق صورة الإيصال.</p>
                            @elseif($isInstapay)
                                <div class="yd-qr-box">
                                    @if($instapayQrData)
                                        <img src="{{ $instapayQrData }}" alt="InstaPay QR">
                                    @elseif($showImageQr)
                                        <img src="{{ stripos($qrValue, 'http') === 0 ? $qrValue : asset('images/' . ltrim($qrValue, '/')) }}" alt="InstaPay QR">
                                    @else
                                        <div><span>QR إنستا باي غير متاح</span></div>
                                    @endif
                                </div>
                                <div class="yd-wallet-number yd-instapay-destination">
                                    <small>حساب InstaPay</small>
                                    <strong>{{ $instapayAccount }}</strong>
                                </div>
                                @if($qrValue && !$showImageQr)
                                    <a class="yd-payment-link" href="{{ $qrValue }}" target="_blank" rel="noopener">فتح رابط InstaPay</a>
                                @endif
                                <p>{{ $method->client_id ?: 'استخدم QR أو حوّل إلى حساب إنستا باي الموضح ثم أرسل بيانات العملية.' }}</p>
                            @endif

                            <ul>
                                <li>الحد الأدنى: {{ number_format((float) $method->min, 0) }} ج.م</li>
                                <li>الحد الأقصى: {{ number_format((float) $method->max, 0) }} ج.م</li>
                                <li>رسوم الطريقة: {{ number_format((float) $method->fee, 2) }}%</li>
                                <li>سعر التحويل: 1 دولار = {{ number_format($exchangeRate, 0) }} ج.م</li>
                            </ul>
                        </div>

                        <form class="yd-manual-payment-form" action="{{ route('user.manual-deposit') }}" method="post" enctype="multipart/form-data" novalidate>
                            @csrf
                            <input type="hidden" name="method_id" value="{{ $method->id }}">

                            <section class="yd-deposit-form-card">
                                <div class="yd-deposit-form-title">
                                    <div>
                                        <small>الخطوة الأخيرة</small>
                                        <h3>بيانات التحويل</h3>
                                    </div>
                                    <span>جميع الحقول مطلوبة</span>
                                </div>

                                <div class="yd-manual-fields">
                                    <label class="yd-form-field">
                                        <span>رقم الهاتف الذي تم التحويل منه</span>
                                        <input type="text" inputmode="tel" autocomplete="tel" name="sender_phone" value="{{ old('sender_phone') }}" placeholder="01000000000" required>
                                    </label>
                                    <label class="yd-form-field">
                                        <span>المبلغ بالجنيه المصري</span>
                                        <input class="yd-egp-amount" name="amount" type="number" inputmode="decimal" step="0.01" min="{{ $method->min }}" max="{{ $method->max }}" value="{{ old('amount') }}" placeholder="0.00" required>
                                    </label>
                                </div>

                                <div class="yd-credit-preview" data-rate="{{ $exchangeRate }}">
                                    <span>الرصيد المتوقع بعد الاعتماد</span>
                                    <strong>$0.0000</strong>
                                </div>

                                <label class="yd-proof-field">
                                    <span>صورة إثبات التحويل</span>
                                    <div class="yd-proof-upload">
                                        <input class="yd-proof-input" type="file" name="proof" accept="image/jpeg,image/png,image/webp" required>
                                        <div class="yd-proof-icon">▣</div>
                                        <div class="yd-proof-copy">
                                            <strong>اضغط لاختيار صورة الإيصال</strong>
                                            <small>JPG أو PNG أو WEBP — حتى 5MB</small>
                                            <span class="yd-proof-filename">لم يتم اختيار صورة بعد</span>
                                        </div>
                                        <img class="yd-proof-preview" alt="معاينة إثبات التحويل" hidden>
                                    </div>
                                </label>

                                <div class="yd-review-strip">
                                    <span>✓ الطلب يظل قيد المراجعة</span>
                                    <span>✓ الأدمن يرى الحساب المحول إليه</span>
                                    <span>✓ الرصيد يضاف بعد الاعتماد فقط</span>
                                </div>
                            </section>

                            <button class="yd-submit-deposit" type="submit">
                                <span>إرسال طلب الإيداع</span>
                                <small>لن يتم إضافة الرصيد قبل مراجعة الإثبات</small>
                            </button>
                        </form>
                    </article>
                @endforeach
            </section>

            <aside class="yd-funds-help">
                <h2>قبل الإرسال</h2>
                <p>تأكد أن المبلغ والرقم مطابقان لإيصال التحويل.</p>
                <ul>
                    <li>أدخل نفس الرقم الذي تم التحويل منه.</li>
                    <li>اكتب المبلغ كما ظهر في الإيصال.</li>
                    <li>ارفق صورة واضحة وكاملة للإيصال.</li>
                </ul>
            </aside>
        </section>
    @endif
</main>

<style>
.yd-funds-alert.error ul{margin:8px 0 0;padding-right:20px}.yd-funds-alert.error li{margin:3px 0}
.yd-manual-payment-form{display:grid;gap:14px;margin-top:20px}
.yd-deposit-form-card{padding:20px;border:1px solid #e4e7ec;border-radius:14px;background:#fff;box-shadow:0 10px 28px rgba(23,25,31,.05)}
.yd-deposit-form-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #eef0f3}
.yd-deposit-form-title small{display:block;color:#8a6500;font-weight:900}.yd-deposit-form-title h3{margin:3px 0 0;font-size:20px;font-weight:950}.yd-deposit-form-title>span{padding:7px 10px;border-radius:999px;background:#fff7d6;color:#705a09;font-size:11px;font-weight:900}
.yd-manual-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.yd-form-field{display:grid;gap:8px;margin:0;min-width:0}.yd-form-field>span,.yd-proof-field>span{font-size:12px;font-weight:900;color:#343a45}
.yd-form-field input{box-sizing:border-box;width:100%;height:54px;padding:0 15px;border:1px solid #dfe3ea;border-radius:10px;background:#fbfcfd;color:#17191f;font:inherit;font-size:15px;font-weight:800;text-align:right}
.yd-form-field input::placeholder{color:#9ca3af;font-weight:600}.yd-form-field input:focus{outline:0;border-color:#f7c51e;background:#fff;box-shadow:0 0 0 3px rgba(247,197,30,.14)}
.yd-credit-preview{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:11px 13px;border-radius:10px;background:#f6f7f9;border:1px solid #e7e9ee}.yd-credit-preview span{color:#68707e;font-size:12px;font-weight:800}.yd-credit-preview strong{font-size:16px;color:#17191f}
.yd-proof-field{display:grid;gap:8px;margin:16px 0 0}.yd-proof-upload{position:relative;display:grid;grid-template-columns:46px minmax(0,1fr) 74px;align-items:center;gap:12px;min-height:94px;padding:14px;border:1.5px dashed #ccd2db;border-radius:12px;background:#fafbfc;overflow:hidden;cursor:pointer}.yd-proof-upload:hover,.yd-proof-upload:focus-within{border-color:#e4b500;background:#fffdf5;box-shadow:0 0 0 3px rgba(247,197,30,.10)}
.yd-proof-input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:3}.yd-proof-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:10px;background:#f7c51e;color:#17191f;font-size:20px;font-weight:900}.yd-proof-copy{display:grid;gap:3px}.yd-proof-copy strong{font-size:13px}.yd-proof-copy small{font-size:11px;color:#7a828e}.yd-proof-filename{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#49505b;font-size:11px;font-weight:800}.yd-proof-preview{width:68px;height:68px;object-fit:cover;border-radius:9px;border:1px solid #e2e5ea;background:#fff}
.yd-review-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.yd-review-strip span{display:flex;align-items:center;justify-content:center;min-height:38px;padding:7px 9px;border-radius:9px;background:#f7f8fa;color:#555d68;font-size:11px;font-weight:850;text-align:center}
.yd-submit-deposit{display:grid;place-items:center;gap:2px;width:100%;min-height:58px;padding:10px 16px;border:0;border-radius:12px;background:#f7c51e;color:#17191f;cursor:pointer;box-shadow:0 10px 22px rgba(247,197,30,.2)}.yd-submit-deposit span{font-size:15px;font-weight:950}.yd-submit-deposit small{font-size:10px;font-weight:800;opacity:.72}.yd-submit-deposit:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(247,197,30,.28)}.yd-submit-deposit:disabled{opacity:.65;cursor:wait;transform:none}
.yd-instapay-destination{margin-top:12px}
@media(max-width:767px){.yd-deposit-form-card{padding:15px}.yd-deposit-form-title{align-items:flex-start}.yd-manual-fields{grid-template-columns:1fr}.yd-review-strip{grid-template-columns:1fr}.yd-proof-upload{grid-template-columns:42px minmax(0,1fr)}.yd-proof-preview{grid-column:1/-1;width:100%;height:150px}.yd-deposit-form-title>span{display:none}}
</style>
@endsection

@section('scripts')
<script>
(function () {
    document.querySelectorAll('.yd-payment-methods [data-method]').forEach(function (button) {
        button.addEventListener('click', function () {
            var id = button.getAttribute('data-method');
            document.querySelectorAll('.yd-payment-methods [data-method]').forEach(function (item) { item.classList.toggle('active', item === button); });
            document.querySelectorAll('.yd-payment-panel[data-panel]').forEach(function (panel) { panel.classList.toggle('active', panel.getAttribute('data-panel') === id); });
        });
    });

    document.querySelectorAll('.yd-egp-amount').forEach(function (input) {
        var preview = input.closest('.yd-deposit-form-card').querySelector('.yd-credit-preview');
        var value = preview.querySelector('strong');
        var updatePreview = function () {
            var rate = Number(preview.dataset.rate || 55);
            var amount = Number(input.value || 0);
            value.textContent = '$' + (amount / rate).toFixed(4);
        };
        input.addEventListener('input', updatePreview);
        updatePreview();
    });

    document.querySelectorAll('.yd-proof-input').forEach(function (input) {
        input.addEventListener('change', function () {
            var box = input.closest('.yd-proof-upload');
            var holder = box.querySelector('.yd-proof-filename');
            var preview = box.querySelector('.yd-proof-preview');
            var file = input.files && input.files[0] ? input.files[0] : null;
            holder.textContent = file ? file.name : 'لم يتم اختيار صورة بعد';
            if (!file) { preview.hidden = true; preview.removeAttribute('src'); return; }
            var reader = new FileReader();
            reader.onload = function (event) { preview.src = event.target.result; preview.hidden = false; };
            reader.readAsDataURL(file);
        });
    });

    document.querySelectorAll('.yd-manual-payment-form').forEach(function (form) {
        form.addEventListener('submit', function () {
            if (!form.checkValidity()) { form.reportValidity(); return; }
            var button = form.querySelector('.yd-submit-deposit');
            button.disabled = true;
            button.querySelector('span').textContent = 'جاري إرسال الطلب...';
        });
    });
})();
</script>
@endsection
