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
        <div class="yd-funds-alert error">{{ $errors->first() }}</div>
    @endif

    @if($methods->isEmpty())
        <section class="yd-funds-empty">
            لا توجد طرق دفع مفعلة الآن. يمكن للأدمن تفعيلها من لوحة الإدارة.
        </section>
    @else
        <section class="yd-funds-grid">
            <aside class="yd-payment-methods" aria-label="طرق الدفع">
                <h2>اختر طريقة الدفع</h2>
                @foreach($methods as $method)
                    @php
                        $isActive = $selected && $method->id === $selected->id;
                    @endphp
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
                        $destination = $isVodafone ? $vodafoneNumber : ($isInstapay ? $instapayAccount : trim((string) $method->private_key));
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
                                <p>حوّل المبلغ على الرقم الموضح، ثم اكتب رقم الهاتف الذي تم التحويل منه والمبلغ بالجنيه بالضبط.</p>
                            @elseif($isInstapay)
                                <div class="yd-qr-box">
                                    @if($instapayQrData)
                                        <img src="{{ $instapayQrData }}" alt="InstaPay QR">
                                    @elseif($showImageQr)
                                        <img src="{{ stripos($qrValue, 'http') === 0 ? $qrValue : asset('images/' . ltrim($qrValue, '/')) }}" alt="InstaPay QR">
                                    @else
                                        <div>
                                            <i class="fa fa-qrcode"></i>
                                            <span>QR إنستا باي غير متاح</span>
                                        </div>
                                    @endif
                                </div>
                                <div class="yd-wallet-number yd-instapay-destination">
                                    <small>حساب InstaPay</small>
                                    <strong>{{ $instapayAccount }}</strong>
                                </div>
                                @if($qrValue && !$showImageQr)
                                    <a class="yd-payment-link" href="{{ $qrValue }}" target="_blank" rel="noopener">فتح رابط InstaPay</a>
                                @endif
                                <p>{{ $method->client_id ?: 'استخدم QR أو حوّل إلى حساب إنستا باي الموضح، ثم اكتب بيانات التحويل قبل الإرسال.' }}</p>
                            @else
                                <p>{{ $method->client_id ?: 'نفذ التحويل بالطريقة المختارة ثم أرسل بيانات العملية للمراجعة.' }}</p>
                            @endif

                            <ul>
                                <li>الحد الأدنى: {{ number_format((float) $method->min, 0) }} ج.م</li>
                                <li>الحد الأقصى: {{ number_format((float) $method->max, 0) }} ج.م</li>
                                <li>رسوم الطريقة: {{ number_format((float) $method->fee, 2) }}%</li>
                                <li>سعر التحويل: 1 دولار = {{ number_format($exchangeRate, 0) }} ج.م</li>
                            </ul>
                        </div>

                        <form class="yd-manual-payment-form" action="{{ url('/user/add-funds/manual') }}" method="post" enctype="multipart/form-data">
                            @csrf
                            <input type="hidden" name="method_id" value="{{ $method->id }}">

                            <div class="yd-manual-fields">
                                <label>
                                    <span>رقم الهاتف الذي تم التحويل منه</span>
                                    <input type="text" inputmode="tel" name="sender_phone" value="{{ old('sender_phone') }}" placeholder="مثال: 01000000000" required>
                                </label>
                                <label>
                                    <span>المبلغ بالجنيه المصري</span>
                                    <input class="yd-egp-amount" name="amount" type="number" step="0.01" min="{{ $method->min }}" max="{{ $method->max }}" value="{{ old('amount') }}" placeholder="0.00" required>
                                    <small class="yd-credit-preview" data-rate="{{ $exchangeRate }}">سيُضاف إلى رصيدك $0.0000 بعد الاعتماد</small>
                                </label>
                            </div>

                            <label class="yd-proof-field">
                                <span>صورة إثبات التحويل</span>
                                <div class="yd-proof-upload">
                                    <input class="yd-proof-input" type="file" name="proof" accept="image/jpeg,image/png,image/webp" required>
                                    <div class="yd-proof-copy">
                                        <i class="fa fa-image"></i>
                                        <strong>اختر صورة إيصال التحويل</strong>
                                        <small>JPG أو PNG أو WEBP — بحد أقصى 5MB</small>
                                    </div>
                                    <span class="yd-proof-filename">لم يتم اختيار صورة بعد</span>
                                </div>
                            </label>

                            <div class="yd-payment-review-note">
                                <i class="fa fa-shield-alt"></i>
                                سيتم إرسال الطريقة والمبلغ والرقم وصورة الإثبات إلى الأدمن للمراجعة قبل إضافة الرصيد.
                            </div>

                            <button type="submit">
                                <i class="fa fa-paper-plane"></i>
                                إرسال طلب الإيداع
                            </button>
                        </form>
                    </article>
                @endforeach
            </section>

            <aside class="yd-funds-help">
                <h2>مهم قبل الإيداع</h2>
                <p>لا يتم إضافة الرصيد تلقائيًا للطرق اليدوية. الأدمن يراجع العملية وصورة الإثبات ثم يعتمدها.</p>
                <ul>
                    <li>اكتب نفس الرقم الذي تم التحويل منه.</li>
                    <li>أدخل المبلغ كما حولته بدون تقريب.</li>
                    <li>ارفق لقطة واضحة لإيصال التحويل.</li>
                    <li>سيظهر للأدمن الحساب الذي تم التحويل إليه للمطابقة.</li>
                </ul>
            </aside>
        </section>
    @endif
</main>

<style>
.yd-manual-payment-form{display:grid;gap:16px;margin-top:18px}
.yd-manual-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
.yd-manual-payment-form label{display:grid;gap:8px;margin:0;min-width:0;color:#343a45;font-weight:850}
.yd-manual-payment-form label>span{font-size:13px}
.yd-manual-fields input{box-sizing:border-box;width:100%;height:56px;min-height:56px;padding:0 15px;border:1px solid #dfe3ea;border-radius:10px;background:#fff;color:#17191f;font:inherit;line-height:56px}
.yd-manual-fields input:focus,.yd-proof-upload:focus-within{outline:0;border-color:#f7c51e;box-shadow:0 0 0 3px rgba(247,197,30,.16)}
.yd-credit-preview{display:block;min-height:18px;color:#8a6500;font-size:12px;font-weight:800}
.yd-proof-field{grid-column:1/-1}
.yd-proof-upload{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px;min-height:92px;padding:14px 16px;border:1px dashed #cfd5de;border-radius:10px;background:#fafbfc;overflow:hidden}
.yd-proof-input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:2}
.yd-proof-copy{display:grid;grid-template-columns:42px minmax(0,1fr);column-gap:12px;align-items:center}
.yd-proof-copy i{grid-row:1/3;width:42px;height:42px;display:grid;place-items:center;border-radius:9px;background:#f7c51e;color:#17191f;font-size:18px}
.yd-proof-copy strong{font-size:14px}.yd-proof-copy small{color:#68707e;font-size:11px}
.yd-proof-filename{max-width:260px;padding:8px 10px;border-radius:8px;background:#fff;border:1px solid #e4e8ee;color:#68707e;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yd-payment-review-note{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border-radius:10px;background:#fff8d9;border:1px solid #f4df83;color:#66520c;font-size:12px;font-weight:800;line-height:1.7}
.yd-instapay-destination{margin-top:12px}
@media(max-width:767px){.yd-manual-fields{grid-template-columns:1fr}.yd-proof-upload{grid-template-columns:1fr}.yd-proof-filename{max-width:100%}}
</style>
@endsection

@section('scripts')
<script>
(function () {
    document.querySelectorAll('.yd-payment-methods [data-method]').forEach(function (button) {
        button.addEventListener('click', function () {
            var id = button.getAttribute('data-method');
            document.querySelectorAll('.yd-payment-methods [data-method]').forEach(function (item) {
                item.classList.toggle('active', item === button);
            });
            document.querySelectorAll('.yd-payment-panel[data-panel]').forEach(function (panel) {
                panel.classList.toggle('active', panel.getAttribute('data-panel') === id);
            });
        });
    });

    document.querySelectorAll('.yd-egp-amount').forEach(function (input) {
        var preview = input.parentElement.querySelector('.yd-credit-preview');
        var updatePreview = function () {
            var rate = Number(preview.dataset.rate || 55);
            var amount = Number(input.value || 0);
            preview.textContent = 'سيُضاف إلى رصيدك $' + (amount / rate).toFixed(4) + ' بعد الاعتماد';
        };
        input.addEventListener('input', updatePreview);
        updatePreview();
    });

    document.querySelectorAll('.yd-proof-input').forEach(function (input) {
        input.addEventListener('change', function () {
            var holder = input.closest('.yd-proof-upload').querySelector('.yd-proof-filename');
            holder.textContent = input.files && input.files[0] ? input.files[0].name : 'لم يتم اختيار صورة بعد';
        });
    });
})();
</script>
@endsection
