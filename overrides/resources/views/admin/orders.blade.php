@extends('layouts.admin')

@section('content')
@php
    $isAdmin = Auth::guard('admin')->check();
    $storeUrl = $isAdmin ? route('admin.orders.store') : route('user.orders.store');
    $servicesBaseUrl = $isAdmin ? url('/admin/orders/services') : url('/user/orders/services');
@endphp
<main id="main-container" class="yd-orders-page">
    <div class="yd-orders-shell">
        <header class="yd-orders-heading">
            <div>
                <span class="yd-orders-eyebrow">🐥 البطة الصفرا</span>
                <h1>{{ $isAdmin ? 'إدارة الطلبات' : 'إنشاء طلب جديد' }}</h1>
                <p>{{ $isAdmin ? 'تابع الطلبات وحالتها من لوحة واحدة.' : 'اختر المنصة والخدمة والكمية، وشاهد السعر والتفاصيل قبل إرسال الطلب.' }}</p>
            </div>
            <div class="yd-orders-balance-pill" v-if="!boot.isAdmin">
                <span>الرصيد المتاح</span>
                <strong>$@{{ money(boot.stats.balance) }}</strong>
            </div>
        </header>

        <section class="yd-order-stats">
            <article class="yd-stat-card">
                <div class="yd-stat-icon">💰</div>
                <div><span>{{ $isAdmin ? 'إجمالي قيمة الطلبات' : 'إجمالي إنفاقك' }}</span><strong>$@{{ money(boot.stats.spent) }}</strong></div>
            </article>
            <article class="yd-stat-card">
                <div class="yd-stat-icon">🧾</div>
                <div><span>إجمالي الطلبات</span><strong>@{{ boot.stats.total_orders }}</strong></div>
            </article>
            <article class="yd-stat-card">
                <div class="yd-stat-icon">✅</div>
                <div><span>طلبات مكتملة</span><strong>@{{ boot.stats.completed_orders }}</strong></div>
            </article>
            <article class="yd-stat-card">
                <div class="yd-stat-icon">⏳</div>
                <div><span>قيد التنفيذ</span><strong>@{{ boot.stats.open_orders }}</strong></div>
            </article>
        </section>

        @if(!$isAdmin)
        <section class="yd-platform-panel" aria-label="فلترة حسب المنصة">
            <div class="yd-panel-label">اختر منصة السوشيال</div>
            <div class="yd-platform-scroll">
                <button type="button" class="yd-platform-chip" :class="{active: activePlatform === 'all'}" @click="setPlatform('all')"><span>✨</span><b>الكل</b></button>
                <button v-for="platform in platforms" :key="platform.key" type="button" class="yd-platform-chip" :class="{active: activePlatform === platform.key}" @click="setPlatform(platform.key)">
                    <span>@{{ platform.icon }}</span><b>@{{ platform.label }}</b>
                </button>
            </div>
        </section>

        <section class="yd-order-workspace">
            <aside class="yd-order-aside">
                <div class="yd-side-card yd-side-card-dark">
                    <div class="yd-side-card-title"><span>💡</span><h3>نصائح قبل الطلب</h3></div>
                    <ul class="yd-tip-list">
                        <li>تأكد أن الرابط عام ويعمل بدون تسجيل دخول.</li>
                        <li>لا ترسل طلبًا ثانيًا لنفس الرابط قبل انتهاء الأول.</li>
                        <li>راجع الحد الأدنى والأقصى قبل إدخال الكمية.</li>
                        <li>الخدمات التي تدعم Refill أو Cancel يظهر عليها وسم واضح.</li>
                    </ul>
                </div>

                <div class="yd-side-card">
                    <div class="yd-side-card-title"><span>⚡</span><h3>ملخص الخدمة</h3></div>
                    <div v-if="selectedService" class="yd-service-summary">
                        <div class="yd-summary-row"><span>السعر لكل 1000</span><strong>$@{{ money(selectedService.rate) }}</strong></div>
                        <div class="yd-summary-row"><span>الحد الأدنى</span><strong>@{{ selectedService.min }}</strong></div>
                        <div class="yd-summary-row"><span>الحد الأقصى</span><strong>@{{ selectedService.max }}</strong></div>
                        <div class="yd-summary-row"><span>التكلفة</span><strong class="yd-price-accent">$@{{ money(totalPrice) }}</strong></div>
                        <div class="yd-service-badges">
                            <span v-if="serviceMeta.refill" class="yd-badge success">↻ Refill</span>
                            <span v-if="serviceMeta.cancel" class="yd-badge neutral">✕ Cancel</span>
                            <span class="yd-badge type">@{{ serviceMeta.provider_type || 'Default' }}</span>
                        </div>
                    </div>
                    <div v-else class="yd-empty-summary">اختر خدمة لعرض تفاصيلها هنا.</div>
                </div>

                <div class="yd-side-card">
                    <div class="yd-side-card-title"><span>❓</span><h3>أسئلة سريعة</h3></div>
                    <details><summary>متى يبدأ الطلب؟</summary><p>يتم إرسال الطلب للمزود مباشرة بعد قبوله وخصم تكلفته من رصيدك.</p></details>
                    <details><summary>كيف أعرف حالة الطلب؟</summary><p>الحالة تتحدث تلقائيًا من المزود وتظهر في سجل الطلبات بالأسفل.</p></details>
                    <details><summary>ماذا لو فشل الإرسال؟</summary><p>لن يتم خصم الرصيد إذا رفض المزود إنشاء الطلب.</p></details>
                </div>
            </aside>

            <div class="yd-order-main-card">
                <div class="yd-order-tabs" role="tablist">
                    <button class="yd-order-tab active" type="button">طلب جديد</button>
                    <button class="yd-order-tab" type="button" disabled>Mass Order <small>قريبًا</small></button>
                    <button class="yd-order-tab" type="button" disabled>المفضلة <small>قريبًا</small></button>
                    <button class="yd-order-tab" type="button" disabled>Drip Feed <small>قريبًا</small></button>
                    <button class="yd-order-tab" type="button" disabled>Subscription <small>قريبًا</small></button>
                </div>

                <form class="yd-order-form" @submit.prevent="storeOrder">
                    <div class="yd-form-grid two">
                        <div class="yd-field-wrap">
                            <label for="yd-category">الفئة</label>
                            <select id="yd-category" v-model="categoryId" @change="loadServices" class="yd-order-input">
                                <option value="">اختر الفئة</option>
                                <option v-for="category in filteredCategories" :key="category.id" :value="String(category.id)">@{{ category.name }}</option>
                            </select>
                            <div v-if="errors.category_id" class="yd-form-error">اختر الفئة أولًا.</div>
                        </div>
                        <div class="yd-field-wrap">
                            <label for="yd-service-search">بحث داخل الخدمات</label>
                            <input id="yd-service-search" v-model.trim="serviceSearch" class="yd-order-input" type="search" placeholder="اكتب اسم الخدمة أو رقمها" :disabled="!categoryId">
                        </div>
                    </div>

                    <div class="yd-field-wrap">
                        <label for="yd-service">الخدمة</label>
                        <select id="yd-service" v-model="postdata.service_id" @change="selectService" class="yd-order-input" :disabled="!categoryId || loadingServices">
                            <option value="">@{{ loadingServices ? 'جاري تحميل الخدمات...' : 'اختر الخدمة' }}</option>
                            <option v-for="service in filteredServices" :key="service.id" :value="String(service.id)">@{{ service.id }} — @{{ service.name }} — $@{{ money(service.rate) }}</option>
                        </select>
                        <div v-if="errors.service_id" class="yd-form-error">اختر خدمة متاحة.</div>
                    </div>

                    <div v-if="selectedService" class="yd-selected-service-box">
                        <div class="yd-selected-service-head">
                            <div><span>الخدمة المختارة</span><h3>@{{ selectedService.name }}</h3></div>
                            <div class="yd-service-badges">
                                <span v-if="serviceMeta.refill" class="yd-badge success">Refill</span>
                                <span v-if="serviceMeta.cancel" class="yd-badge neutral">Cancel</span>
                            </div>
                        </div>
                        <p>@{{ serviceDescription }}</p>
                        <div class="yd-mini-metrics">
                            <span><b>Min</b> @{{ selectedService.min }}</span>
                            <span><b>Max</b> @{{ selectedService.max }}</span>
                            <span><b>Rate</b> $@{{ money(selectedService.rate) }}/1000</span>
                        </div>
                    </div>

                    <div class="yd-field-wrap">
                        <label for="yd-link">الرابط</label>
                        <input id="yd-link" v-model.trim="postdata.link" class="yd-order-input" type="url" inputmode="url" placeholder="https://..." :disabled="!selectedService">
                        <div v-if="errors.link" class="yd-form-error">أدخل رابطًا صحيحًا يبدأ بـ http أو https.</div>
                    </div>

                    <div class="yd-form-grid two">
                        <div class="yd-field-wrap">
                            <label for="yd-quantity">الكمية</label>
                            <input id="yd-quantity" v-model.number="postdata.quantity" @input="calculateTotal" class="yd-order-input" type="number" :min="selectedService ? selectedService.min : 1" :max="selectedService ? selectedService.max : null" placeholder="الكمية" :disabled="!selectedService">
                            <div v-if="errors.quantity" class="yd-form-error">@{{ errors.quantity }}</div>
                        </div>
                        <div class="yd-field-wrap">
                            <label for="yd-charge">التكلفة المتوقعة</label>
                            <div id="yd-charge" class="yd-charge-box"><span>USD</span><strong>$@{{ money(totalPrice) }}</strong></div>
                        </div>
                    </div>

                    <div class="yd-field-wrap">
                        <label for="yd-notes">ملاحظات <small>اختياري</small></label>
                        <textarea id="yd-notes" v-model.trim="postdata.notes" class="yd-order-input yd-order-textarea" rows="3" placeholder="أي ملاحظة إضافية تخص الطلب"></textarea>
                    </div>

                    <label class="yd-confirm-row">
                        <input v-model="confirmation" type="checkbox">
                        <span>راجعت الرابط والخدمة والكمية وأؤكد تنفيذ هذا الطلب.</span>
                    </label>
                    <div v-if="errors.confirmation" class="yd-form-error">يجب تأكيد بيانات الطلب.</div>

                    <div v-if="submitError" class="yd-submit-alert error">@{{ submitError }}</div>
                    <div v-if="submitSuccess" class="yd-submit-alert success">@{{ submitSuccess }}</div>

                    <button class="yd-place-order" type="submit" :disabled="processing || !selectedService">
                        <span v-if="!processing">تنفيذ الطلب الآن</span>
                        <span v-else>جاري إرسال الطلب...</span>
                        <b>$@{{ money(totalPrice) }}</b>
                    </button>
                </form>
            </div>
        </section>
        @endif

        <section class="yd-orders-history">
            <div class="yd-history-head">
                <div><span>السجل</span><h2>{{ $isAdmin ? 'كل الطلبات' : 'طلباتك الأخيرة' }}</h2></div>
                <div class="yd-history-search">
                    <input v-model.trim="search" @keyup.enter="getOrders(1)" type="search" placeholder="ابحث برقم الطلب أو الرابط">
                    <button type="button" @click="getOrders(1)">بحث</button>
                </div>
            </div>

            <div class="yd-history-loading" v-if="loadingOrders">جاري تحميل الطلبات...</div>
            <div v-else-if="!orders.data || !orders.data.length" class="yd-history-empty">لا توجد طلبات حتى الآن.</div>
            <div v-else class="yd-order-table-wrap">
                <table class="yd-order-table">
                    <thead><tr><th>#</th>@if($isAdmin)<th>المستخدم</th>@endif<th>الخدمة</th><th>الكمية</th><th>التكلفة</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                    <tbody>
                        <tr v-for="order in orders.data" :key="order.id">
                            <td><strong>#@{{ order.id }}</strong><small v-if="order.order_api_id">API: @{{ order.order_api_id }}</small></td>
                            @if($isAdmin)<td><span>@{{ order.user ? order.user.username : '-' }}</span><small>@{{ order.user ? order.user.email : '' }}</small></td>@endif
                            <td><span class="yd-order-service-name">@{{ order.service ? order.service.name : '-' }}</span><a :href="order.link" target="_blank" rel="noopener">فتح الرابط ↗</a></td>
                            <td>@{{ order.quantity }}</td>
                            <td>$@{{ money(order.total) }}</td>
                            <td><span class="yd-status" :class="statusClass(order.status)">@{{ statusLabel(order.status) }}</span></td>
                            <td>@{{ dateLabel(order.created_at) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="yd-pagination" v-if="orders.last_page > 1">
                <button type="button" @click="getOrders(orders.current_page - 1)" :disabled="orders.current_page <= 1">السابق</button>
                <span>صفحة @{{ orders.current_page }} من @{{ orders.last_page }}</span>
                <button type="button" @click="getOrders(orders.current_page + 1)" :disabled="orders.current_page >= orders.last_page">التالي</button>
            </div>
        </section>
    </div>
</main>

<script>
window.YD_ORDER_BOOT = @json([
    'isAdmin' => $isAdmin,
    'storeUrl' => $storeUrl,
    'servicesBaseUrl' => $servicesBaseUrl,
    'ordersApiUrl' => $isAdmin ? url('/admin/orders') : url('/user/orders'),
    'categories' => $categories,
    'stats' => $orderStats,
]);
</script>
@endsection

@section('scripts')
<script src="{{ asset('js/pages/order.js') }}"></script>
@endsection
