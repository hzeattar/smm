@extends('layouts.admin')

@section('css')
<link rel="stylesheet" href="{{ asset('css/yellow-duck-order.css') }}">
@endsection

@section('content')
<main id="main-container" class="yd-order-shell" dir="rtl">
    <section class="yd-order-hero">
        <div class="yd-order-hero-inner">
            <p>أهلًا بك في</p>
            <h1>البطة الصفرا</h1>
        </div>
    </section>

    <section class="yd-dashboard-stats" aria-label="إحصائيات الحساب">
        <article>
            <span class="yd-stat-icon yd-blue"><i class="fa fa-wallet"></i></span>
            <small>رصيدك الحالي</small>
            <strong>${{ number_format((float) $balance, 4) }}</strong>
        </article>
        <article>
            <span class="yd-stat-icon yd-orange"><i class="fa fa-shopping-bag"></i></span>
            <small>طلباتك</small>
            <strong>{{ number_format((int) $ordrs_count) }}</strong>
        </article>
        <article>
            <span class="yd-stat-icon yd-blue"><i class="fa fa-dollar-sign"></i></span>
            <small>إجمالي الصرف</small>
            <strong>${{ number_format((float) $total_spent, 4) }}</strong>
        </article>
        <article>
            <span class="yd-stat-icon yd-orange"><i class="fa fa-layer-group"></i></span>
            <small>الخدمات المتاحة</small>
            <strong>{{ number_format((int) $services_count) }}</strong>
        </article>
    </section>

    <section class="yd-platform-band" aria-label="اختر المنصة">
        <div class="yd-platform-title">اختر منصة السوشيال</div>
        <div class="yd-platforms">
            <button type="button" data-platform="instagram" title="Instagram"><i class="fab fa-instagram"></i></button>
            <button type="button" data-platform="facebook" title="Facebook"><i class="fab fa-facebook-f"></i></button>
            <button type="button" data-platform="youtube" title="YouTube"><i class="fab fa-youtube"></i></button>
            <button type="button" data-platform="tiktok" title="TikTok"><i class="fab fa-tiktok"></i></button>
            <button type="button" data-platform="telegram" title="Telegram"><i class="fab fa-telegram-plane"></i></button>
            <button type="button" data-platform="twitter" title="Twitter"><i class="fab fa-twitter"></i></button>
            <button type="button" data-platform="snapchat" title="Snapchat"><i class="fab fa-snapchat-ghost"></i></button>
            <button type="button" data-platform="spotify" title="Spotify"><i class="fab fa-spotify"></i></button>
            <button type="button" data-platform="linkedin" title="LinkedIn"><i class="fab fa-linkedin-in"></i></button>
            <button type="button" data-platform="discord" title="Discord"><i class="fab fa-discord"></i></button>
        </div>
    </section>

    <section class="yd-workspace">
        <aside class="yd-help-panel">
            <h2>أسئلة مهمة</h2>
            <details open>
                <summary>كيف أعمل طلب جديد؟</summary>
                <p>اختر القسم ثم الخدمة، ضع الرابط والكمية، وسيظهر السعر قبل الإرسال.</p>
            </details>
            <details>
                <summary>كيف يتم حساب السعر؟</summary>
                <p>السعر المعروض تقديري للواجهة، والحساب النهائي يتم من السيرفر فقط عند إرسال الطلب.</p>
            </details>
            <details>
                <summary>ماذا لو رصيدي لا يكفي؟</summary>
                <p>سيظهر تنبيه واضح ولن يتم إرسال الطلب للمزود.</p>
            </details>
            <div class="yd-video-box">
                <i class="fab fa-youtube"></i>
                <strong>دليل سريع للطلب</strong>
                <span>اختر الخدمة بعناية وتأكد من الحد الأدنى والأقصى.</span>
            </div>
        </aside>

        <section class="yd-order-card">
            <div class="yd-order-card-head">
                <h2>إنشاء طلب</h2>
                <div class="yd-order-tabs" aria-label="أنواع الطلب">
                    <button type="button" class="active">طلب جديد</button>
                    <a href="{{ route('user.orders.index') }}">سجل الطلبات</a>
                    <button type="button" disabled>طلب جماعي</button>
                </div>
            </div>

            <form id="yd-order-form" action="{{ route('user.orders.store') }}" method="post" novalidate>
                @csrf
                <div class="yd-form-grid">
                    <label>
                        <span>بحث</span>
                        <input id="yd-service-search" type="search" placeholder="ابحث باسم الخدمة أو المنصة">
                    </label>

                    <label>
                        <span>القسم</span>
                        <select id="yd-category" name="category_id" required>
                            <option value="">اختر القسم</option>
                            @foreach ($categories as $category)
                                <option value="{{ $category->id }}">{{ $category->name }}</option>
                            @endforeach
                        </select>
                    </label>

                    <label class="yd-wide">
                        <span>الخدمة</span>
                        <select id="yd-service" name="service_id" required disabled>
                            <option value="">اختر القسم أولًا</option>
                        </select>
                    </label>

                    <div class="yd-service-meta yd-wide" id="yd-service-meta">
                        <div><small>الحد الأدنى</small><strong>-</strong></div>
                        <div><small>الحد الأقصى</small><strong>-</strong></div>
                        <div><small>السعر لكل 1000</small><strong>-</strong></div>
                        <div><small>النوع</small><strong>-</strong></div>
                    </div>

                    <label class="yd-wide">
                        <span>الرابط</span>
                        <input id="yd-link" name="link" type="url" placeholder="https://..." required>
                    </label>

                    <label>
                        <span>الكمية</span>
                        <input id="yd-quantity" name="quantity" type="number" min="1" step="1" placeholder="1000" required>
                    </label>

                    <label>
                        <span>التكلفة</span>
                        <input id="yd-charge" type="text" value="$0.0000" readonly>
                    </label>

                    <label class="yd-wide">
                        <span>وصف الخدمة</span>
                        <textarea id="yd-description" readonly placeholder="سيظهر وصف الخدمة بعد الاختيار"></textarea>
                    </label>

                    <label class="yd-wide">
                        <span>ملاحظات اختيارية</span>
                        <textarea name="notes" placeholder="أي تعليمات إضافية إن وجدت"></textarea>
                    </label>
                </div>

                <div id="yd-order-message" class="yd-order-message" role="status"></div>

                <div class="yd-order-actions">
                    <span>تأكد من الرابط والكمية قبل الإرسال.</span>
                    <button type="submit">
                        <i class="fa fa-cart-plus"></i>
                        طلب جديد
                    </button>
                </div>
            </form>
        </section>
    </section>
</main>
@endsection

@section('scripts')
<script>
(function () {
    var category = document.getElementById('yd-category');
    var service = document.getElementById('yd-service');
    var search = document.getElementById('yd-service-search');
    var quantity = document.getElementById('yd-quantity');
    var charge = document.getElementById('yd-charge');
    var desc = document.getElementById('yd-description');
    var meta = document.getElementById('yd-service-meta');
    var form = document.getElementById('yd-order-form');
    var message = document.getElementById('yd-order-message');
    var services = [];
    var selected = null;

    function setMessage(text, type) {
        message.textContent = text || '';
        message.className = 'yd-order-message' + (text ? ' ' + (type || 'info') : '');
    }

    function money(value) {
        var n = Number(value || 0);
        return '$' + n.toFixed(4);
    }

    function updateMeta() {
        selected = services.find(function (item) { return String(item.id) === String(service.value); }) || null;
        if (!selected) {
            meta.innerHTML = '<div><small>الحد الأدنى</small><strong>-</strong></div><div><small>الحد الأقصى</small><strong>-</strong></div><div><small>السعر لكل 1000</small><strong>-</strong></div><div><small>النوع</small><strong>-</strong></div>';
            desc.value = '';
            charge.value = '$0.0000';
            return;
        }
        meta.innerHTML = '<div><small>الحد الأدنى</small><strong>' + selected.min + '</strong></div><div><small>الحد الأقصى</small><strong>' + selected.max + '</strong></div><div><small>السعر لكل 1000</small><strong>' + money(selected.rate) + '</strong></div><div><small>النوع</small><strong>' + (selected.type || 'api') + '</strong></div>';
        desc.value = selected.description || 'لا يوجد وصف لهذه الخدمة.';
        updateCharge();
    }

    function renderServices() {
        var term = (search.value || '').toLowerCase();
        var filtered = services.filter(function (item) {
            return !term || String(item.name || '').toLowerCase().indexOf(term) !== -1;
        });
        service.innerHTML = '<option value="">اختر الخدمة</option>';
        filtered.forEach(function (item) {
            var option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name + ' - $' + Number(item.rate || 0).toFixed(4);
            service.appendChild(option);
        });
        service.disabled = filtered.length === 0;
        updateMeta();
    }

    function updateCharge() {
        if (!selected) {
            charge.value = '$0.0000';
            return;
        }
        charge.value = money((Number(quantity.value || 0) * Number(selected.rate || 0)) / 1000);
    }

    category.addEventListener('change', function () {
        services = [];
        selected = null;
        service.disabled = true;
        service.innerHTML = '<option value="">جاري تحميل الخدمات...</option>';
        updateMeta();
        if (!category.value) {
            service.innerHTML = '<option value="">اختر القسم أولًا</option>';
            return;
        }
        fetch('{{ url('/user/orders/services') }}/' + encodeURIComponent(category.value), {headers: {'Accept': 'application/json'}})
            .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
            .then(function (data) {
                services = Array.isArray(data) ? data : [];
                renderServices();
            })
            .catch(function () {
                service.innerHTML = '<option value="">تعذر تحميل الخدمات</option>';
                setMessage('تعذر تحميل خدمات هذا القسم، حاول مرة أخرى.', 'error');
            });
    });

    service.addEventListener('change', updateMeta);
    search.addEventListener('input', renderServices);
    quantity.addEventListener('input', updateCharge);

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        setMessage('', '');
        if (!selected) {
            setMessage('اختر خدمة أولًا.', 'error');
            return;
        }
        var qty = Number(quantity.value || 0);
        if (qty < Number(selected.min) || qty > Number(selected.max)) {
            setMessage('الكمية يجب أن تكون بين ' + selected.min + ' و ' + selected.max + '.', 'error');
            return;
        }
        var button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<i class="fa fa-sync fa-spin"></i> جاري الإرسال';
        fetch(form.action, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': form.querySelector('input[name="_token"]').value
            },
            body: new FormData(form)
        }).then(function (response) {
            return response.json().then(function (data) { return {ok: response.ok, status: response.status, data: data}; });
        }).then(function (result) {
            if (!result.ok) {
                setMessage(result.data.message || 'تعذر إنشاء الطلب. راجع البيانات والرصيد.', 'error');
                return;
            }
            setMessage('تم إنشاء الطلب بنجاح. يمكنك متابعة الحالة من سجل الطلبات.', 'success');
            form.reset();
            services = [];
            selected = null;
            service.disabled = true;
            service.innerHTML = '<option value="">اختر القسم أولًا</option>';
            updateMeta();
        }).catch(function () {
            setMessage('حدث خطأ أثناء إرسال الطلب، حاول مرة أخرى.', 'error');
        }).finally(function () {
            button.disabled = false;
            button.innerHTML = '<i class="fa fa-cart-plus"></i> طلب جديد';
        });
    });
})();
</script>
@endsection
