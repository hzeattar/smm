import React, { useState, useEffect } from 'react';
import { User, Order, Transaction, Service, Category, PlatformStats, Ticket } from '../types';
import {
  ShieldAlert,
  Users,
  ShoppingBag,
  DollarSign,
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  Settings,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Eye,
  Download,
  Image,
  Send,
  Server,
  Zap,
  Database,
  Activity,
} from 'lucide-react';

interface AdminDashboardProps {
  admin: User;
  exchangeRate: number;
  onRefresh: () => void;
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin,
  exchangeRate,
  onRefresh,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'deposits' | 'tickets' | 'users' | 'services' | 'settings'>('orders');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [syncingProvider, setSyncingProvider] = useState(false);
  const [loading, setLoading] = useState(true);

  // Proof image preview modal
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  // Tickets state
  const [activeAdminTicketId, setActiveAdminTicketId] = useState<number | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Balance adjustment modal state
  const [adjustUserId, setAdjustUserId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustAction, setAdjustAction] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState('');

  // Exchange rate editor state
  const [newRate, setNewRate] = useState<number>(exchangeRate);

  // New service modal state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCatId, setNewServiceCatId] = useState<number>(1);
  const [newServiceRate, setNewServiceRate] = useState<number | ''>('');
  const [newServiceMin, setNewServiceMin] = useState<number>(100);
  const [newServiceMax, setNewServiceMax] = useState<number>(10000);
  const [newServiceDesc, setNewServiceDesc] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordRes, txRes, usrRes, srvRes, catRes, tickRes, provRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/orders?status=all', { headers: { 'x-user-role': 'admin' } }),
        fetch('/api/transactions', { headers: { 'x-user-role': 'admin' } }),
        fetch('/api/admin/users', { headers: { 'x-user-role': 'admin' } }),
        fetch('/api/services'),
        fetch('/api/categories'),
        fetch('/api/tickets', { headers: { 'x-user-role': 'admin' } }),
        fetch('/api/admin/provider', { headers: { 'x-user-role': 'admin' } }),
      ]);

      const [statsData, ordData, txData, usrData, srvData, catData, tickData, provData] = await Promise.all([
        statsRes.json(),
        ordRes.json(),
        txRes.json(),
        usrRes.json(),
        srvRes.json(),
        catRes.json(),
        tickRes.json(),
        provRes.json().catch(() => null),
      ]);

      setStats(statsData);
      setOrders(ordData.orders || []);
      setTransactions(txData.transactions || []);
      setUsersList(usrData || []);
      setServicesList(srvData || []);
      setCategories(catData || []);
      setTickets(tickData.tickets || []);
      if (provData) setProviderInfo(provData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProvider = async () => {
    setSyncingProvider(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/provider/sync', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || 'تمت مزامنة الطلبات مع المزود بنجاح');
        fetchAdminData();
      } else {
        setActionError(data.error || 'فشلت المزامنة');
      }
    } catch {
      setActionError('تعذر الاتصال بالمزود حالياً');
    } finally {
      setSyncingProvider(false);
    }
  };

  // Admin reply to ticket
  const handleAdminTicketReply = async (ticketId: number) => {
    if (!adminReplyText.trim()) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ message: adminReplyText }),
      });
      if (res.ok) {
        setAdminReplyText('');
        fetchAdminData();
        setActionSuccess('تم إرسال رد الإدارة على التذكرة بنجاح');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin update ticket status
  const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchAdminData();
        setActionSuccess('تم تحديث حالة التذكرة بنجاح');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Update order status
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(`تم تحديث حالة الطلب #${orderId} إلى: ${newStatus}`);
      fetchAdminData();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  // Approve deposit
  const handleApproveDeposit = async (txId: number) => {
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/transactions/${txId}/approve`, {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(data.message);
      fetchAdminData();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'تعذر اعتماد الإيداع');
    }
  };

  // Reject deposit
  const handleRejectDeposit = async (txId: number) => {
    const reason = prompt('سبب رفض الإيداع:') || 'بيانات التحويل غير مطابقة';
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/transactions/${txId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess('تم رفض الإيداع وتحديث الحالة');
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'تعذر رفض الإيداع');
    }
  };

  // Adjust balance
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustAmount || Number(adjustAmount) <= 0) return;

    try {
      const res = await fetch(`/api/admin/users/${adjustUserId}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          amount: adjustAmount,
          action: adjustAction,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(`تم تحديث رصيد العميل بنجاح`);
      setAdjustUserId(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchAdminData();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'تعذر تعديل الرصيد');
    }
  };

  // Update exchange rate
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ rate: newRate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(`تم تحديث سعر صرف الدولار إلى ${newRate} ج.م`);
      fetchAdminData();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'تعذر تحديث سعر الصرف');
    }
  };

  // Create new service
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServiceRate) return;

    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          categoryId: newServiceCatId,
          name: newServiceName,
          rate: newServiceRate,
          min: newServiceMin,
          max: newServiceMax,
          description: newServiceDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(`تمت إضافة الخدمة الجديدة بنجاح`);
      setNewServiceName('');
      setNewServiceRate('');
      setNewServiceDesc('');
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'تعذر إضافة الخدمة');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Admin Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#181b26] to-[#181b26] border border-amber-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>لوحة الإدارة المركزية - البطة الصفرا</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">متابعة تشغيل المنصة</h1>
            <p className="text-xs text-slate-400 mt-1">
              إدارة طلبات العملاء، اعتماد التحويلات اليدوية، والتحكم في أسعار الخدمات وسعر الصرف.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchAdminData();
                onRefresh();
              }}
              className="p-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-slate-300 hover:text-white transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-amber-300 text-xs font-bold transition-colors"
            >
              الذهاب إلى واجهة العميل
            </button>
          </div>
        </div>

        {/* Global Action Alerts */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-xs hover:underline">
              إغلاق
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-xs hover:underline">
              إغلاق
            </button>
          </div>
        )}

        {/* Admin KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs">إجمالي الإيرادات</span>
              <DollarSign className="w-4 h-4 text-[#f6b100]" />
            </div>
            <div className="text-xl font-black text-white">
              {stats?.totalEarningsEgp.toLocaleString() || 0} ج.م
            </div>
            <span className="text-[11px] text-slate-400">${stats?.totalEarningsUsd || 0} USD</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs">المستخدمون النشطون</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white">{stats?.activeUsers || 0}</div>
            <span className="text-[11px] text-emerald-400">حسابات مفعلة</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs">كل الطلبات</span>
              <ShoppingBag className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-black text-white">{stats?.totalOrders || 0}</div>
            <span className="text-[11px] text-slate-400">
              {stats?.completedOrders || 0} مكتمل | {stats?.pendingOrders || 0} قيد الانتظار
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs">الخدمات النشطة</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white">{stats?.activeServices || 0}</div>
            <span className="text-[11px] text-slate-400">جاهزة للطلب</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#272c3d] pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>إدارة الطلبات ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'deposits' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>
              اعتماد الإيداعات ({transactions.filter((t) => t.status === 'pending').length} معلق)
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'tickets' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              تذاكر الدعم ({tickets.filter((t) => t.status === 'open').length} مفتوحة)
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المستخدمون ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'services' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>إدارة الخدمات ({servicesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>سعر الصرف والنسخ الاحتياطي</span>
          </button>
        </div>

        {/* TAB 1: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
            <h2 className="text-lg font-black text-white mb-1">إدارة كل الطلبات</h2>
            <p className="text-xs text-slate-400 mb-6">
              تغيير حالة الطلب (قيد الانتظار، قيد التنفيذ، مكتمل، ملغي مع استرجاع الرصيد تلقائياً)
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                  <tr>
                    <th className="p-3.5 font-bold">الرقم</th>
                    <th className="p-3.5 font-bold">الخدمة</th>
                    <th className="p-3.5 font-bold">الرابط</th>
                    <th className="p-3.5 font-bold">الكمية</th>
                    <th className="p-3.5 font-bold">التكلفة</th>
                    <th className="p-3.5 font-bold">الحالة الحالية</th>
                    <th className="p-3.5 font-bold">تغيير الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#272c3d]/50">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#222634]/40 transition-colors">
                      <td className="p-3.5 font-black text-white">#{o.id}</td>
                      <td className="p-3.5 max-w-xs text-slate-200">
                        <div className="font-semibold">{o.serviceName}</div>
                        <div className="text-[10px] text-slate-500">{o.categoryName}</div>
                      </td>
                      <td className="p-3.5 max-w-[180px] truncate">
                        <a
                          href={o.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{o.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="p-3.5 font-bold text-white">{o.quantity.toLocaleString()}</td>
                      <td className="p-3.5 font-bold text-[#f6b100]">
                        {(o.charge * exchangeRate).toFixed(2)} ج.م
                        <span className="block text-[10px] text-slate-500">${o.charge.toFixed(2)}</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            o.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : o.status === 'processing'
                              ? 'bg-blue-500/15 text-blue-400'
                              : o.status === 'cancelled'
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {o.status === 'completed'
                            ? 'مكتمل'
                            : o.status === 'processing'
                            ? 'قيد التنفيذ'
                            : o.status === 'cancelled'
                            ? 'ملغي'
                            : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          {o.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'completed')}
                              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold text-[10px] transition-colors"
                              title="إكمال الطلب"
                            >
                              إكمال
                            </button>
                          )}
                          {o.status !== 'processing' && o.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'processing')}
                              className="px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-black font-bold text-[10px] transition-colors"
                              title="بدء التنفيذ"
                            >
                              تنفيذ
                            </button>
                          )}
                          {o.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}
                              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-[10px] transition-colors"
                              title="إلغاء واسترجاع الرصيد"
                            >
                              إلغاء + استرداد
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSITS APPROVAL */}
        {activeTab === 'deposits' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
            <h2 className="text-lg font-black text-white mb-1">اعتماد شحنات وإيداعات فودافون كاش وإنستاباي</h2>
            <p className="text-xs text-slate-400 mb-6">
              مراجعة تحويلات العملاء واعتمادها لإضافة الرصيد بالدولار إلى محافظهم فوراً
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                  <tr>
                    <th className="p-3.5 font-bold">المرجع</th>
                    <th className="p-3.5 font-bold">العميل</th>
                    <th className="p-3.5 font-bold">طريقة الدفع</th>
                    <th className="p-3.5 font-bold">المبلغ (ج.م)</th>
                    <th className="p-3.5 font-bold">المبلغ المضاف ($)</th>
                    <th className="p-3.5 font-bold">رقم هاتف المحول</th>
                    <th className="p-3.5 font-bold">الإيصال</th>
                    <th className="p-3.5 font-bold">الحالة</th>
                    <th className="p-3.5 font-bold">إجراء الأدمن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#272c3d]/50">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-[#222634]/40 transition-colors">
                      <td className="p-3.5 font-mono text-white font-bold">{t.reference}</td>
                      <td className="p-3.5 text-slate-200">{t.userName}</td>
                      <td className="p-3.5 font-bold text-amber-300">{t.methodName}</td>
                      <td className="p-3.5 font-black text-white">{t.amountEgp.toLocaleString()} ج.م</td>
                      <td className="p-3.5 font-black text-emerald-400">${t.amountUsd.toFixed(2)}</td>
                      <td className="p-3.5 font-bold text-slate-300">{t.senderPhone}</td>
                      <td className="p-3.5">
                        {t.proofData ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProof(t.proofData!)}
                            className="px-2.5 py-1 rounded-lg bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض الإيصال</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px]">لا يوجد</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : t.status === 'rejected'
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {t.status === 'completed'
                            ? 'معتمد ✓'
                            : t.status === 'rejected'
                            ? 'مرفوض ✕'
                            : 'معلق ⏳'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {t.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveDeposit(t.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>اعتماد وشحن</span>
                            </button>
                            <button
                              onClick={() => handleRejectDeposit(t.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">مكتمل</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: TICKETS MANAGEMENT */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 bg-[#181b26] p-6 rounded-3xl border border-[#272c3d] shadow-xl">
              <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#f6b100]" />
                <span>كل تذاكر الدعم الفني ({tickets.length})</span>
              </h2>

              {tickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">لا توجد تذاكر حاليًا.</div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setActiveAdminTicketId(t.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        activeAdminTicketId === t.id
                          ? 'bg-[#222634] border-[#f6b100]'
                          : 'bg-[#0f1117] border-[#272c3d] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] text-slate-400">#{t.id} • {t.userName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'open'
                              ? 'bg-amber-500/20 text-amber-300'
                              : t.status === 'answered'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {t.status === 'open' ? 'بانتظار رد الأدمن' : t.status === 'answered' ? 'تم الرد' : 'مغلقة'}
                        </span>
                      </div>
                      <div className="font-bold text-white text-xs truncate">{t.subject}</div>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                        <span>القسم: {t.category}</span>
                        <span>{t.updatedAt.slice(0, 16)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-[#181b26] p-6 rounded-3xl border border-[#272c3d] shadow-xl">
              {activeAdminTicketId ? (
                (() => {
                  const current = tickets.find((t) => t.id === activeAdminTicketId);
                  if (!current) return null;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#272c3d]">
                        <div>
                          <div className="text-xs text-slate-400">
                            تذكرة #{current.id} • العميل: {current.userName}
                          </div>
                          <h3 className="text-base font-black text-white">{current.subject}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {current.status !== 'closed' ? (
                            <button
                              onClick={() => handleUpdateTicketStatus(current.id, 'closed')}
                              className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-xs transition-colors"
                            >
                              إغلاق التذكرة
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateTicketStatus(current.id, 'open')}
                              className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs transition-colors"
                            >
                              إعادة الفتح
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto p-2">
                        {current.messages.map((m) => {
                          const isAdminMsg = m.sender === 'admin';
                          return (
                            <div
                              key={m.id}
                              className={`p-3.5 rounded-2xl text-xs ${
                                isAdminMsg
                                  ? 'bg-[#222634] border border-[#f6b100]/40 mr-4'
                                  : 'bg-[#0f1117] border border-[#272c3d] ml-4'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  {isAdminMsg ? '🐥 دعم البطة الصفرا (أنت)' : m.senderName}
                                </span>
                                <span className="text-[10px] text-slate-500">{m.createdAt}</span>
                              </div>
                              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-[#272c3d]">
                        <textarea
                          rows={3}
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder="اكتب رد الدعم الفني الرسمي للعميل..."
                          className="w-full p-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            type="button"
                            onClick={() => handleAdminTicketReply(current.id)}
                            className="px-5 py-2.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>إرسال رد الإدارة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs">
                  اختر تذكرة من القائمة الجانبية لقراءة الرسائل والرد عليها.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
            <h2 className="text-lg font-black text-white mb-1">إدارة المستخدمين</h2>
            <p className="text-xs text-slate-400 mb-6">عرض أرصدة العملاء وإمكانية شحن أو خصم الرصيد يدوياً</p>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                  <tr>
                    <th className="p-3.5 font-bold">الاسم</th>
                    <th className="p-3.5 font-bold">اسم المستخدم</th>
                    <th className="p-3.5 font-bold">البريد الإلكتروني</th>
                    <th className="p-3.5 font-bold">الرصيد ($)</th>
                    <th className="p-3.5 font-bold">الرصيد (ج.م)</th>
                    <th className="p-3.5 font-bold">إجمالي الطلبات</th>
                    <th className="p-3.5 font-bold">التحكم في الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#272c3d]/50">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-[#222634]/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <img
                          src={`/images/avatars/${u.avatar || 'duck-happy.jpg'}`}
                          alt=""
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                        <span>
                          {u.firstname} {u.lastname}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">@{u.username}</td>
                      <td className="p-3.5 text-slate-400">{u.email}</td>
                      <td className="p-3.5 font-black text-emerald-400">${u.balance.toFixed(2)}</td>
                      <td className="p-3.5 font-bold text-[#f6b100]">{u.balanceEgp.toLocaleString()} ج.م</td>
                      <td className="p-3.5 text-white font-bold">{u.ordersCount || 0}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => {
                            setAdjustUserId(u.id);
                            setAdjustAmount(10);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs transition-colors"
                        >
                          تعديل الرصيد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Adjust balance modal */}
            {adjustUserId && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-base font-black text-white mb-2">تعديل رصيد العميل</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    إضافة أو خصم رصيد بالدولار الأمريكي مع تسجيل السبب في السجل
                  </p>

                  <form onSubmit={handleAdjustBalance} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">نوع العملية</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAdjustAction('add')}
                          className={`py-2 rounded-xl text-xs font-bold ${
                            adjustAction === 'add'
                              ? 'bg-emerald-500 text-black'
                              : 'bg-[#0f1117] text-slate-400 border border-[#272c3d]'
                          }`}
                        >
                          + إضافة رصيد
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustAction('deduct')}
                          className={`py-2 rounded-xl text-xs font-bold ${
                            adjustAction === 'deduct'
                              ? 'bg-rose-500 text-white'
                              : 'bg-[#0f1117] text-slate-400 border border-[#272c3d]'
                          }`}
                        >
                          - خصم رصيد
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        المبلغ بالدولار ($ USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.01"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                      {typeof adjustAmount === 'number' && adjustAmount > 0 && (
                        <small className="text-amber-400 block mt-1 text-[11px]">
                          يعادل: {(adjustAmount * exchangeRate).toFixed(2)} جنيه مصري
                        </small>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">السبب أو الملاحظات</label>
                      <input
                        type="text"
                        required
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="مثال: شحن يدوي مباشر / مكافأة ترويجية"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-[#f6b100] text-black font-bold text-xs hover:bg-[#e09f00] transition-colors"
                      >
                        حفظ التعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustUserId(null)}
                        className="flex-1 py-2.5 rounded-xl bg-[#222634] text-slate-300 font-bold text-xs hover:bg-[#2c3244] transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SERVICES MANAGEMENT */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
              <h2 className="text-lg font-black text-white mb-1">الخدمات المنشورة</h2>
              <p className="text-xs text-slate-400 mb-6">قائمة بكل الخدمات المتاحة للعملاء وأسعارها</p>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                    <tr>
                      <th className="p-3 font-bold">الرقم</th>
                      <th className="p-3 font-bold">القسم</th>
                      <th className="p-3 font-bold">اسم الخدمة</th>
                      <th className="p-3 font-bold">السعر / 1000 ($)</th>
                      <th className="p-3 font-bold">السعر / 1000 (ج.م)</th>
                      <th className="p-3 font-bold">الحدود</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#272c3d]/50">
                    {servicesList.map((s) => (
                      <tr key={s.id} className="hover:bg-[#222634]/40 transition-colors">
                        <td className="p-3 font-mono text-slate-400">#{s.id}</td>
                        <td className="p-3 font-bold text-white">{s.categoryName}</td>
                        <td className="p-3 text-slate-200 max-w-xs">{s.name}</td>
                        <td className="p-3 font-black text-emerald-400">${s.rate.toFixed(2)}</td>
                        <td className="p-3 font-black text-[#f6b100]">
                          {(s.rate * exchangeRate).toFixed(2)} ج.م
                        </td>
                        <td className="p-3 text-slate-400">
                          {s.min.toLocaleString()} - {s.max.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Service Card */}
            <div className="lg:col-span-4 bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
              <h3 className="text-base font-black text-white mb-2 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#f6b100]" />
                <span>إضافة خدمة جديدة</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">إنشاء خدمة إضافية تظهر للعملاء فورًا</p>

              <form onSubmit={handleCreateService} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">القسم / المنصة</label>
                  <select
                    value={newServiceCatId}
                    onChange={(e) => setNewServiceCatId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم الخدمة</label>
                  <input
                    type="text"
                    required
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="مثال: متابعين إنستغرام VIP"
                    className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    السعر لكل 1000 بالدولار ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={newServiceRate}
                    onChange={(e) => setNewServiceRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 1.50"
                    className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                  {typeof newServiceRate === 'number' && newServiceRate > 0 && (
                    <small className="text-[#f6b100] block mt-1 text-[11px]">
                      يعادل: {(newServiceRate * exchangeRate).toFixed(2)} ج.م للعميل
                    </small>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الحد الأدنى</label>
                    <input
                      type="number"
                      required
                      value={newServiceMin}
                      onChange={(e) => setNewServiceMin(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الحد الأقصى</label>
                    <input
                      type="number"
                      required
                      value={newServiceMax}
                      onChange={(e) => setNewServiceMax(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الوصف</label>
                  <textarea
                    rows={2}
                    value={newServiceDesc}
                    onChange={(e) => setNewServiceDesc(e.target.value)}
                    placeholder="تفاصيل الخدمة والضمان..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors shadow-md shadow-[#f6b100]/20"
                >
                  إضافة الخدمة
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS & EXCHANGE RATE */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#f6b100]" />
              <span>إعدادات سعر الصرف والمدفوعات</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              تغيير سعر تحويل الدولار إلى جنيه مصري المعتمد في المنصة تلقائياً لجميع الخدمات والإيداعات
            </p>

            <form onSubmit={handleSaveRate} className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d]">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  سعر صرف الدولار الحالي: (1 USD = ? EGP)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(parseFloat(e.target.value))}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#181b26] border border-[#272c3d] text-white text-base font-black focus:outline-none focus:border-[#f6b100]"
                  />
                  <span className="text-sm font-bold text-white">جنيه مصري</span>
                </div>
                <small className="text-slate-500 block mt-2 text-[11px]">
                  السعر الافتراضي المحدد في إعدادات Yellow Duck هو 55.0 جنيه.
                </small>
              </div>

              <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-2 text-xs">
                <div className="font-bold text-white">بيانات الدفع المفعلة:</div>
                <div className="text-slate-300">• فودافون كاش: 01205323440</div>
                <div className="text-slate-300">• إنستاباي: menna_206@instapay</div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors shadow-lg shadow-[#f6b100]/20"
              >
                تحديث سعر الصرف وحفظ الإعدادات
              </button>
            </form>

            {/* SMM Provider & Railway Deployment Status */}
            <div className="mt-8 pt-6 border-t border-[#272c3d]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#f6b100]" />
                  <span>تكامل خادم Railway ومزود SMMFansFaster</span>
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  متصل وجاهز
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#f6b100]" /> مزود SMM الخارجي:
                  </span>
                  <span className="font-bold text-white">SMMFansFaster (v2 API)</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">حالة المزود / هامش الربح:</span>
                  <span className="font-semibold text-emerald-400">
                    {providerInfo?.status || 'نشط (Active)'} | هامش +{providerInfo?.marginPercent || 10}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">مفتاح API المزود:</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {providerInfo?.apiKeyMasked || 'da3e5d...01a'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" /> قاعدة البيانات / الجلسات:
                  </span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    yellow_duck_session_v5 (480 دقيقة)
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" /> المزامنة التلقائية:
                  </span>
                  <span className="text-slate-300">
                    مفعلة (كل {providerInfo?.syncInterval || 120} ثانية)
                  </span>
                </div>

                {providerInfo?.balance && typeof providerInfo.balance.balance !== 'undefined' && (
                  <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-[#1f2433]">
                    <span className="text-slate-400">رصيد حسابك لدى SMMFansFaster:</span>
                    <span className="font-black text-[#f6b100] text-sm">
                      ${parseFloat(providerInfo.balance.balance).toFixed(2)} {providerInfo.balance.currency || 'USD'}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleSyncProvider}
                  disabled={syncingProvider}
                  className="w-full py-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingProvider ? 'animate-spin' : ''}`} />
                  <span>{syncingProvider ? 'جاري فحص وتحديث الطلبات مع المزود...' : 'مزامنة حالة الطلبات يدوياً مع SMMFansFaster'}</span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#272c3d]">
              <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                <Download className="w-4 h-4 text-[#f6b100]" />
                <span>النسخ الاحتياطي وتصدير البيانات</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                تنزيل لقطة كاملة لجميع بيانات المنصة (المستخدمين، الطلبات، الإيداعات، والخدمات) بصيغة JSON.
              </p>
              <a
                href="/api/admin/export"
                download
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] font-bold text-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تحميل النسخة الاحتياطية (Export JSON)</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Proof Receipt Lightbox Modal */}
      {previewProof && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#272c3d] mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Image className="w-4 h-4 text-[#f6b100]" />
                <span>إيصال تحويل العميل</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="p-1.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-slate-400 hover:text-white transition-colors text-xs"
              >
                إغلاق
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black/50 rounded-2xl p-2 border border-[#272c3d]">
              <img
                src={previewProof}
                alt="Receipt Proof"
                className="max-h-[60vh] max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
