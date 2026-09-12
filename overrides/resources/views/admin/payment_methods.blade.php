@extends('layouts.admin')

@section('content')
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
@endsection
