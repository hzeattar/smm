@extends('layouts.admin')

@section('content')
<main id="main-container">
    <div class="content py-4 yd-users-page">
        <div class="yd-users-hero mb-4">
            <div>
                <span class="yd-kicker">إدارة العملاء</span>
                <h1>المستخدمون والتحكم بالحسابات</h1>
                <p>افتح ملف أي عميل لتعديل بياناته، إضافة أو خصم رصيد، إنشاء طلب له ومراجعة طلباته ومعاملاته.</p>
            </div>
        </div>

        @if(session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif
        @if($errors->any())
            <div class="alert alert-danger">
                @foreach($errors->all() as $error)<div>{{ $error }}</div>@endforeach
            </div>
        @endif

        <div class="block block-rounded yd-card mb-4">
            <div class="block-content py-3">
                <form method="GET" action="{{ route('admin.users.index') }}" class="yd-user-search">
                    <input type="search" name="search" value="{{ request('search') }}" class="form-control" placeholder="ابحث بالاسم أو اسم المستخدم أو البريد أو رقم المستخدم">
                    <button type="submit" class="btn btn-primary">بحث</button>
                    @if(request('search'))
                        <a href="{{ route('admin.users.index') }}" class="btn btn-light">مسح البحث</a>
                    @endif
                </form>
            </div>
        </div>

        <div class="block block-rounded yd-card">
            <div class="block-header">
                <h3 class="block-title">كل المستخدمين</h3>
                <span class="yd-count">{{ number_format($users->total()) }} مستخدم</span>
            </div>
            <div class="block-content p-0">
                <div class="table-responsive">
                    <table class="table table-hover table-vcenter mb-0 yd-users-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>المستخدم</th>
                                <th>البريد</th>
                                <th>الرصيد</th>
                                <th>الحالة</th>
                                <th>تاريخ الإنشاء</th>
                                <th>التحكم</th>
                            </tr>
                        </thead>
                        <tbody>
                        @forelse($users as $user)
                            <tr>
                                <td class="text-muted">{{ $user->id }}</td>
                                <td>
                                    <div class="yd-user-cell">
                                        <img src="{{ asset('images/avatars/' . (($user->avatar ?? '') ?: 'duck-happy.jpg')) }}" alt="" onerror="this.src='{{ asset('images/avatars/duck-happy.jpg') }}'">
                                        <div>
                                            <strong>{{ trim(($user->firstname ?? '') . ' ' . ($user->lastname ?? '')) ?: $user->username }}</strong>
                                            <small>{{ '@' . $user->username }}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>{{ $user->email }}</td>
                                <td><strong class="yd-balance">${{ number_format((float)$user->funds, 4) }}</strong></td>
                                <td>
                                    <span class="yd-status {{ $user->status === 'active' ? 'is-active' : 'is-off' }}">
                                        {{ $user->status === 'active' ? 'نشط' : 'غير نشط' }}
                                    </span>
                                </td>
                                <td>{{ $user->created_at }}</td>
                                <td>
                                    <a href="{{ route('admin.users.manage', $user->id) }}" class="btn btn-sm btn-primary yd-manage-btn">إدارة الحساب</a>
                                </td>
                            </tr>
                        @empty
                            <tr><td colspan="7" class="text-center py-5 text-muted">لا توجد نتائج.</td></tr>
                        @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
            @if($users->hasPages())
                <div class="block-content border-top yd-pagination-wrap">
                    {{ $users->appends(request()->query())->links() }}
                </div>
            @endif
        </div>
    </div>
</main>
@endsection

@section('css')
<style>
.yd-users-page{max-width:1500px;margin:auto}.yd-users-hero{background:linear-gradient(135deg,#181c25,#242a35);color:#fff;border-radius:14px;padding:28px 30px;border-bottom:3px solid #ffc51b}.yd-users-hero h1{font-size:28px;margin:5px 0 8px}.yd-users-hero p{margin:0;color:#c8ced9}.yd-kicker{color:#ffd75f;font-size:12px;font-weight:800}.yd-card{border:1px solid #e5e9f0;box-shadow:0 12px 28px rgba(18,25,38,.05)}.yd-user-search{display:flex;gap:10px}.yd-user-search input{min-height:44px}.yd-count{background:#fff6ce;color:#6a5200;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800}.yd-users-table th{font-size:12px;color:#6b7280;white-space:nowrap}.yd-user-cell{display:flex;align-items:center;gap:10px;min-width:180px}.yd-user-cell img{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #ffd043}.yd-user-cell strong,.yd-user-cell small{display:block}.yd-user-cell small{color:#7a8290}.yd-balance{color:#111827;white-space:nowrap}.yd-status{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800}.yd-status.is-active{background:#e8f8ed;color:#17803d}.yd-status.is-off{background:#fff0f0;color:#c0392b}.yd-manage-btn{white-space:nowrap}.yd-pagination-wrap nav{display:flex;justify-content:center}@media(max-width:700px){.yd-user-search{flex-wrap:wrap}.yd-user-search input{width:100%}.yd-users-hero{padding:22px}.yd-users-hero h1{font-size:23px}}
</style>
@endsection
