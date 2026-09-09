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
            <span class="yd-stat-icon"><i class="fa fa-wallet"></i></span>
            <div>
                <small>رصيدك الحالي</small>
                <strong>${{ number_format((float) $balance, 4) }}</strong>
            </div>
        </article>
        <article>
            <span class="yd-stat-icon"><i class="fa fa-shopping-bag"></i></span>
            <div>
                <small>طلباتك</small>
                <strong>{{ number_format((int) $ordrs_count) }}</strong>
            </div>
        </article>
        <article>
            <span class="yd-stat-icon"><i class="fa fa-dollar-sign"></i></span>
            <div>
                <small>إجمالي الصرف</small>
                <strong>${{ number_format((float) $total_spent, 4) }}</strong>
            </div>
        </article>
        <article>
            <span class="yd-stat-icon"><i class="fa fa-layer-group"></i></span>
            <div>
                <small>الخدمات المتاحة</small>
                <strong>{{ number_format((int) $services_count) }}</strong>
            </div>
        </article>
    </section>

    <section class="yd-platform-band" aria-label="اختر المنصة">
        <div class="yd-platform-title">اختر منصة السوشيال</div>
        <div id="yd-platforms" class="yd-platforms">
            <button type="button" disabled>جاري تحميل المنصات</button>
        </div>
    </section>

    <section class="yd-workspace">
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
                                <option value="{{ $category->id }}" data-name="{{ $category->name }}">{{ $category->name }}</option>
                            @endforeach
                        </select>
                    </label>

                    <label class="yd-wide yd-service-field">
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

                    <label class="yd-wide yd-description-field">
                        <span>وصف الخدمة</span>
                        <div id="yd-description" class="yd-description-box">سيظهر وصف الخدمة بعد الاختيار</div>
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

        <aside class="yd-help-panel">
            <h2>أسئلة مهمة</h2>
            <details open>
                <summary>كيف أعمل طلب جديد؟</summary>
                <p>اختر المنصة ثم القسم والخدمة، ضع الرابط والكمية، وسيظهر السعر قبل الإرسال.</p>
            </details>
            <details>
                <summary>كيف يتم حساب السعر؟</summary>
                <p>السعر المعروض تقديري للواجهة، والحساب النهائي يتم من السيرفر فقط عند إرسال الطلب.</p>
            </details>
            <details>
                <summary>ماذا لو رصيدي لا يكفي؟</summary>
                <p>سيظهر تنبيه واضح ولن يتم إرسال الطلب للمزود.</p>
            </details>
        </aside>
    </section>
</main>
@endsection

@section('scripts')
<script>
(function () {
    var category = document.getElementById('yd-category');
    var service = document.getElementById('yd-service');
    var search = document.getElementById('yd-service-search');
    var platformList = document.getElementById('yd-platforms');
    var quantity = document.getElementById('yd-quantity');
    var charge = document.getElementById('yd-charge');
    var desc = document.getElementById('yd-description');
    var meta = document.getElementById('yd-service-meta');
    var form = document.getElementById('yd-order-form');
    var message = document.getElementById('yd-order-message');
    var servicesUrlBase = "{{ url('/user/orders/services') }}";
    var services = [];
    var selected = null;
    var activePlatform = 'all';
    var categoryOptions = Array.prototype.slice.call(category.querySelectorAll('option')).filter(function (option) {
        return option.value;
    });
    var platforms = [
        {key: 'instagram', label: 'Instagram', short: 'IG', terms: ['instagram', 'insta', 'انست', 'إنست', 'انستجرام', 'إنستجرام']},
        {key: 'facebook', label: 'Facebook', short: 'FB', terms: ['facebook', 'فيس', 'فيسبوك', 'fb']},
        {key: 'youtube', label: 'YouTube', short: 'YT', terms: ['youtube', 'يوتيوب', 'yt']},
        {key: 'tiktok', label: 'TikTok', short: 'TT', terms: ['tiktok', 'tik tok', 'تيك', 'تيك توك']},
        {key: 'telegram', label: 'Telegram', short: 'TG', terms: ['telegram', 'تلجرام', 'تليجرام']},
        {key: 'twitter', label: 'Twitter / X', short: 'X', terms: ['twitter', 'تويتر', 'اكس', 'إكس']},
        {key: 'snapchat', label: 'Snapchat', short: 'SC', terms: ['snapchat', 'سناب', 'سناب شات']},
        {key: 'spotify', label: 'Spotify', short: 'SP', terms: ['spotify', 'سبوتيفاي']},
        {key: 'linkedin', label: 'LinkedIn', short: 'IN', terms: ['linkedin', 'لينكد', 'لينكدان']},
        {key: 'discord', label: 'Discord', short: 'DC', terms: ['discord', 'ديسكورد']},
        {key: 'other', label: 'أخرى', short: 'OT', terms: []}
    ];

    function setMessage(text, type) {
        message.textContent = text || '';
        message.className = 'yd-order-message' + (text ? ' ' + (type || 'info') : '');
    }

    function money(value) {
        var n = Number(value || 0);
        return '$' + n.toFixed(4);
    }

    function cleanText(value) {
        var holder = document.createElement('div');
        holder.innerHTML = String(value || '');
        return (holder.textContent || holder.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function normalize(value) {
        return cleanText(value).toLowerCase();
    }

    function detectPlatform(name) {
        var text = normalize(name);
        for (var i = 0; i < platforms.length; i += 1) {
            if (platforms[i].key === 'other') {
                continue;
            }
            for (var j = 0; j < platforms[i].terms.length; j += 1) {
                if (text.indexOf(platforms[i].terms[j]) !== -1) {
                    return platforms[i].key;
                }
            }
        }
        return 'other';
    }

    function platformByKey(key) {
        return platforms.find(function (item) { return item.key === key; }) || platforms[platforms.length - 1];
    }

    function optionPlatform(option) {
        if (!option.dataset.platform) {
            option.dataset.platform = detectPlatform(option.dataset.name || option.textContent);
        }
        return option.dataset.platform;
    }

    function filteredCategoryOptions() {
        if (activePlatform === 'all') {
            return categoryOptions.slice();
        }
        return categoryOptions.filter(function (option) {
            return optionPlatform(option) === activePlatform;
        });
    }

    function setActivePlatformButton() {
        Array.prototype.slice.call(platformList.querySelectorAll('button[data-platform]')).forEach(function (button) {
            button.classList.toggle('active', button.dataset.platform === activePlatform);
        });
    }

    function renderPlatformFilters() {
        var counts = {};
        categoryOptions.forEach(function (option) {
            var key = optionPlatform(option);
            counts[key] = (counts[key] || 0) + 1;
        });

        platformList.innerHTML = '';
        if (!categoryOptions.length) {
            var empty = document.createElement('span');
            empty.className = 'yd-platform-empty';
            empty.textContent = 'لا توجد خدمات متاحة الآن';
            platformList.appendChild(empty);
            return;
        }

        var all = document.createElement('button');
        all.type = 'button';
        all.dataset.platform = 'all';
        all.innerHTML = '<b>ALL</b><span>كل المنصات</span><small>' + categoryOptions.length + ' قسم</small>';
        platformList.appendChild(all);

        platforms.forEach(function (item) {
            if (!counts[item.key]) {
                return;
            }
            var button = document.createElement('button');
            button.type = 'button';
            button.dataset.platform = item.key;
            button.innerHTML = '<b>' + item.short + '</b><span>' + item.label + '</span><small>' + counts[item.key] + ' قسم</small>';
            platformList.appendChild(button);
        });

        platformList.addEventListener('click', function (event) {
            var button = event.target.closest('button[data-platform]');
            if (!button) {
                return;
            }
            activePlatform = button.dataset.platform || 'all';
            setActivePlatformButton();
            renderCategories(true);
        });
        setActivePlatformButton();
    }

    function renderCategories(selectFirst) {
        var previous = category.value;
        var options = filteredCategoryOptions();
        category.innerHTML = '<option value="">اختر القسم</option>';
        options.forEach(function (source) {
            category.appendChild(source.cloneNode(true));
        });

        var hasPrevious = options.some(function (option) {
            return String(option.value) === String(previous);
        });

        if (!selectFirst && hasPrevious) {
            category.value = previous;
        } else if (selectFirst && options.length) {
            category.value = options[0].value;
        }

        if (!category.value) {
            services = [];
            selected = null;
            service.disabled = true;
            service.innerHTML = '<option value="">اختر القسم أولًا</option>';
            updateMeta();
            return;
        }

        loadServicesForCategory();
    }

    function describeService(item) {
        var raw = item && item.description ? String(item.description).trim() : '';
        if (!raw) {
            return 'لا يوجد وصف تفصيلي من المزود لهذه الخدمة. راجع الحد الأدنى والأقصى والسعر قبل الإرسال.';
        }

        try {
            var meta = JSON.parse(raw);
            if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
                var lines = [];
                lines.push('نوع الخدمة: ' + (meta.provider_type || item.type || 'Default'));
                lines.push(meta.simple_order_supported ? 'هذه الخدمة تدعم الطلب العادي المباشر.' : 'هذه الخدمة لا تدعم الطلب العادي المباشر حاليًا.');
                lines.push(meta.refill ? 'التعويض: متاح حسب سياسة المزود.' : 'التعويض: غير متاح لهذه الخدمة.');
                lines.push(meta.cancel ? 'الإلغاء: متاح حسب سياسة المزود.' : 'الإلغاء: غير متاح بعد إرسال الطلب.');
                return lines.join('\n');
            }
        } catch (e) {
            return cleanText(raw) || 'لا يوجد وصف تفصيلي من المزود لهذه الخدمة.';
        }

        return cleanText(raw) || 'لا يوجد وصف تفصيلي من المزود لهذه الخدمة.';
    }

    function updateMeta() {
        selected = services.find(function (item) { return String(item.id) === String(service.value); }) || null;
        if (!selected) {
            meta.innerHTML = '<div><small>الحد الأدنى</small><strong>-</strong></div><div><small>الحد الأقصى</small><strong>-</strong></div><div><small>السعر لكل 1000</small><strong>-</strong></div><div><small>النوع</small><strong>-</strong></div>';
            desc.textContent = 'سيظهر وصف الخدمة بعد الاختيار';
            charge.value = '$0.0000';
            return;
        }
        meta.innerHTML = '<div><small>الحد الأدنى</small><strong>' + selected.min + '</strong></div><div><small>الحد الأقصى</small><strong>' + selected.max + '</strong></div><div><small>السعر لكل 1000</small><strong>' + money(selected.rate) + '</strong></div><div><small>النوع</small><strong>' + (selected.type || 'api') + '</strong></div>';
        desc.textContent = describeService(selected);
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

    function loadServicesForCategory() {
        services = [];
        selected = null;
        service.disabled = true;
        service.innerHTML = '<option value="">جاري تحميل الخدمات...</option>';
        updateMeta();
        if (!category.value) {
            service.innerHTML = '<option value="">اختر القسم أولًا</option>';
            return;
        }
        fetch(servicesUrlBase + '/' + encodeURIComponent(category.value), {headers: {'Accept': 'application/json'}})
            .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
            .then(function (data) {
                services = Array.isArray(data) ? data : [];
                renderServices();
            })
            .catch(function () {
                service.innerHTML = '<option value="">تعذر تحميل الخدمات</option>';
                setMessage('تعذر تحميل خدمات هذا القسم، حاول مرة أخرى.', 'error');
            });
    }

    category.addEventListener('change', loadServicesForCategory);
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

    renderPlatformFilters();
    renderCategories(false);
})();
</script>
@endsection
