@extends('layouts.admin')

@section('content')
<main id="main-container">
<div class="content py-4 yd-manage-page">
    <div class="yd-manage-hero mb-4">
        <div class="yd-hero-user">
            <img src="{{ asset('images/avatars/' . (($user->avatar ?? '') ?: 'duck-happy.jpg')) }}" alt="" onerror="this.src='{{ asset('images/avatars/duck-happy.jpg') }}'">
            <div>
                <span class="yd-kicker">مركز التحكم بالعميل #{{ $user->id }}</span>
                <h1>{{ trim(($user->firstname ?? '') . ' ' . ($user->lastname ?? '')) ?: $user->username }}</h1>
                <p>{{ '@'.$user->username }} · {{ $user->email }}</p>
            </div>
        </div>
        <div class="yd-hero-stats">
            <div><small>الرصيد الحالي</small><strong>${{ number_format((float)$user->funds, 4) }}</strong></div>
            <div><small>الحالة</small><strong>{{ $user->status === 'active' ? 'نشط' : 'غير نشط' }}</strong></div>
            <a href="{{ route('admin.users.index') }}" class="btn btn-light">العودة للمستخدمين</a>
        </div>
    </div>

    @if(session('success'))
        <div class="alert alert-success yd-alert">{{ session('success') }}</div>
    @endif
    @if($errors->any())
        <div class="alert alert-danger yd-alert">
            @foreach($errors->all() as $error)<div>{{ $error }}</div>@endforeach
        </div>
    @endif

    <div class="yd-grid-two mb-4">
        <section class="block block-rounded yd-card">
            <div class="block-header"><h3 class="block-title">بيانات الحساب</h3><span class="yd-pill">البريد وكلمة المرور</span></div>
            <div class="block-content">
                <form method="POST" action="{{ route('admin.users.manage.profile', $user->id) }}" class="yd-form">
                    @csrf
                    <div class="yd-fields-two">
                        <label><span>الاسم الأول</span><input class="form-control" name="firstname" value="{{ old('firstname', $user->firstname) }}" required></label>
                        <label><span>اسم العائلة</span><input class="form-control" name="lastname" value="{{ old('lastname', $user->lastname) }}" required></label>
                    </div>
                    <div class="yd-fields-two">
                        <label><span>اسم المستخدم</span><input class="form-control" name="username" value="{{ old('username', $user->username) }}" required></label>
                        <label><span>البريد الإلكتروني</span><input class="form-control" type="email" name="email" value="{{ old('email', $user->email) }}" required></label>
                    </div>
                    <label><span>حالة الحساب</span>
                        <select class="form-control" name="status" required>
                            <option value="active" {{ old('status', $user->status) === 'active' ? 'selected' : '' }}>نشط</option>
                            <option value="deactive" {{ old('status', $user->status) === 'deactive' ? 'selected' : '' }}>غير نشط</option>
                        </select>
                    </label>
                    <div class="yd-password-box">
                        <strong>تغيير كلمة المرور</strong><small>اترك الحقلين فارغين لو مش عايز تغيرها.</small>
                        <div class="yd-fields-two">
                            <label><span>كلمة المرور الجديدة</span><input class="form-control" type="password" name="password" minlength="8" autocomplete="new-password"></label>
                            <label><span>تأكيد كلمة المرور</span><input class="form-control" type="password" name="password_confirmation" minlength="8" autocomplete="new-password"></label>
                        </div>
                    </div>
                    <button class="btn btn-primary yd-wide-btn" type="submit">حفظ بيانات العميل</button>
                </form>
            </div>
        </section>

        <section class="block block-rounded yd-card">
            <div class="block-header"><h3 class="block-title">تعديل الرصيد</h3><span class="yd-pill">مسجل في السجل المالي</span></div>
            <div class="block-content">
                <div class="yd-balance-current">
                    <span>الرصيد الحالي</span><strong>${{ number_format((float)$user->funds, 4) }}</strong>
                </div>
                <form method="POST" action="{{ route('admin.users.manage.balance', $user->id) }}" class="yd-form">
                    @csrf
                    <label><span>نوع العملية</span>
                        <select class="form-control" name="action" required>
                            <option value="credit">إضافة رصيد</option>
                            <option value="debit">خصم رصيد</option>
                        </select>
                    </label>
                    <label><span>المبلغ بالدولار</span><input class="form-control" type="number" name="amount" min="0.0001" step="0.0001" placeholder="مثال: 10.0000" required></label>
                    <label><span>ملاحظة إدارية</span><textarea class="form-control" name="note" rows="3" maxlength="500" placeholder="سبب الإضافة أو الخصم"></textarea></label>
                    <div class="yd-warning-note">الخصم لن يسمح بجعل رصيد العميل بالسالب. كل تعديل يُسجل باسم الأدمن والرصيد قبل وبعد العملية.</div>
                    <button class="btn btn-primary yd-wide-btn" type="submit">تنفيذ تعديل الرصيد</button>
                </form>
            </div>
        </section>
    </div>

    <section class="block block-rounded yd-card mb-4">
        <div class="block-header"><h3 class="block-title">إنشاء طلب للعميل</h3><span class="yd-pill">يُخصم من رصيده تلقائيًا</span></div>
        <div class="block-content">
            <form method="POST" action="{{ route('admin.users.manage.order', $user->id) }}" class="yd-form yd-order-form" id="admin-user-order-form">
                @csrf
                <input type="hidden" name="service_id" id="yd-service-id" value="{{ old('service_id') }}">
                <div class="yd-service-search-wrap">
                    <label><span>ابحث عن الخدمة بالاسم أو ID</span><input class="form-control" id="yd-service-search" autocomplete="off" placeholder="اكتب Instagram أو 1234..." required></label>
                    <div id="yd-service-results" class="yd-service-results" hidden></div>
                </div>
                <div id="yd-selected-service" class="yd-selected-service" hidden>
                    <div><small>الخدمة المختارة</small><strong id="yd-selected-service-name"></strong></div>
                    <div><small>السعر لكل 1000</small><strong id="yd-selected-rate"></strong></div>
                    <div><small>الحدود</small><strong id="yd-selected-limits"></strong></div>
                    <button type="button" class="btn btn-sm btn-light" id="yd-clear-service">تغيير</button>
                </div>
                <div class="yd-fields-three">
                    <label><span>الكمية</span><input class="form-control" id="yd-order-quantity" type="number" name="quantity" value="{{ old('quantity') }}" min="1" step="1" required></label>
                    <label class="yd-span-two"><span>الرابط / الهدف</span><input class="form-control" name="link" value="{{ old('link') }}" maxlength="2048" placeholder="https://..." required></label>
                </div>
                <label><span>ملاحظة على الطلب (اختياري)</span><textarea class="form-control" name="notes" rows="2" maxlength="5000">{{ old('notes') }}</textarea></label>
                <div class="yd-order-summary">
                    <span>التكلفة التقديرية التي ستُخصم من رصيد العميل</span><strong id="yd-order-total">$0.0000</strong>
                </div>
                <button class="btn btn-primary yd-wide-btn" type="submit" id="yd-create-order">إنشاء الطلب وخصم التكلفة</button>
            </form>
        </div>
    </section>

    <section class="block block-rounded yd-card mb-4">
        <div class="block-header"><h3 class="block-title">آخر طلبات العميل</h3><span class="yd-pill">{{ $orders->count() }} طلب ظاهر</span></div>
        <div class="block-content p-0">
            <div class="table-responsive">
                <table class="table table-hover table-vcenter mb-0 yd-data-table">
                    <thead><tr><th>#</th><th>الخدمة</th><th>الرابط</th><th>الكمية</th><th>التكلفة</th><th>الحالة</th><th>Provider ID</th><th>التاريخ</th></tr></thead>
                    <tbody>
                    @forelse($orders as $order)
                        <tr>
                            <td><strong>#{{ $order->id }}</strong></td>
                            <td><div class="yd-service-cell"><strong>{{ $order->service ? $order->service->name : 'خدمة محذوفة' }}</strong><small>{{ $order->service && $order->service->category ? $order->service->category->name : '' }}</small></div></td>
                            <td><a href="{{ $order->link }}" target="_blank" rel="noopener" class="yd-link-cut">{{ $order->link }}</a></td>
                            <td>{{ number_format((int)$order->quantity) }}</td>
                            <td>${{ number_format((float)$order->total, 4) }}</td>
                            <td><span class="yd-order-status">{{ $order->status }}</span></td>
                            <td>{{ $order->order_api_id ?: '—' }}</td>
                            <td>{{ $order->created_at }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="8" class="text-center py-5 text-muted">لا توجد طلبات لهذا العميل حتى الآن.</td></tr>
                    @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <div class="yd-grid-two">
        <section class="block block-rounded yd-card">
            <div class="block-header"><h3 class="block-title">آخر المعاملات المالية</h3></div>
            <div class="block-content p-0">
                <div class="table-responsive"><table class="table table-vcenter mb-0 yd-data-table"><thead><tr><th>العملية</th><th>الطريقة</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>
                @forelse($transactions as $transaction)
                    <tr><td>{{ $transaction->transaction_id }}</td><td>{{ $transaction->paymentMethod ? $transaction->paymentMethod->name : '—' }}</td><td>${{ number_format((float)$transaction->amount,4) }}</td><td>{{ $transaction->status }}</td><td>{{ $transaction->created_at }}</td></tr>
                @empty<tr><td colspan="5" class="text-center py-4 text-muted">لا توجد معاملات.</td></tr>@endforelse
                </tbody></table></div>
            </div>
        </section>
        <section class="block block-rounded yd-card">
            <div class="block-header"><h3 class="block-title">سجل تعديلات الأدمن</h3></div>
            <div class="block-content yd-audit-list">
                @forelse($audits as $audit)
                    @php $payload = json_decode($audit->payload ?: '{}', true) ?: []; @endphp
                    <div class="yd-audit-item">
                        <div><strong>{{ str_replace('_',' ', $audit->action) }}</strong><small>{{ $audit->created_at }}</small></div>
                        @if(isset($payload['amount']))<span>${{ number_format((float)$payload['amount'],4) }}</span>@endif
                    </div>
                @empty
                    <div class="text-muted text-center py-4">لا توجد تعديلات إدارية مسجلة بعد.</div>
                @endforelse
            </div>
        </section>
    </div>
</div>
</main>
@endsection

@section('css')
<style>
.yd-manage-page{max-width:1500px;margin:auto}.yd-manage-hero{display:flex;justify-content:space-between;align-items:center;gap:25px;background:linear-gradient(135deg,#171b24,#252b36);color:#fff;border-radius:15px;padding:26px 30px;border-bottom:3px solid #ffc51b}.yd-hero-user{display:flex;align-items:center;gap:16px}.yd-hero-user img{width:68px;height:68px;border-radius:50%;object-fit:cover;border:3px solid #ffc51b}.yd-hero-user h1{margin:3px 0;font-size:27px}.yd-hero-user p{margin:0;color:#c9d0da}.yd-kicker{font-size:12px;color:#ffd75f;font-weight:800}.yd-hero-stats{display:flex;align-items:center;gap:12px}.yd-hero-stats>div{background:rgba(255,255,255,.08);padding:10px 14px;border-radius:10px;min-width:115px}.yd-hero-stats small,.yd-hero-stats strong{display:block}.yd-hero-stats small{color:#bfc6d1;font-size:11px}.yd-hero-stats strong{font-size:18px}.yd-grid-two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.yd-card{border:1px solid #e5e9ef;box-shadow:0 10px 26px rgba(20,27,40,.05)}.yd-pill{font-size:11px;font-weight:800;color:#705700;background:#fff6ce;border-radius:999px;padding:6px 9px}.yd-form{display:grid;gap:14px}.yd-form label{margin:0}.yd-form label>span{display:block;font-size:12px;font-weight:800;color:#4b5563;margin-bottom:6px}.yd-form .form-control{min-height:45px;border-radius:9px;border-color:#dce2ea}.yd-fields-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.yd-fields-three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.yd-span-two{grid-column:span 2}.yd-password-box{background:#f7f9fc;border:1px solid #e7ebf1;border-radius:11px;padding:13px}.yd-password-box>strong,.yd-password-box>small{display:block}.yd-password-box>small{color:#77808d;margin:3px 0 10px}.yd-wide-btn{min-height:46px;font-weight:800}.yd-balance-current{display:flex;justify-content:space-between;align-items:center;background:#171b24;color:#fff;padding:17px;border-radius:12px;margin-bottom:15px}.yd-balance-current strong{font-size:27px;color:#ffd243}.yd-warning-note{font-size:12px;color:#785d00;background:#fff8da;padding:10px 12px;border-radius:9px;border:1px solid #f3dfa0}.yd-service-search-wrap{position:relative}.yd-service-results{position:absolute;z-index:50;top:74px;right:0;left:0;background:#fff;border:1px solid #dce2ea;border-radius:10px;box-shadow:0 14px 32px rgba(0,0,0,.12);max-height:320px;overflow:auto}.yd-service-option{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border-bottom:1px solid #eef1f5;cursor:pointer}.yd-service-option:hover{background:#fff9df}.yd-service-option strong,.yd-service-option small{display:block}.yd-service-option small{color:#77808d}.yd-selected-service{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:center;background:#f7f9fc;border:1px solid #e3e8ef;border-radius:11px;padding:12px}.yd-selected-service small,.yd-selected-service strong{display:block}.yd-selected-service small{font-size:11px;color:#7b8490}.yd-order-summary{display:flex;justify-content:space-between;align-items:center;background:#171b24;color:#fff;padding:13px 16px;border-radius:10px}.yd-order-summary strong{color:#ffd044;font-size:20px}.yd-data-table th{font-size:11px;color:#6b7280;white-space:nowrap}.yd-data-table td{vertical-align:middle}.yd-service-cell strong,.yd-service-cell small{display:block;min-width:180px}.yd-service-cell small{color:#7b8490}.yd-link-cut{display:block;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yd-order-status{display:inline-block;background:#fff4c2;color:#6d5600;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:800}.yd-audit-list{display:grid;gap:8px}.yd-audit-item{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #e8edf3;border-radius:9px;padding:10px 12px}.yd-audit-item strong,.yd-audit-item small{display:block}.yd-audit-item small{font-size:11px;color:#7c8592}.yd-alert{border-radius:10px}@media(max-width:900px){.yd-grid-two{grid-template-columns:1fr}.yd-manage-hero{align-items:flex-start;flex-direction:column}.yd-hero-stats{width:100%;flex-wrap:wrap}.yd-fields-three{grid-template-columns:1fr}.yd-span-two{grid-column:auto}.yd-selected-service{grid-template-columns:1fr 1fr}.yd-fields-two{grid-template-columns:1fr}}@media(max-width:560px){.yd-manage-hero{padding:20px}.yd-hero-user h1{font-size:22px}.yd-hero-stats>div{flex:1}.yd-selected-service{grid-template-columns:1fr}}
</style>
@endsection

@section('scripts')
<script>
(function(){
    var input=document.getElementById('yd-service-search');
    var results=document.getElementById('yd-service-results');
    var hidden=document.getElementById('yd-service-id');
    var selected=document.getElementById('yd-selected-service');
    var selectedName=document.getElementById('yd-selected-service-name');
    var selectedRate=document.getElementById('yd-selected-rate');
    var selectedLimits=document.getElementById('yd-selected-limits');
    var quantity=document.getElementById('yd-order-quantity');
    var total=document.getElementById('yd-order-total');
    var clear=document.getElementById('yd-clear-service');
    var form=document.getElementById('admin-user-order-form');
    if(!input||!results||!hidden||!form)return;
    var timer=null,current=null;
    function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
    function updateTotal(){var q=parseInt(quantity.value||'0',10)||0;var rate=current?Number(current.rate||0):0;total.textContent='$'+((q*rate)/1000).toFixed(4);}
    function choose(service){current=service;hidden.value=service.id;input.value='#'+service.id+' — '+service.name;selectedName.textContent=service.name;selectedRate.textContent='$'+Number(service.rate||0).toFixed(4);selectedLimits.textContent=service.min+' → '+service.max;quantity.min=service.min||1;quantity.max=service.max||'';selected.hidden=false;results.hidden=true;updateTotal();}
    function render(items){results.innerHTML='';if(!items.length){results.innerHTML='<div class="p-3 text-muted">لا توجد خدمات مطابقة.</div>';results.hidden=false;return;}items.forEach(function(s){var row=document.createElement('div');row.className='yd-service-option';row.innerHTML='<div><strong>#'+esc(s.id)+' — '+esc(s.name)+'</strong><small>'+esc(s.category||'')+'</small></div><div><strong>$'+Number(s.rate||0).toFixed(4)+'</strong><small>'+esc(s.min)+' - '+esc(s.max)+'</small></div>';row.addEventListener('click',function(){choose(s);});results.appendChild(row);});results.hidden=false;}
    function search(){var q=input.value.trim();if(q.length<1){results.hidden=true;return;}fetch('{{ route('admin.users.manage.services') }}?q='+encodeURIComponent(q),{headers:{'Accept':'application/json','X-Requested-With':'XMLHttpRequest'},credentials:'same-origin'}).then(function(r){return r.json();}).then(function(data){render(data.services||[]);}).catch(function(){results.innerHTML='<div class="p-3 text-danger">تعذر تحميل الخدمات.</div>';results.hidden=false;});}
    input.addEventListener('input',function(){hidden.value='';current=null;selected.hidden=true;clearTimeout(timer);timer=setTimeout(search,280);});
    quantity.addEventListener('input',updateTotal);
    clear.addEventListener('click',function(){hidden.value='';current=null;input.value='';selected.hidden=true;total.textContent='$0.0000';input.focus();});
    form.addEventListener('submit',function(e){if(!hidden.value){e.preventDefault();input.focus();results.hidden=false;return;}var btn=document.getElementById('yd-create-order');if(btn){btn.disabled=true;btn.textContent='جاري إنشاء الطلب...';}});
})();
</script>
@endsection
