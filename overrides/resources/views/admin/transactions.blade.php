@extends('layouts.admin')

@section('content')
@php
    $isAdmin = Gate::allows('isAdmin');
    $rate = \App\Support\YellowDuckMoney::exchangeRate();
    $proofTransactionIds = $proofTransactionIds ?? [];
    $users = $users ?? collect();
    $supportWhatsapp = 'https://wa.me/201205323440';
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

    @if(!$isAdmin && session('deposit_submitted'))
        <section class="yd-deposit-confirmation" role="status" aria-live="polite">
            <div class="yd-confirm-icon" aria-hidden="true">✓</div>
            <div class="yd-confirm-copy">
                <span>تم استلام طلب الإيداع</span>
                <h2>طلبك الآن قيد المراجعة</h2>
                <p>بمجرد التأكد من التحويل وصورة الإثبات سيتم إضافة الرصيد إلى حسابك تلقائيًا بعد اعتماد الأدمن.</p>
                @if(session('deposit_reference'))
                    <small>رقم الطلب: <strong dir="ltr">{{ session('deposit_reference') }}</strong></small>
                @endif
            </div>
            <a class="yd-whatsapp-support" href="{{ $supportWhatsapp }}" target="_blank" rel="noopener noreferrer" aria-label="التواصل مع الدعم عبر واتساب">
                <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.11 17.26c-.27-.14-1.59-.78-1.84-.87-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.72-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.46.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28s.98 2.64 1.11 2.82c.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.56.58.65.21 1.24.18 1.71.11.52-.08 1.59-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32zM16.03 4.8c-6.18 0-11.2 5.02-11.2 11.2 0 1.98.52 3.92 1.5 5.62L4.74 27.4l5.91-1.55A11.14 11.14 0 0 0 16.03 27.2c6.18 0 11.2-5.02 11.2-11.2s-5.02-11.2-11.2-11.2zm0 20.51c-1.74 0-3.45-.47-4.94-1.35l-.35-.21-3.51.92.94-3.42-.23-.35A9.27 9.27 0 0 1 6.72 16c0-5.13 4.18-9.31 9.31-9.31s9.31 4.18 9.31 9.31-4.18 9.31-9.31 9.31z"/></svg>
                <span>التواصل مع الدعم عبر واتساب</span>
            </a>
        </section>
    @elseif(session('success'))
        <div class="yd-funds-alert success">{{ session('success') }}</div>
    @endif

    @if($errors->any())
        <div class="yd-funds-alert error">{{ $errors->first() }}</div>
    @endif

    @if(!$isAdmin && !session('deposit_submitted'))
        <div class="yd-support-inline">
            <span>تحتاج مساعدة بخصوص إيداع؟</span>
            <a href="{{ $supportWhatsapp }}" target="_blank" rel="noopener noreferrer">تواصل مع الدعم عبر واتساب</a>
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
.yd-deposit-confirmation{display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:18px;margin:18px 0;padding:20px 22px;border:1px solid #b8e5c9;border-radius:14px;background:linear-gradient(135deg,#f4fff7,#fff);box-shadow:0 10px 28px rgba(28,141,76,.08)}
.yd-confirm-icon{width:54px;height:54px;display:grid;place-items:center;border-radius:50%;background:#20a957;color:#fff;font-size:28px;font-weight:950}.yd-confirm-copy>span{display:block;color:#168847;font-size:12px;font-weight:950}.yd-confirm-copy h2{margin:3px 0 5px;font-size:22px;font-weight:950;color:#16251c}.yd-confirm-copy p{margin:0;color:#53605a;line-height:1.8}.yd-confirm-copy small{display:block;margin-top:7px;color:#69756e}.yd-confirm-copy small strong{color:#27342d}
.yd-whatsapp-support{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:46px;padding:0 16px;border-radius:10px;background:#25d366;color:#0b2e18!important;text-decoration:none!important;font-weight:950;white-space:nowrap;box-shadow:0 8px 20px rgba(37,211,102,.18)}.yd-whatsapp-support:hover{transform:translateY(-1px);box-shadow:0 12px 24px rgba(37,211,102,.26)}.yd-whatsapp-support svg{width:21px;height:21px;flex:0 0 auto}
.yd-support-inline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#5d6672;font-size:12px}.yd-support-inline a{color:#138a46;font-weight:900;text-decoration:none}.yd-support-inline a:hover{text-decoration:underline}
.yd-manual-credit-card{margin-top:18px}.yd-manual-credit-card .block-header p{margin:5px 0 0;color:#68707e;font-size:12px}
.yd-manual-credit-form{display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(180px,.6fr) minmax(260px,1fr) auto;gap:12px;align-items:end;padding:18px}
.yd-manual-credit-form label{display:grid;gap:7px;margin:0;font-size:12px;font-weight:850;color:#343a45}.yd-manual-credit-form input,.yd-manual-credit-form select{width:100%;height:46px;box-sizing:border-box;border:1px solid #dfe3ea;border-radius:9px;background:#fff;padding:0 12px;font:inherit}.yd-manual-credit-form input:focus,.yd-manual-credit-form select:focus{outline:0;border-color:#f7c51e;box-shadow:0 0 0 3px rgba(247,197,30,.15)}.yd-manual-credit-form button{height:46px;white-space:nowrap}
.yd-ledger-table td small{display:block;margin-top:4px;color:#7a818c;font-size:11px}.yd-destination{direction:ltr;display:inline-block;unicode-bidi:plaintext}.yd-proof-thumb{display:inline-grid;gap:4px;text-decoration:none;text-align:center;color:#5c6572;font-size:10px;font-weight:800}.yd-proof-thumb img{width:64px;height:48px;object-fit:cover;border:1px solid #dfe3ea;border-radius:7px;background:#fff}.yd-no-proof{display:inline-block;padding:5px 7px;border-radius:7px;background:#fff0f0;color:#9f1717;font-size:11px;font-weight:800}.yd-transaction-actions{display:grid;gap:7px;min-width:130px}.yd-approve-form button:disabled{opacity:.45;cursor:not-allowed}.yd-ledger-notes summary{cursor:pointer;color:#56606d;font-size:11px;font-weight:800}.yd-ledger-notes pre{max-width:320px;white-space:pre-wrap;word-break:break-word;margin:7px 0 0;padding:9px;border-radius:7px;background:#f6f7f9;font-size:10px;line-height:1.6}
@media(max-width:1100px){.yd-manual-credit-form{grid-template-columns:1fr 1fr}.yd-credit-note{grid-column:1/-1}.yd-manual-credit-form button{grid-column:1/-1}.yd-deposit-confirmation{grid-template-columns:54px 1fr}.yd-whatsapp-support{grid-column:1/-1}}
@media(max-width:650px){.yd-manual-credit-form{grid-template-columns:1fr}.yd-credit-note,.yd-manual-credit-form button{grid-column:auto}.yd-deposit-confirmation{grid-template-columns:1fr;text-align:center}.yd-confirm-icon{margin:auto}.yd-support-inline{align-items:flex-start;flex-direction:column}}
</style>
@endsection
