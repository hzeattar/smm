@extends('layouts.admin')

@section('content')
<main id="main-container" class="yd-admin-page yd-admin-dashboard" dir="rtl">
    <section class="yd-admin-hero">
        <div>
            <span>لوحة الإدارة</span>
            <h1>متابعة تشغيل البطة الصفرا</h1>
            <p>نظرة سريعة على الإيرادات، المستخدمين، الطلبات، والخدمات المنشورة.</p>
        </div>
        <div class="yd-admin-actions">
            <a href="{{ route('admin.orders.index') }}" class="btn btn-primary"><i class="fa fa-clipboard-list"></i> الطلبات</a>
            <a href="{{ route('admin.payment-methods.index') }}" class="btn btn-light"><i class="fa fa-money-check-alt"></i> طرق الدفع</a>
        </div>
    </section>

    <section class="yd-admin-stats">
        <article>
            <i class="fas fa-money-bill-wave-alt"></i>
            <span>إجمالي الربح</span>
            <strong>${{ number_format((float) $total_earnings, 4) }}</strong>
        </article>
        <article>
            <i class="far fa-user"></i>
            <span>المستخدمون النشطون</span>
            <strong>{{ number_format((int) $users_count) }}</strong>
        </article>
        <article>
            <i class="fas fa-shopping-cart"></i>
            <span>كل الطلبات</span>
            <strong>{{ number_format((int) $ordrs_count) }}</strong>
        </article>
        <article>
            <i class="fas fa-layer-group"></i>
            <span>الخدمات النشطة</span>
            <strong>{{ number_format((int) $services_count) }}</strong>
        </article>
    </section>

    <section class="yd-admin-dashboard-grid">
        <article class="block yd-admin-panel">
            <div class="block-header">
                <h2 class="block-title">حالة الطلبات</h2>
                <a href="{{ route('admin.orders.index') }}">إدارة الطلبات</a>
            </div>
            <div class="yd-status-grid">
                <div><span>قيد الانتظار</span><strong>{{ \App\Helpers\Helper::getOrdersCount('pending') }}</strong></div>
                <div><span>قيد التنفيذ</span><strong>{{ \App\Helpers\Helper::getOrdersCount('processing') }}</strong></div>
                <div><span>جزئي</span><strong>{{ \App\Helpers\Helper::getOrdersCount('partial') }}</strong></div>
                <div><span>مكتمل</span><strong>{{ \App\Helpers\Helper::getOrdersCount('completed') }}</strong></div>
                <div><span>ملغي</span><strong>{{ \App\Helpers\Helper::getOrdersCount('cancelled') }}</strong></div>
                <div><span>مسترد</span><strong>{{ \App\Helpers\Helper::getOrdersCount('refunded') }}</strong></div>
            </div>
        </article>

        <article class="block yd-admin-panel">
            <div class="block-header">
                <h2 class="block-title">اختصارات مهمة</h2>
            </div>
            <div class="yd-admin-shortcuts">
                <a href="{{ route('admin.transactions.index') }}"><i class="fa fa-receipt"></i><span>اعتماد الإيداعات</span></a>
                <a href="{{ route('admin.payment-methods.index') }}"><i class="fa fa-qrcode"></i><span>تعديل QR/المحافظ</span></a>
                <a href="{{ route('admin.services.index') }}"><i class="fa fa-layer-group"></i><span>إدارة الخدمات</span></a>
                <a href="{{ route('admin.api-providers.index') }}"><i class="fa fa-network-wired"></i><span>مزود الخدمة</span></a>
            </div>
        </article>
    </section>
</main>
@endsection
