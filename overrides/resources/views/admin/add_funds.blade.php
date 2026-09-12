@extends('layouts.admin')

@section('content')
<main id="main-container" class="yd-funds-page" dir="rtl">
    @php
        $methods = $paymentMethods instanceof \Illuminate\Support\Collection ? $paymentMethods : collect($paymentMethods);
        $selected = $methods->firstWhere('name', 'Vodafone Cash') ?: $methods->first();
        $vodafoneNumber = '01205323440';
    @endphp

    <section class="yd-funds-hero">
        <div>
            <span>إضافة رصيد</span>
            <h1>حوّل بأمان وسيتم مراجعة الإيداع من الأدمن</h1>
            <p>اختر طريقة الدفع، نفذ التحويل، ثم اكتب بيانات العملية. الرصيد يضاف بعد الاعتماد من لوحة الإدارة.</p>
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
                        $name = strtolower($method->name);
                    @endphp
                    <button type="button" class="{{ $isActive ? 'active' : '' }}" data-method="{{ $method->id }}">
                        <img src="{{ asset('images/' . $method->image) }}" alt="{{ $method->name }}">
                        <span>{{ $method->name }}</span>
                        <small>من ${{ number_format((float) $method->min, 0) }} إلى ${{ number_format((float) $method->max, 0) }}</small>
                    </button>
                @endforeach
            </aside>

            <section class="yd-payment-panels">
                @foreach($methods as $method)
                    @php
                        $lowerName = strtolower($method->name);
                        $isVodafone = stripos($lowerName, 'vodafone') !== false;
                        $isInstapay = stripos($lowerName, 'instapay') !== false || stripos($lowerName, 'insta') !== false;
                        $accountValue = $isVodafone ? $vodafoneNumber : ($method->private_key ?: '');
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
                                <p>حوّل المبلغ على الرقم الموضح، ثم اكتب رقم الهاتف الذي تم التحويل منه والمبلغ بالضبط.</p>
                            @elseif($isInstapay)
                                <div class="yd-qr-box">
                                    @if($showImageQr)
                                        <img src="{{ stripos($qrValue, 'http') === 0 ? $qrValue : asset('images/' . ltrim($qrValue, '/')) }}" alt="InstaPay QR">
                                    @else
                                        <div>
                                            <i class="fa fa-qrcode"></i>
                                            <span>مكان QR إنستا باي</span>
                                            <small>يمكن رفع صورة QR لاحقًا ووضع اسمها أو رابطها من الأدمن.</small>
                                        </div>
                                    @endif
                                </div>
                                @if($qrValue && !$showImageQr)
                                    <a class="yd-payment-link" href="{{ $qrValue }}" target="_blank" rel="noopener">فتح رابط InstaPay</a>
                                @endif
                                <p>{{ $method->client_id ?: 'استخدم QR أو رابط إنستا باي، ثم اكتب بيانات التحويل قبل الإرسال.' }}</p>
                            @else
                                <p>{{ $method->client_id ?: 'نفذ التحويل بالطريقة المختارة ثم أرسل بيانات العملية للمراجعة.' }}</p>
                            @endif

                            <ul>
                                <li>الحد الأدنى: ${{ number_format((float) $method->min, 2) }}</li>
                                <li>الحد الأقصى: ${{ number_format((float) $method->max, 2) }}</li>
                                <li>رسوم الطريقة: {{ number_format((float) $method->fee, 2) }}%</li>
                            </ul>
                        </div>

                        <form class="yd-manual-payment-form" action="{{ url('/user/add-funds/manual') }}" method="post">
                            @csrf
                            <input type="hidden" name="method_id" value="{{ $method->id }}">
                            <label>
                                <span>رقم الهاتف أو الحساب الذي حوّلت منه</span>
                                <input name="sender_phone" value="{{ old('sender_phone') }}" placeholder="مثال: 01000000000">
                            </label>
                            <label>
                                <span>اسم صاحب التحويل</span>
                                <input name="sender_name" value="{{ old('sender_name') }}" placeholder="اسمك كما يظهر في التحويل">
                            </label>
                            <label>
                                <span>المبلغ بالدولار</span>
                                <input name="amount" type="number" step="0.01" min="{{ $method->min }}" max="{{ $method->max }}" value="{{ old('amount') }}" required>
                            </label>
                            <label>
                                <span>رقم العملية أو ملاحظة</span>
                                <input name="reference" value="{{ old('reference') }}" placeholder="اختياري لكنه يساعد في سرعة المراجعة">
                            </label>
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
                <p>لا يتم إضافة الرصيد تلقائيًا للطرق اليدوية. الأدمن يراجع العملية من صفحة المعاملات ثم يعتمدها.</p>
                <ul>
                    <li>اكتب نفس الرقم الذي تم التحويل منه.</li>
                    <li>أدخل المبلغ كما حولته بدون تقريب.</li>
                    <li>لو استخدمت إنستا باي، احتفظ بصورة إيصال التحويل.</li>
                </ul>
            </aside>
        </section>
    @endif
</main>
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
})();
</script>
@endsection
