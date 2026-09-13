@extends('layouts.admin')

@section('content')
@php
    $isAdmin = Gate::allows('isAdmin');
    $rate = \App\Support\YellowDuckMoney::exchangeRate();
@endphp
<main id="main-container" class="yd-admin-page yd-transactions-page" dir="rtl">
    <section class="yd-admin-hero">
        <div>
            <span>{{ $isAdmin ? 'المعاملات والإيداعات' : 'سجل المدفوعات' }}</span>
            <h1>{{ $isAdmin ? 'مراجعة الإيداعات واعتمادها' : 'متابعة طلبات الإيداع' }}</h1>
            <p>{{ $isAdmin ? 'اعتماد الإيداع اليدوي يضيف رصيد الدولار المحسوب بسعر التحويل المثبت في المعاملة.' : 'يظهر طلب الإيداع قيد المراجعة حتى يتم اعتماده.' }}</p>
        </div>
        <a class="btn btn-primary" href="{{ $isAdmin ? route('admin.payment-methods.index') : route('user.add-funds') }}"><i class="fa fa-plus"></i> {{ $isAdmin ? 'إدارة طرق الدفع' : 'إضافة رصيد' }}</a>
    </section>

    @if(session('success'))
        <div class="yd-funds-alert success">{{ session('success') }}</div>
    @endif

    <section class="block yd-ledger">
        <div class="block-header">
            <h2 class="block-title">{{ $isAdmin ? 'كل المعاملات' : 'معاملات حسابك' }}</h2>
            <form method="get" class="yd-ledger-search">
                <input name="search" value="{{ request('search') }}" placeholder="ابحث برقم العملية">
                <button type="submit" aria-label="بحث"><i class="fa fa-search"></i></button>
            </form>
        </div>
        <div class="table-responsive">
            <table class="table yd-ledger-table">
                <thead>
                    <tr>
                        <th>رقم العملية</th>
                        @if($isAdmin)<th>المستخدم</th>@endif
                        <th>الطريقة</th>
                        <th>المبلغ</th>
                        <th>الرصيد</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                        @if($isAdmin)<th>إجراء</th>@endif
                    </tr>
                </thead>
                <tbody>
                    @forelse($transactions as $transaction)
                        @php
                            $manual = \App\Support\YellowDuckMoney::isManualDeposit($transaction);
                            $credit = \App\Support\YellowDuckMoney::creditedUsd($transaction);
                            $pending = $manual && $transaction->status !== 'paid';
                            $status = $transaction->status === 'paid' ? 'تم الاعتماد' : ($pending ? 'قيد المراجعة' : 'مسترد');
                        @endphp
                        <tr>
                            <td><strong>{{ $transaction->transaction_id }}</strong></td>
                            @if($isAdmin)<td>{{ optional($transaction->user)->email ?: '-' }}</td>@endif
                            <td>{{ optional($transaction->paymentMethod)->name ?: 'غير محددة' }}</td>
                            <td>
                                @if($manual)
                                    <strong>{{ number_format((float) $transaction->amount, 2) }} ج.م</strong>
                                @else
                                    <strong>${{ number_format((float) $transaction->amount, 4) }}</strong>
                                @endif
                            </td>
                            <td>
                                <strong>${{ number_format($credit, 4) }}</strong>
                                <small>{{ number_format($credit * $rate, 2) }} ج.م</small>
                            </td>
                            <td><span class="yd-ledger-status {{ $transaction->status === 'paid' ? 'paid' : ($pending ? 'pending' : 'refund') }}">{{ $status }}</span></td>
                            <td>{{ $transaction->created_at }}</td>
                            @if($isAdmin)
                                <td>
                                    @if($pending)
                                        <form action="{{ route('admin.transactions.update', $transaction->id) }}" method="post" class="yd-approve-form">
                                            @csrf
                                            @method('PUT')
                                            <input type="hidden" name="status" value="paid">
                                            <button type="submit" class="btn btn-primary">اعتماد +${{ number_format($credit, 4) }}</button>
                                        </form>
                                    @else
                                        <details class="yd-ledger-notes">
                                            <summary>التفاصيل</summary>
                                            <pre>{{ $transaction->notes ?: 'لا توجد ملاحظات' }}</pre>
                                        </details>
                                    @endif
                                </td>
                            @endif
                        </tr>
                    @empty
                        <tr><td colspan="{{ $isAdmin ? 8 : 6 }}" class="yd-ledger-empty">لا توجد معاملات مطابقة.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="yd-ledger-pagination">{{ $transactions->appends(request()->query())->links() }}</div>
    </section>
</main>
@endsection
