@extends('layouts.admin')

@section('content')
@php($exchangeRate = \App\Support\YellowDuckMoney::exchangeRate())
<main id="main-container" class="yd-admin-page yd-payment-admin" dir="rtl">
    <section class="yd-admin-hero">
        <div>
            <span>لوحة الأدمن</span>
            <h1>إدارة طرق الدفع</h1>
            <p>تحكم في طرق الإيداع، أرقام الاستقبال، الحدود، الرسوم، وروابط QR من هنا.</p>
        </div>
        <button type="button" class="btn btn-primary" v-on:click="loadModal()">
            <i class="fa fa-plus"></i>
            إضافة طريقة دفع
        </button>
    </section>

    <div class="paymentMethod-area my-4">
        <section class="yd-exchange-card" aria-label="سعر تحويل الرصيد">
            <div>
                <span>سعر تحويل الإيداع اليدوي</span>
                <strong>1 دولار رصيد = <b id="yd-rate-output">{{ number_format($exchangeRate, 2) }}</b> جنيه مصري</strong>
                <p>ينطبق على فودافون كاش وإنستا باي فقط، ويُستخدم عند اعتماد الإيداع.</p>
            </div>
            <form id="yd-exchange-rate-form" action="{{ route('admin.payment-methods.store') }}" method="post">
                @csrf
                <label for="yd-exchange-rate">سعر الدولار بالجنيه</label>
                <div>
                    <input id="yd-exchange-rate" name="exchange_rate" type="number" min="1" max="1000" step="0.01" value="{{ number_format($exchangeRate, 2, '.', '') }}" required>
                    <button type="submit" class="btn btn-primary">حفظ السعر</button>
                </div>
                <small id="yd-exchange-rate-message" role="status"></small>
            </form>
        </section>
        <div class="block-header bg-white mb-4 yd-admin-filter">
            <div class="input-group">
                <input v-model="search" type="text" class="form-control form-control-alt" placeholder="بحث في طرق الدفع">
                <div class="input-group-prepend">
                    <button v-on:click="getPaymentMethods()" type="button" class="btn btn-primary">
                        <i class="fa fa-search mx-2"></i> بحث
                    </button>
                </div>
            </div>
        </div>

        <div class="block block-rounded">
            <div class="block-header block-header-default">
                <h2 class="block-title text-uppercase font-w500">طرق الدفع</h2>
                <span class="yd-admin-note">فودافون كاش وإنستا باي يظهران للمستخدم إذا كانت حالتهما active.</span>
            </div>
            <div class="block-content">
                <table class="table table-striped table-borderless table-vcenter yd-admin-table">
                    <thead class="thead-light">
                        <tr>
                            <th class="text-center" style="width: 70px;">#</th>
                            <th>الطريقة</th>
                            <th>الرسوم</th>
                            <th>الحد الأدنى</th>
                            <th>الحد الأقصى</th>
                            <th>الحالة</th>
                            <th class="text-center" style="width: 110px;">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-if="loading">
                            <tr>
                                <td colspan="7" class="text-center py-5">
                                    <div class="spinner spinner-grow text-primary" role="status"></div>
                                </td>
                            </tr>
                        </template>
                        <template v-if="!loading">
                            <payment-method-item
                                v-for="paymentMethod in paymentMethods.data"
                                :key="paymentMethod.id"
                                :payment-method="paymentMethod"
                                :image="'{{ asset('images') }}/' + paymentMethod.image"
                                :edit-fun="loadModal"
                                :delete-fun="loadModalDelete">
                            </payment-method-item>
                        </template>
                    </tbody>
                </table>
                <pagination align="right" :data="paymentMethods" @pagination-change-page="getPaymentMethods"></pagination>
            </div>
        </div>
    </div>
</main>

@include('admin.modals.payment_method.payment_method-modal')
@include('admin.modals.delete-modal', ['message' => 'هل تريد حذف طريقة الدفع؟'])
@endsection

@section('scripts')
<script src="{{ asset('js/pages/payment_method.js') }}"></script>
<script>
(function () {
    var form = document.getElementById('yd-exchange-rate-form');
    if (!form) return;
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var message = document.getElementById('yd-exchange-rate-message');
        var button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        message.textContent = 'جاري الحفظ...';
        axios.post(form.action, new FormData(form)).then(function (response) {
            var rate = Number(response.data.exchange_rate || 0).toFixed(2);
            document.getElementById('yd-rate-output').textContent = rate;
            form.querySelector('input[name="exchange_rate"]').value = rate;
            message.textContent = 'تم حفظ سعر التحويل.';
        }).catch(function () {
            message.textContent = 'تعذر حفظ السعر. راجع القيمة ثم حاول مرة أخرى.';
        }).finally(function () {
            button.disabled = false;
        });
    });
})();
</script>
@endsection
