@extends('layouts.admin')

@section('content')
@php
    $isAdmin = Gate::allows('isAdmin');
    $rate = \App\Support\YellowDuckMoney::exchangeRate();
    $proofTransactionIds = $proofTransactionIds ?? [];
    $users = $users ?? collect();
@endphp
<main id="main-container" class="yd-admin-page yd-transactions-page" dir="rtl">
    <section class="yd-admin-hero">
        <div>
            <span>{{ $isAdmin ? 'المعاملات والإيداعات' : 'سجل المدفوعات' }}</span>
            <h1>{{ $isAdmin ? 'مراجعة الإيداعات واعتمادها' : 'متابعة طلبات الإيداع' }}</h1>
            <p>{{ $isAdmin ? 'راجع وسيلة التحويل والحساب المستلم وصورة الإثبات قبل اعتماد الرصيد. كل تعديل يدوي على الرصيد يتم تسجيله كمعاملة.' : 'يظهر طلب الإيداع قيد المراجعة حتى يتم اعتماده.' }}</p>
        </div>
        <a class="btn btn-primary" href="{{ $isAdmin ? route('admin.payment-methods.index') : route('user.add-funds') }}"><i class="fa fa-plus"></i> {{ $isAdmin ? 'إدارة طرق الدفع' : 'إضافة رصيد' }}</a>
    </section>

    @if(session('success'))
        @if(!$isAdmin && session('deposit_submitted'))
            <section class="yd-deposit-success-card" role="status" aria-live="polite">
                <div class="yd-deposit-success-icon">✓</div>
                <div class="yd-deposit-success-copy">
                    <span>تم استلام طلب الإيداع</span>
                    <h2>طلبك الآن قيد المراجعة</h2>
                    <p>{{ session('success') }}</p>
                    @if(session('deposit_reference'))
                        <small>رقم العملية: <strong dir="ltr">{{ session('deposit_reference') }}</strong></small>
                    @endif
                </div>
                <a class="yd-whatsapp-support" href="https://wa.me/201205323440" target="_blank" rel="noopener noreferrer">
                    <span class="yd-whatsapp-mark">WA</span>
                    <span>
                        <strong>تواصل مع الدعم</strong>
                        <small>عبر واتساب</small>
                    </span>
                </a>
            </section>
        @else
            <div class="yd-funds-alert success">{{ session('success') }}</div>
        @endif
    @endif
    @if($errors->any())
        <div class="yd-funds-alert error">{{ $errors->first() }}</div>
    @endif

    @if(!$isAdmin && !session('deposit_submitted'))
        <div class="yd-user-support-row">
            <span>محتاج مساعدة بخصوص إيداع أو معاملة؟</span>
            <a href="https://wa.me/201205323440" target="_blank" rel="noopener noreferrer">تواصل مع الدعم على واتساب</a>
        </div>
    @endif

    @if($isAdmin)
        <section class="block yd-manual-credit-card">
            <div class="block-header">
                <div>
                    <h2 class="block-title">إضافة رصيد يدوي لعميل</h2>
                    <p>الإضافة تتم بالدولار وتُسجل تلقائيًا في سجل المعاملات باسم الأدمن المنفذ.</p>
                </div>
            </div>
            <form action="{{ route('admin.manual-balance') }}" method="post" class="yd-manual-credit-form">
                @csrf
                <label>
                    <span>العميل</span>
                    <select name="user_id" required>
                        <option value="">اختر العميل</option>
                        @foreach($users as $userOption)
                            <option value="{{ $userOption->id }}" {{ (string) old('user_id') === (string) $userOption->id ? 'selected' : '' }}>
                                {{ $userOption->username }} — {{ $userOption->email }} — الرصيد ${{ number_format((float) $userOption->funds, 4) }}
                            </option>
                        @endforeach
                    </select>
                </label>
                <label>
                    <span>الرصيد المضاف بالدولار</span>
                    <input type="number" name="amount" step="0.0001" min="0.0001" value="{{ old('amount') }}" placeholder="مثال: 10.0000" required>
                </label>
                <label class="yd-credit-note">
                    <span>ملاحظة داخلية</span>
                    <input type="text" name="note" maxlength="500" value="{{ old('note') }}" placeholder="سبب إضافة الرصيد — اختياري">
                </label>
                <button type="submit" class="btn btn-primary"><i class="fa fa-wallet"></i> إضافة الرصيد وتسجيل العملية</button>
            </form>
        </section>
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
                        @if($isAdmin)<th>المحول إلى</th>@endif
                        <th>المبلغ</th>
                        <th>الرصيد</th>
                        @if($isAdmin)<th>الإثبات</th>@endif
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
                            $hasProof = in_array((int) $transaction->id, array_map('intval', $proofTransactionIds), true);
                            $notes = (string) $transaction->notes;
                            $destination = '-';
                            $senderPhone = '-';
                            if (preg_match('/Payment destination:\s*(.+)/i', $notes, $destinationMatch)) {
                                $destination = trim($destinationMatch[1]);
                            } elseif ($manual && stripos((string) optional($transaction->paymentMethod)->name, 'vodafone') !== false) {
                                $destination = '01205323440';
                            } elseif ($manual && stripos((string) optional($transaction->paymentMethod)->name, 'insta') !== false) {
                                $destination = 'menna_206@instapay';
                            }
                            if (preg_match('/Sender phone:\s*(.+)/i', $notes, $senderMatch)) {
                                $senderPhone = trim($senderMatch[1]);
                            }
                        @endphp
                        <tr>
                            <td><strong>{{ $transaction->transaction_id }}</strong></td>
                            @if($isAdmin)<td>{{ optional($transaction->user)->email ?: '-' }}</td>@endif
                            <td>{{ optional($transaction->paymentMethod)->name ?: 'غير محددة' }}</td>
                            @if($isAdmin)
                                <td>
                                    <strong class="yd-destination">{{ $destination }}</strong>
                                    @if($manual)<small>من: {{ $senderPhone }}</small>@endif
                                </td>
                            @endif
                            <td>
                                @if($manual)
                                    <strong>{{ number_format((float) $transaction->amount, 2) }} ج.م</strong>
                                @else
                                    <strong>${{ number_format((float) $transaction->amount, 4) }}</strong>
                                @endif
                            </td>
                            <td>
                                <strong>${{ number_format($credit, 4) }}</strong>
                                @if($manual)<small>{{ number_format($credit * $rate, 2) }} ج.م</small>@endif
                            </td>
                            @if($isAdmin)
                                <td>
                                    @if($manual && $hasProof)
                                        <a class="yd-proof-thumb" href="{{ route('admin.transactions.proof', $transaction->id) }}" target="_blank" rel="noopener" title="فتح صورة إثبات التحويل">
                                            <img src="{{ route('admin.transactions.proof', $transaction->id) }}" alt="إثبات التحويل">
                                            <span>فتح الصورة</span>
                                        </a>
                                    @elseif($manual)
                                        <span class="yd-no-proof">لا توجد صورة</span>
                                    @else
                                        <span>-</span>
                                    @endif
                                </td>
                            @endif
                            <td><span class="yd-ledger-status {{ $transaction->status === 'paid' ? 'paid' : ($pending ? 'pending' : 'refund') }}">{{ $status }}</span></td>
                            <td>{{ $transaction->created_at }}</td>
                            @if($isAdmin)
                                <td>
                                    <div class="yd-transaction-actions">
                                        @if($pending)
                                            <form action="{{ route('admin.transactions.update', $transaction->id) }}" method="post" class="yd-approve-form">
                                                @csrf
                                                @method('PUT')
                                                <input type="hidden" name="status" value="paid">
                                                <button type="submit" class="btn btn-primary" {{ $hasProof ? '' : 'disabled' }}>
                                                    اعتماد +${{ number_format($credit, 4) }}
                                                </button>
                                            </form>
                                        @endif
                                        <details class="yd-ledger-notes">
                                            <summary>التفاصيل</summary>
                                            <pre>{{ $transaction->notes ?: 'لا توجد ملاحظات' }}</pre>
                                        </details>
                                    </div>
                                </td>
                            @endif
                        </tr>
                    @empty
                        <tr><td colspan="{{ $isAdmin ? 11 : 6 }}" class="yd-ledger-empty">لا توجد معاملات مطابقة.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="yd-ledger-pagination">{{ $transactions->appends(request()->query())->links() }}</div>
    </section>
</main>

<style>
.yd-deposit-success-card{display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:18px;margin:18px 0;padding:20px 22px;border:1px solid #b9e7c6;border-radius:16px;background:#f3fff6;box-shadow:0 10px 26px rgba(24,120,57,.08)}
.yd-deposit-success-icon{width:58px;height:58px;display:grid;place-items:center;border-radius:50%;background:#1daa50;color:#fff;font-size:28px;font-weight:950}.yd-deposit-success-copy>span{display:block;color:#18833d;font-size:12px;font-weight:900}.yd-deposit-success-copy h2{margin:3px 0 5px;color:#17251c;font-size:21px;font-weight:950}.yd-deposit-success-copy p{margin:0;color:#4e5c53;font-size:14px;line-height:1.8}.yd-deposit-success-copy small{display:block;margin-top:7px;color:#6a756e}.yd-whatsapp-support{display:flex;align-items:center;gap:10px;min-width:180px;padding:11px 14px;border-radius:12px;background:#25d366;color:#fff!important;text-decoration:none!important;box-shadow:0 8px 18px rgba(37,211,102,.22)}.yd-whatsapp-support:hover{transform:translateY(-1px);box-shadow:0 12px 22px rgba(37,211,102,.28)}.yd-whatsapp-mark{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;background:#fff;color:#1aa34a;font-size:11px;font-weight:950}.yd-whatsapp-support strong,.yd-whatsapp-support small{display:block;color:#fff}.yd-whatsapp-support small{margin-top:2px;opacity:.9;font-size:10px}.yd-user-support-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0;padding:12px 15px;border:1px solid #e2e5e9;border-radius:12px;background:#fff}.yd-user-support-row span{color:#616975;font-size:12px;font-weight:800}.yd-user-support-row a{padding:8px 12px;border-radius:9px;background:#25d366;color:#fff!important;text-decoration:none!important;font-size:12px;font-weight:900}
.yd-manual-credit-card{margin-top:18px}.yd-manual-credit-card .block-header p{margin:5px 0 0;color:#68707e;font-size:12px}
.yd-manual-credit-form{display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(180px,.6fr) minmax(260px,1fr) auto;gap:12px;align-items:end;padding:18px}
.yd-manual-credit-form label{display:grid;gap:7px;margin:0;font-size:12px;font-weight:850;color:#343a45}.yd-manual-credit-form input,.yd-manual-credit-form select{width:100%;height:46px;box-sizing:border-box;border:1px solid #dfe3ea;border-radius:9px;background:#fff;padding:0 12px;font:inherit}.yd-manual-credit-form input:focus,.yd-manual-credit-form select:focus{outline:0;border-color:#f7c51e;box-shadow:0 0 0 3px rgba(247,197,30,.15)}.yd-manual-credit-form button{height:46px;white-space:nowrap}
.yd-ledger-table td small{display:block;margin-top:4px;color:#7a818c;font-size:11px}.yd-destination{direction:ltr;display:inline-block;unicode-bidi:plaintext}.yd-proof-thumb{display:inline-grid;gap:4px;text-decoration:none;text-align:center;color:#5c6572;font-size:10px;font-weight:800}.yd-proof-thumb img{width:64px;height:48px;object-fit:cover;border:1px solid #dfe3ea;border-radius:7px;background:#fff}.yd-no-proof{display:inline-block;padding:5px 7px;border-radius:7px;background:#fff0f0;color:#9f1717;font-size:11px;font-weight:800}.yd-transaction-actions{display:grid;gap:7px;min-width:130px}.yd-approve-form button:disabled{opacity:.45;cursor:not-allowed}.yd-ledger-notes summary{cursor:pointer;color:#56606d;font-size:11px;font-weight:800}.yd-ledger-notes pre{max-width:320px;white-space:pre-wrap;word-break:break-word;margin:7px 0 0;padding:9px;border-radius:7px;background:#f6f7f9;font-size:10px;line-height:1.6}
@media(max-width:1100px){.yd-manual-credit-form{grid-template-columns:1fr 1fr}.yd-credit-note{grid-column:1/-1}.yd-manual-credit-form button{grid-column:1/-1}}
@media(max-width:760px){.yd-deposit-success-card{grid-template-columns:48px 1fr}.yd-deposit-success-icon{width:48px;height:48px;font-size:22px}.yd-whatsapp-support{grid-column:1/-1;justify-content:center;width:100%;box-sizing:border-box}.yd-user-support-row{align-items:stretch;flex-direction:column}.yd-user-support-row a{text-align:center}}
@media(max-width:650px){.yd-manual-credit-form{grid-template-columns:1fr}.yd-credit-note,.yd-manual-credit-form button{grid-column:auto}}
</style>
@endsection