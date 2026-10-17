import React, { useState, useEffect } from 'react';
import { User, Order, Transaction, Service, Category, PlatformStats, Ticket, ProviderInfo } from '../types';
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
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Server,
  Sliders,
  KeyRound,
  Ban,
  Edit3,
  Trash2,
  Search,
  CreditCard,
  Power,
  X,
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
  const [activeTab, setActiveTab] = useState<'orders' | 'deposits' | 'tickets' | 'users' | 'services' | 'settings' | 'provider'>('orders');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerTesting, setProviderTesting] = useState(false);
  const [providerSyncingOrders, setProviderSyncingOrders] = useState(false);
  const [providerSyncingServices, setProviderSyncingServices] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    balance?: string;
    currency?: string;
    latencyMs?: number;
  } | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<number | null>(null);
  const [marginInput, setMarginInput] = useState<number>(15);
  const [providerStatusInput, setProviderStatusInput] = useState<'active' | 'inactive'>('active');
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

  // Reset password modal state
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Edit service modal state
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceRate, setEditServiceRate] = useState<number | ''>('');
  const [editServiceMin, setEditServiceMin] = useState<number>(100);
  const [editServiceMax, setEditServiceMax] = useState<number>(10000);
  const [editServiceCatId, setEditServiceCatId] = useState<number>(1);
  const [editServiceDesc, setEditServiceDesc] = useState('');
  const [editServiceStatus, setEditServiceStatus] = useState<'active' | 'deactive'>('active');

  // Service filters & pagination
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'all'>('all');
  const [adminServicesPage, setAdminServicesPage] = useState<number>(1);
  const ADMIN_SERVICES_PER_PAGE = 50;

  // User filters
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

  // Payment methods list state
  const [paymentMethodsList, setPaymentMethodsList] = useState<any[]>([]);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [methodSaving, setMethodSaving] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordRes, txRes, usrRes, srvRes, catRes, tickRes, pmRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/orders?status=all'),
        fetch('/api/transactions'),
        fetch('/api/admin/users'),
        fetch('/api/services'),
        fetch('/api/categories'),
        fetch('/api/tickets'),
        fetch('/api/admin/payment-methods'),
      ]);

      const [statsData, ordData, txData, usrData, srvData, catData, tickData, pmData] = await Promise.all([
        statsRes.json(),
        ordRes.json(),
        txRes.json(),
        usrRes.json(),
        srvRes.json(),
        catRes.json(),
        tickRes.json(),
        pmRes.ok ? pmRes.json() : [],
      ]);

      setStats(statsData);
      setOrders(ordData.orders || []);
      setTransactions(txData.transactions || []);
      setUsersList(usrData || []);
      setServicesList(srvData || []);
      setCategories(catData || []);
      setTickets(tickData.tickets || []);
      if (Array.isArray(pmData)) setPaymentMethodsList(pmData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
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

  // Reset user password handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUserId || !newPasswordInput.trim()) return;
    setResetPasswordLoading(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordUserId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message);
      setResetPasswordUserId(null);
      setNewPasswordInput('');
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Toggle user status (active / banned)
  const handleToggleUserStatus = async (userToUpdate: User) => {
    setActionSuccess(null);
    setActionError(null);
    const nextStatus = userToUpdate.status === 'banned' ? 'active' : 'banned';
    const confirmMsg = nextStatus === 'banned'
      ? `هل أنت متأكد من حظر حساب المستخدم (${userToUpdate.username}) ومنعه من الدخول للمنصة؟`
      : `هل أنت متأكد من إلغاء الحظر وتفعيل حساب المستخدم (${userToUpdate.username})؟`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/users/${userToUpdate.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'فشل تعديل حالة المستخدم');
    }
  };

  // Open edit service modal
  const handleOpenEditService = (service: Service) => {
    setEditingService(service);
    setEditServiceName(service.name);
    setEditServiceRate(service.rate);
    setEditServiceMin(service.min);
    setEditServiceMax(service.max);
    setEditServiceCatId(service.categoryId);
    setEditServiceDesc(service.description || '');
    setEditServiceStatus(service.status || 'active');
  };

  // Save edited service
  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editServiceName.trim(),
          rate: Number(editServiceRate),
          min: Number(editServiceMin),
          max: Number(editServiceMax),
          categoryId: Number(editServiceCatId),
          description: editServiceDesc,
          status: editServiceStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message);
      setEditingService(null);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'فشل تحديث بيانات الخدمة');
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: number, serviceName: string) => {
    setActionSuccess(null);
    setActionError(null);
    if (!window.confirm(`هل أنت متأكد من حذف الخدمة (${serviceName}) نهائياً من المنصة؟`)) return;

    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'فشل حذف الخدمة');
    }
  };

  // Toggle service active / deactive status
  const handleToggleServiceStatus = async (service: Service) => {
    setActionSuccess(null);
    setActionError(null);
    const newStatus = service.status === 'active' ? 'deactive' : 'active';
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(`تم ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} الخدمة (${service.name})`);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'فشل تعديل حالة الخدمة');
    }
  };

  // Save payment method
  const handleSavePaymentMethod = async (method: any) => {
    setActionSuccess(null);
    setActionError(null);
    setMethodSaving(true);
    try {
      const res = await fetch(`/api/admin/payment-methods/${method.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message);
      setEditingMethod(null);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'فشل تحديث وسيلة الدفع');
    } finally {
      setMethodSaving(false);
    }
  };

  // Provider operations
  const fetchProviderInfo = async () => {
    setProviderLoading(true);
    try {
      const res = await fetch('/api/admin/provider', {
        headers: { 'x-user-role': 'admin' },
      });
      if (res.ok) {
        const data = await res.json();
        setProviderInfo(data);
        setMarginInput(data.marginPercent || 15);
        setProviderStatusInput(data.status || 'active');
      }
    } catch (err) {
      console.error('Failed to load provider info', err);
    } finally {
      setProviderLoading(false);
    }
  };

  const handleTestProvider = async () => {
    setProviderTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/provider/test', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
      });
      const data = await res.json();
      setTestResult(data);
      if (res.ok) {
        setActionSuccess(`تم فحص الاتصال بالمزود بنجاح! سرعة الاستجابة: ${data.latencyMs}ms | الرصيد: $${data.balance}`);
        fetchProviderInfo();
      } else {
        setActionError(`فشل فحص الاتصال بالمزود: ${data.error}`);
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      setActionError(`خطأ في فحص المزود: ${err.message}`);
    } finally {
      setProviderTesting(false);
    }
  };

  const handleSaveProviderSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/provider/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          marginPercent: marginInput,
          providerStatus: providerStatusInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess('تم حفظ إعدادات المزود وهامش الربح بنجاح');
      fetchProviderInfo();
    } catch (err: any) {
      setActionError(err.message || 'تعذر حفظ إعدادات المزود');
    }
  };

  const handleSyncProviderOrders = async () => {
    setProviderSyncingOrders(true);
    try {
      const res = await fetch('/api/admin/provider/sync', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message || 'تمت مزامنة حالات الطلبات مع المزود بنجاح');
      fetchAdminData();
      fetchProviderInfo();
    } catch (err: any) {
      setActionError(err.message || 'تعذر مزامنة الطلبات');
    } finally {
      setProviderSyncingOrders(false);
    }
  };

  const handleSyncProviderServices = async () => {
    setProviderSyncingServices(true);
    try {
      const res = await fetch('/api/admin/provider/sync-services', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message || 'تمت مزامنة وتحديث خدمات SMMFansFaster بنجاح');
      fetchAdminData();
      fetchProviderInfo();
    } catch (err: any) {
      setActionError(err.message || 'تعذر استيراد خدمات المزود');
    } finally {
      setProviderSyncingServices(false);
    }
  };

  const handleResendOrder = async (orderId: number) => {
    setResendingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resend`, {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message || `تم إرسال الطلب #${orderId} لمزود SMMFansFaster بنجاح`);
      fetchAdminData();
      fetchProviderInfo();
    } catch (err: any) {
      setActionError(err.message || `تعذر إرسال الطلب #${orderId} للمزود`);
    } finally {
      setResendingOrderId(null);
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
            onClick={() => {
              setActiveTab('provider');
              fetchProviderInfo();
            }}
            className={`px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'provider' ? 'bg-[#f6b100] text-black shadow-md shadow-[#f6b100]/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>مزود SMMFansFaster (الربط المباشر)</span>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-white mb-1">إدارة كل الطلبات</h2>
                <p className="text-xs text-slate-400">
                  مراقبة حالات الطلبات، وإعادة توجيه الطلبات للمزود الخارجي SMMFansFaster، أو تغيير الحالة
                </p>
              </div>
              <button
                onClick={handleSyncProviderOrders}
                disabled={providerSyncingOrders}
                className="px-4 py-2 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${providerSyncingOrders ? 'animate-spin' : ''}`} />
                <span>{providerSyncingOrders ? 'جاري المزامنة...' : 'مزامنة حالات المزود'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                  <tr>
                    <th className="p-3.5 font-bold">الرقم</th>
                    <th className="p-3.5 font-bold">الخدمة</th>
                    <th className="p-3.5 font-bold">الرابط</th>
                    <th className="p-3.5 font-bold">الكمية</th>
                    <th className="p-3.5 font-bold">التكلفة</th>
                    <th className="p-3.5 font-bold">المزود الخارجي</th>
                    <th className="p-3.5 font-bold">الحالة الحالية</th>
                    <th className="p-3.5 font-bold">الإجراءات</th>
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
                        {o.providerOrderId ? (
                          <div className="font-mono text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>#{o.providerOrderId}</span>
                          </div>
                        ) : o.provider ? (
                          <span className="text-[11px] text-amber-400/80 font-mono">{o.provider}</span>
                        ) : (
                          <span className="text-[11px] text-slate-500">يدوي / محلي</span>
                        )}
                        {o.notes && <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">{o.notes}</div>}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {o.status === 'pending' && (
                            <button
                              onClick={() => handleResendOrder(o.id)}
                              disabled={resendingOrderId === o.id}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-[10px] transition-colors flex items-center gap-1"
                              title="إرسال الطلب لمزود SMMFansFaster"
                            >
                              <Zap className="w-3 h-3" />
                              <span>{resendingOrderId === o.id ? 'إرسال...' : 'إرسال للمزود'}</span>
                            </button>
                          )}
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
                              إلغاء
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#f6b100]" />
                  <span>إدارة حسابات المستخدمين والعملاء</span>
                </h2>
                <p className="text-xs text-slate-400">
                  التحكم الكامل بالحسابات: تغيير كلمة السر عند النسيان، الحظر والتفعيل، وتعديل الأرصدة
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                </div>

                <div className="flex items-center gap-1 bg-[#0f1117] p-1 rounded-xl border border-[#272c3d] text-xs">
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      userStatusFilter === 'all'
                        ? 'bg-[#f6b100] text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    الكل ({usersList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('active')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      userStatusFilter === 'active'
                        ? 'bg-emerald-500 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    النشط ({usersList.filter((u) => u.status === 'active').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('banned')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      userStatusFilter === 'banned'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    المحظور ({usersList.filter((u) => u.status === 'banned').length})
                  </button>
                </div>
              </div>
            </div>

            {(() => {
              const filteredUsers = usersList.filter((u) => {
                if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
                if (!userSearchQuery.trim()) return true;
                const q = userSearchQuery.toLowerCase();
                return (
                  u.username.toLowerCase().includes(q) ||
                  u.email.toLowerCase().includes(q) ||
                  `${u.firstname} ${u.lastname}`.toLowerCase().includes(q)
                );
              });

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                      <tr>
                        <th className="p-3.5 font-bold">الاسم</th>
                        <th className="p-3.5 font-bold">اسم المستخدم</th>
                        <th className="p-3.5 font-bold">البريد الإلكتروني</th>
                        <th className="p-3.5 font-bold">الحالة</th>
                        <th className="p-3.5 font-bold">الرصيد ($)</th>
                        <th className="p-3.5 font-bold">الرصيد (ج.م)</th>
                        <th className="p-3.5 font-bold">الطلبات</th>
                        <th className="p-3.5 font-bold text-center">إجراءات التحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#272c3d]/50">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-500">
                            لا يوجد مستخدمين يطابقون خيارات البحث المحددة
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#222634]/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <img
                          src={u.avatar?.startsWith('http') || u.avatar?.startsWith('/brand') ? u.avatar : `/images/avatars/${u.avatar || 'duck-happy.jpg'}`}
                          alt=""
                          className="w-7 h-7 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/brand/yellow-duck.svg';
                          }}
                        />
                        <span>
                          {u.firstname} {u.lastname}
                        </span>
                        {u.role === 'admin' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">
                            مشرف
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300 font-mono">@{u.username}</td>
                      <td className="p-3.5 text-slate-400 font-mono">{u.email}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            u.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : u.status === 'banned'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {u.status === 'active' ? 'نشط' : u.status === 'banned' ? 'محظور' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-emerald-400 font-mono">${u.balance.toFixed(2)}</td>
                      <td className="p-3.5 font-bold text-[#f6b100] font-mono">{u.balanceEgp.toLocaleString()} ج.م</td>
                      <td className="p-3.5 text-white font-bold font-mono">{u.ordersCount || 0}</td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Adjust Balance */}
                          <button
                            onClick={() => {
                              setAdjustUserId(u.id);
                              setAdjustAmount(10);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="شحن أو خصم رصيد"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>الرصيد</span>
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetPasswordUserId(u.id);
                              setNewPasswordInput('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#222634] hover:bg-[#2c3244] text-sky-400 hover:text-sky-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="تغيير كلمة مرور العميل في حال نسيانها"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>كلمة السر</span>
                          </button>

                          {/* Ban / Activate (except self) */}
                          {u.id !== admin.id && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.status === 'banned'
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                              }`}
                              title={u.status === 'banned' ? 'إلغاء حظر الحساب' : 'حظر هذا المستخدم'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

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

            {/* Reset Password Modal */}
            {resetPasswordUserId && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#f6b100]" />
                      <span>تغيير كلمة مرور المستخدم</span>
                    </h3>
                    <button
                      onClick={() => setResetPasswordUserId(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#222634] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {(() => {
                    const targetU = usersList.find((u) => u.id === resetPasswordUserId);
                    return (
                      <p className="text-xs text-slate-400 mb-4">
                        تعديل كلمة السر المعتمدة لحساب <strong className="text-white">@{targetU?.username}</strong> ({targetU?.firstname} {targetU?.lastname})
                      </p>
                    );
                  })()}

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        كلمة المرور الجديدة (New Password)
                      </label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة للعميل..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs font-semibold focus:outline-none focus:border-[#f6b100]"
                      />
                      <small className="text-slate-500 text-[11px] block mt-1">
                        سيتمكن العميل فور حفظها من الدخول بكلمة المرور هذه مباشرة.
                      </small>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={resetPasswordLoading || newPasswordInput.trim().length < 4}
                        className="flex-1 py-2.5 rounded-xl bg-[#f6b100] text-black font-bold text-xs hover:bg-[#e09f00] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {resetPasswordLoading ? 'جاري الحفظ...' : 'تأكيد وحفظ كلمة المرور'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetPasswordUserId(null)}
                        className="flex-1 py-2.5 rounded-xl bg-[#222634] text-slate-300 font-bold text-xs hover:bg-[#2c3244] transition-colors cursor-pointer"
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
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#f6b100]" />
                  <span>التحكم بالخدمات والأسعار (Services Control)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  إدارة شاملة لجميع الخدمات: تعديل الأسعار، تغيير الحدود، التفعيل والتعطيل، الحذف، والمزامنة الحية
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSyncProviderServices}
                  disabled={providerSyncingServices}
                  className="px-4 py-2.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${providerSyncingServices ? 'animate-spin' : ''}`} />
                  <span>{providerSyncingServices ? 'جاري استيراد كافة الخدمات...' : 'استيراد وتحديث كافة الخدمات من SMMFansFaster'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
                {/* Search and Category Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={serviceSearchQuery}
                      onChange={(e) => {
                        setServiceSearchQuery(e.target.value);
                        setAdminServicesPage(1);
                      }}
                      placeholder="بحث باسم الخدمة أو رقمها (ID)..."
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                  </div>

                  <div className="w-full sm:w-48">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => {
                        setSelectedCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                        setAdminServicesPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    >
                      <option value="all">جميع المنصات والأقسام</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(() => {
                  const filteredServices = servicesList.filter((s) => {
                    if (selectedCategoryFilter !== 'all' && s.categoryId !== selectedCategoryFilter) return false;
                    if (!serviceSearchQuery.trim()) return true;
                    const q = serviceSearchQuery.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(q) ||
                      s.id.toString().includes(q) ||
                      (s.categoryName && s.categoryName.toLowerCase().includes(q))
                    );
                  });

                  const totalPages = Math.ceil(filteredServices.length / ADMIN_SERVICES_PER_PAGE) || 1;
                  const safePage = Math.min(Math.max(1, adminServicesPage), totalPages);
                  const startIndex = (safePage - 1) * ADMIN_SERVICES_PER_PAGE;
                  const currentServices = filteredServices.slice(startIndex, startIndex + ADMIN_SERVICES_PER_PAGE);

                  return (
                    <div className="overflow-x-auto">
                      <div className="text-[11px] text-slate-400 mb-2 font-semibold">
                        الخدمات المعروضة: {filteredServices.length} من إجمالي {servicesList.length} خدمة (الصفحة {safePage} من {totalPages})
                      </div>
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                          <tr>
                            <th className="p-3 font-bold">الرقم</th>
                            <th className="p-3 font-bold">القسم</th>
                            <th className="p-3 font-bold">اسم الخدمة</th>
                            <th className="p-3 font-bold">السعر ($)</th>
                            <th className="p-3 font-bold">السعر (ج.م)</th>
                            <th className="p-3 font-bold">الحدود</th>
                            <th className="p-3 font-bold">الحالة</th>
                            <th className="p-3 font-bold text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#272c3d]/50">
                          {currentServices.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-6 text-center text-slate-500">
                                لا توجد خدمات مطابقة للبحث أو القسم المختار
                              </td>
                            </tr>
                          ) : (
                            currentServices.map((s) => (
                              <tr key={s.id} className="hover:bg-[#222634]/40 transition-colors">
                                <td className="p-3 font-mono text-slate-400">#{s.id}</td>
                                <td className="p-3 font-bold text-white whitespace-nowrap">
                                  {s.categoryName || categories.find((c) => c.id === s.categoryId)?.name || 'عام'}
                                </td>
                                <td className="p-3 text-slate-200 max-w-xs">
                                  <div className="font-semibold line-clamp-2">{s.name}</div>
                                  {s.provider === 'SMMFansFaster' && (
                                    <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 bg-amber-500/15 text-amber-300 rounded font-mono">
                                      SMMFansFaster #{s.providerServiceId || s.id}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-black text-emerald-400 font-mono">${s.rate.toFixed(3)}</td>
                                <td className="p-3 font-black text-[#f6b100] font-mono whitespace-nowrap">
                                  {(s.rate * exchangeRate).toFixed(2)} ج.م
                                </td>
                                <td className="p-3 text-slate-400 font-mono whitespace-nowrap">
                                  {s.min.toLocaleString()} - {s.max.toLocaleString()}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      s.status === 'active'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                    }`}
                                  >
                                    {s.status === 'active' ? 'نشط' : 'معطل'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-1">
                                    {/* Edit Service */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditService(s)}
                                      className="p-1.5 rounded-lg bg-[#222634] hover:bg-[#2c3244] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                                      title="تعديل بيانات وسعر الخدمة"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Toggle Active / Deactive */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleServiceStatus(s)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        s.status === 'active'
                                          ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'
                                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400'
                                      }`}
                                      title={s.status === 'active' ? 'تعطيل الخدمة' : 'تفعيل الخدمة'}
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete Service */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteService(s.id, s.name)}
                                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors cursor-pointer"
                                      title="حذف الخدمة نهائياً"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#272c3d]/60 mt-3 text-xs">
                          <div className="text-slate-400">
                            الصفحة <strong className="text-white">{safePage}</strong> من <strong className="text-white">{totalPages}</strong> (عرض {startIndex + 1} - {Math.min(startIndex + ADMIN_SERVICES_PER_PAGE, filteredServices.length)} من {filteredServices.length})
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={safePage <= 1}
                              onClick={() => setAdminServicesPage((p) => Math.max(1, p - 1))}
                              className="px-2.5 py-1 rounded-lg bg-[#0f1117] border border-[#272c3d] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                            >
                              السابق
                            </button>
                            <span className="px-2 py-1 text-slate-400 font-mono">{safePage} / {totalPages}</span>
                            <button
                              type="button"
                              disabled={safePage >= totalPages}
                              onClick={() => setAdminServicesPage((p) => Math.min(totalPages, p + 1))}
                              className="px-2.5 py-1 rounded-lg bg-[#0f1117] border border-[#272c3d] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                            >
                              التالي
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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

          {/* Edit Service Modal */}
          {editingService && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#f6b100]" />
                    <span>تعديل بيانات الخدمة #{editingService.id}</span>
                  </h3>
                  <button
                    onClick={() => setEditingService(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#222634] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditService} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم الخدمة</label>
                    <input
                      type="text"
                      required
                      value={editServiceName}
                      onChange={(e) => setEditServiceName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">القسم / المنصة</label>
                      <select
                        value={editServiceCatId}
                        onChange={(e) => setEditServiceCatId(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">الحالة</label>
                      <select
                        value={editServiceStatus}
                        onChange={(e) => setEditServiceStatus(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      >
                        <option value="active">نشط (متاحة للطلب)</option>
                        <option value="deactive">معطل (مخفية مؤقتاً)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">السعر ($)</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={editServiceRate}
                        onChange={(e) => setEditServiceRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                      {typeof editServiceRate === 'number' && editServiceRate > 0 && (
                        <span className="text-[10px] text-[#f6b100] block mt-1">
                          = {(editServiceRate * exchangeRate).toFixed(2)} ج.م
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">الحد الأدنى</label>
                      <input
                        type="number"
                        required
                        value={editServiceMin}
                        onChange={(e) => setEditServiceMin(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">الحد الأقصى</label>
                      <input
                        type="number"
                        required
                        value={editServiceMax}
                        onChange={(e) => setEditServiceMax(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الوصف</label>
                    <textarea
                      rows={3}
                      value={editServiceDesc}
                      onChange={(e) => setEditServiceDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-[#f6b100] text-black font-extrabold text-xs hover:bg-[#e09f00] transition-colors cursor-pointer"
                    >
                      حفظ التعديلات
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="flex-1 py-2.5 rounded-xl bg-[#222634] text-slate-300 font-bold text-xs hover:bg-[#2c3244] transition-colors cursor-pointer"
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

        {/* TAB 5: SETTINGS & EXCHANGE RATE & PAYMENT METHODS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Exchange Rate & Backup */}
              <div className="lg:col-span-5 space-y-6">
                {/* Rate Card */}
                <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
                  <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#f6b100]" />
                    <span>إعدادات سعر الصرف (USD / EGP)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-5">
                    تغيير سعر تحويل الدولار إلى جنيه مصري المعتمد في المنصة تلقائياً لجميع الخدمات والإيداعات
                  </p>

                  <form onSubmit={handleSaveRate} className="space-y-4">
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
                        <span className="text-sm font-bold text-white whitespace-nowrap">جنيه مصري</span>
                      </div>
                      <small className="text-slate-500 block mt-2 text-[11px]">
                        السعر الافتراضي المعتمد في المنصة هو 55.0 جنيه.
                      </small>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors shadow-lg shadow-[#f6b100]/20 cursor-pointer"
                    >
                      تحديث سعر الصرف وحفظ
                    </button>
                  </form>
                </div>

                {/* Backup & Export */}
                <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
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

              {/* Right Column: Egyptian Payment Methods Management */}
              <div className="lg:col-span-7 bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#272c3d]">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#f6b100]" />
                      <span>إدارة محافظ الدفع المصرية (Egyptian Cash & InstaPay)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      التحكم بأرقام فودافون كاش، إنستاباي، أورانج، اتصالات، وي باي، وفوري وتفعيلها للعملاء
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {paymentMethodsList.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      جاري تحميل بيانات وسائل الدفع...
                    </div>
                  ) : (
                    paymentMethodsList.map((pm) => (
                      <div
                        key={pm.id}
                        className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] hover:border-[#383f56] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#181b26] border border-[#272c3d] flex items-center justify-center p-2 shrink-0">
                            <CreditCard className="w-5 h-5 text-[#f6b100]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{pm.name}</span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                  pm.status === 'active'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                }`}
                              >
                                {pm.status === 'active' ? 'نشط' : 'معطل'}
                              </span>
                            </div>
                            <div className="text-xs font-mono text-[#f6b100] mt-1 font-bold">
                              {pm.accountNumber || 'غير محدد'}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {pm.instruction}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setEditingMethod({ ...pm })}
                            className="px-3 py-1.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-sky-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Edit Payment Method Modal */}
            {editingMethod && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#f6b100]" />
                      <span>تعديل وسيلة الدفع ({editingMethod.name})</span>
                    </h3>
                    <button
                      onClick={() => setEditingMethod(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#222634] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSavePaymentMethod(editingMethod);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        رقم الهاتف / عنوان المحفظة أو الحساب
                      </label>
                      <input
                        type="text"
                        required
                        value={editingMethod.accountNumber || ''}
                        onChange={(e) =>
                          setEditingMethod({ ...editingMethod, accountNumber: e.target.value })
                        }
                        placeholder="مثال: 01205323440 أو account@instapay"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs font-mono font-bold focus:outline-none focus:border-[#f6b100]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">الحالة</label>
                      <select
                        value={editingMethod.status || 'active'}
                        onChange={(e) =>
                          setEditingMethod({ ...editingMethod, status: e.target.value as any })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      >
                        <option value="active">مفعلة (تظهر في صفحة شحن الرصيد)</option>
                        <option value="deactive">معطلة (مخفية مؤقتاً)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">الحد الأدنى (ج.م)</label>
                        <input
                          type="number"
                          value={editingMethod.min || 50}
                          onChange={(e) =>
                            setEditingMethod({ ...editingMethod, min: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">الحد الأقصى (ج.م)</label>
                        <input
                          type="number"
                          value={editingMethod.max || 500000}
                          onChange={(e) =>
                            setEditingMethod({ ...editingMethod, max: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">رسوم (%)</label>
                        <input
                          type="number"
                          value={editingMethod.fee ?? 0}
                          onChange={(e) =>
                            setEditingMethod({ ...editingMethod, fee: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        تعليمات التحويل للعميل
                      </label>
                      <textarea
                        rows={3}
                        value={editingMethod.instruction || ''}
                        onChange={(e) =>
                          setEditingMethod({ ...editingMethod, instruction: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={methodSaving}
                        className="flex-1 py-2.5 rounded-xl bg-[#f6b100] text-black font-extrabold text-xs hover:bg-[#e09f00] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {methodSaving ? 'جاري الحفظ...' : 'حفظ بيانات المحفظة'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMethod(null)}
                        className="flex-1 py-2.5 rounded-xl bg-[#222634] text-slate-300 font-bold text-xs hover:bg-[#2c3244] transition-colors cursor-pointer"
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

        {/* TAB 7: SMMFANSFASTER PROVIDER INTEGRATION */}
        {activeTab === 'provider' && (
          <div className="space-y-6">
            {/* Provider Header Banner */}
            <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                  <Zap className="w-4 h-4" />
                  <span>الربط المباشر مع مزود SMMFansFaster</span>
                </div>
                <h2 className="text-xl font-black text-white">إدارة مزود الخدمات الخارجي (API v2)</h2>
                <p className="text-xs text-slate-400 mt-1">
                  مزامنة تلقائية للخدمات وحالات الطلبات مع احتساب هامش الربح وفحص الرصيد اللحظي
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestProvider}
                  disabled={providerTesting}
                  className="px-4 py-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Activity className={`w-4 h-4 ${providerTesting ? 'animate-spin' : ''}`} />
                  <span>{providerTesting ? 'جاري الفحص...' : 'فحص الاتصال الحي (Ping)'}</span>
                </button>
                <button
                  type="button"
                  onClick={fetchProviderInfo}
                  className="p-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-slate-300 hover:text-white transition-colors"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${providerLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Provider KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">حالة الاتصال المباشر</span>
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-base font-black text-white">متصل ومباشر (Live)</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {providerInfo?.apiKeyMasked ? `مفتاح API: ${providerInfo.apiKeyMasked}` : 'جاهز للعمل'}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">رصيدك لدى المزود (USD)</span>
                  <DollarSign className="w-4 h-4 text-[#f6b100]" />
                </div>
                <div className="text-xl font-black text-[#f6b100]">
                  ${providerInfo?.balance?.balance || '0.0268'}
                </div>
                <span className="text-[11px] text-slate-400">
                  يعادل:{' '}
                  {(
                    parseFloat(providerInfo?.balance?.balance || '0.0268') * exchangeRate
                  ).toFixed(2)}{' '}
                  ج.م
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">هامش الربح المعتمد</span>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl font-black text-white">
                  +{providerInfo?.marginPercent || marginInput}%
                </div>
                <span className="text-[11px] text-emerald-400">يضاف تلقائياً فوق سعر المزود</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d]">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">الخدمات المرتبطة بالمزود</span>
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-black text-white">
                  {providerInfo?.servicesCount || servicesList.filter((s) => s.provider === 'SMMFansFaster').length} خدمة
                </div>
                <span className="text-[11px] text-slate-400">
                  من إجمالي {servicesList.length} خدمة في المنصة
                </span>
              </div>
            </div>

            {/* Test result display */}
            {testResult && (
              <div
                className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
                  testResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">{testResult.message || testResult.error}</div>
                    {testResult.success && (
                      <div className="text-[11px] opacity-80 mt-0.5">
                        سرعة الاتصال: {testResult.latencyMs}ms | الرصيد الحالي:{' '}
                        {testResult.balance} {testResult.currency}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  className="text-xs hover:underline"
                >
                  إغلاق
                </button>
              </div>
            )}

            {/* Two Column Layout: Actions & Settings + Order Dispatcher */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Settings and Sync Engine */}
              <div className="lg:col-span-5 space-y-6">
                {/* Margin and Status Settings */}
                <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
                  <h3 className="text-base font-black text-white mb-2 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#f6b100]" />
                    <span>إعدادات هامش الربح وحالة المزود</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-5">
                    تحكم في النسبة المئوية للربح التي تضاف تلقائياً فوق أسعار المزود الأساسية
                  </p>

                  <form onSubmit={handleSaveProviderSettings} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          نسبة هامش الربح الإضافي (%)
                        </label>
                        <span className="text-xs font-mono font-black text-[#f6b100]">
                          +{marginInput}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={marginInput}
                        onChange={(e) => setMarginInput(Number(e.target.value))}
                        className="w-full accent-[#f6b100] cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                        <span>0% (سعر التكلفة)</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>100% (مضاعف)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        حالة التوجيه التلقائي للطلبات
                      </label>
                      <select
                        value={providerStatusInput}
                        onChange={(e) => setProviderStatusInput(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      >
                        <option value="active">مفعل (إرسال الطلبات الجديدة فوراً للمزود)</option>
                        <option value="inactive">معطل (الاحتفاظ بالطلبات محلياً قيد الانتظار)</option>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#0f1117] border border-[#272c3d] text-[11px] text-slate-300 space-y-1">
                      <div className="font-bold text-white">معادلة حساب السعر للعميل:</div>
                      <div className="font-mono text-amber-300">
                        السعر النهائي = سعر المزود × (1 + {marginInput} / 100)
                      </div>
                      <div className="text-slate-400">
                        إذا كانت خدمة المزود بـ $1.00، ستظهر للعميل بـ ${(1 * (1 + marginInput / 100)).toFixed(2)} USD (
                        {((1 * (1 + marginInput / 100)) * exchangeRate).toFixed(2)} ج.م)
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors shadow-md shadow-[#f6b100]/20"
                    >
                      حفظ إعدادات المزود
                    </button>
                  </form>
                </div>

                {/* Direct Action Hub */}
                <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#f6b100]" />
                    <span>عمليات المزامنة السريعة</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    أزرار سريعة لتحديث الخدمات وجلب أحدث حالات الطلبات من المزود
                  </p>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleSyncProviderServices}
                      disabled={providerSyncingServices}
                      className="w-full py-3 px-4 rounded-xl bg-[#222634] hover:bg-[#2c3244] border border-[#272c3d] text-white font-bold text-xs flex items-center justify-between transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Layers className={`w-4 h-4 text-[#f6b100] ${providerSyncingServices ? 'animate-spin' : ''}`} />
                        <div className="text-right">
                          <div className="font-bold">استيراد وتحديث الخدمات من المزود</div>
                          <small className="text-[10px] text-slate-400 block">
                            جلب قائمة خدمات SMMFansFaster وتطبيق هامش الربح
                          </small>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#f6b100]">
                        {providerSyncingServices ? 'جاري الاستيراد...' : 'بدء الاستيراد'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncProviderOrders}
                      disabled={providerSyncingOrders}
                      className="w-full py-3 px-4 rounded-xl bg-[#222634] hover:bg-[#2c3244] border border-[#272c3d] text-white font-bold text-xs flex items-center justify-between transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <RefreshCw className={`w-4 h-4 text-emerald-400 ${providerSyncingOrders ? 'animate-spin' : ''}`} />
                        <div className="text-right">
                          <div className="font-bold">مزامنة حالات الطلبات الحية</div>
                          <small className="text-[10px] text-slate-400 block">
                            تحديث حالات الطلبات (قيد التنفيذ / مكتمل / ملغي)
                          </small>
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-400">
                        {providerSyncingOrders ? 'جاري المزامنة...' : 'مزامنة الآن'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: SMM Provider Orders Monitor */}
              <div className="lg:col-span-7 bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#f6b100]" />
                      <span>طلبات مزود SMMFansFaster</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      مراقبة الطلبات التي تم توجيهها للمزود أو التي تحتاج إلى إعادة توجيه
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#0f1117] border border-[#272c3d] text-slate-300">
                    {orders.filter((o) => o.provider || o.providerOrderId).length} طلب مرتبط
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                      <tr>
                        <th className="p-3 font-bold">رقم الطلب</th>
                        <th className="p-3 font-bold">الخدمة</th>
                        <th className="p-3 font-bold">معرف المزود</th>
                        <th className="p-3 font-bold">الكمية</th>
                        <th className="p-3 font-bold">الحالة</th>
                        <th className="p-3 font-bold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#272c3d]/50">
                      {orders
                        .filter((o) => o.provider === 'SMMFansFaster' || o.providerOrderId || o.status === 'pending')
                        .slice(0, 15)
                        .map((o) => (
                          <tr key={o.id} className="hover:bg-[#222634]/40 transition-colors">
                            <td className="p-3 font-bold text-white">#{o.id}</td>
                            <td className="p-3 max-w-[160px] truncate text-slate-200">
                              <div className="font-semibold truncate">{o.serviceName}</div>
                              <small className="text-[10px] text-slate-500 block truncate">{o.link}</small>
                            </td>
                            <td className="p-3 font-mono">
                              {o.providerOrderId ? (
                                <span className="text-amber-400 font-bold">#{o.providerOrderId}</span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">قيد التوجيه</span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-white">{o.quantity.toLocaleString()}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                                  : 'معلق'}
                              </span>
                            </td>
                            <td className="p-3">
                              {o.status === 'pending' || !o.providerOrderId ? (
                                <button
                                  type="button"
                                  onClick={() => handleResendOrder(o.id)}
                                  disabled={resendingOrderId === o.id}
                                  className="px-2.5 py-1 rounded bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-[10px] transition-colors flex items-center gap-1 shadow-sm"
                                  title="إرسال الطلب لـ SMMFansFaster فوراً"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>{resendingOrderId === o.id ? 'إرسال...' : 'توجيه للمزود'}</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 text-[10px]">موجّه للمزود ✓</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
