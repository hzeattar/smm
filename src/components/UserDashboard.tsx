import React, { useState, useEffect } from 'react';
import { User, Category, Service, Order, Transaction, PaymentMethod, Ticket } from '../types';
import {
  Wallet,
  ShoppingBag,
  DollarSign,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Upload,
  ArrowRight,
  Clock,
  RefreshCw,
  PlusCircle,
  ListFilter,
  CreditCard,
  FileText,
  ExternalLink,
  MessageSquare,
  Send,
  User as UserIcon,
  Check,
  FileSpreadsheet,
  Key,
} from 'lucide-react';

interface UserDashboardProps {
  user: User;
  exchangeRate: number;
  onRefreshUser: () => void;
  onNavigate: (view: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  exchangeRate,
  onRefreshUser,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<
    'new-order' | 'mass-order' | 'orders' | 'add-funds' | 'transactions' | 'tickets' | 'profile' | 'services'
  >('new-order');
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // New Order Form state
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [orderLink, setOrderLink] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number | ''>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Mass Order state
  const [massOrderData, setMassOrderData] = useState('');
  const [massSubmitting, setMassSubmitting] = useState(false);
  const [massError, setMassError] = useState<string | null>(null);
  const [massSuccess, setMassSuccess] = useState<string | null>(null);

  // Tickets state
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<'order' | 'deposit' | 'refill' | 'other'>('order');
  const [newTicketOrderId, setNewTicketOrderId] = useState<number | ''>('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // Profile state
  const [profileFirstname, setProfileFirstname] = useState(user.firstname);
  const [profileLastname, setProfileLastname] = useState(user.lastname);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || 'duck-happy.jpg');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const duckAvatars = [
    { id: 'duck-happy.jpg', name: 'البطة المبتسمة' },
    { id: 'duck-cool.jpg', name: 'البطة الكول' },
    { id: 'duck-calm.jpg', name: 'البطة الهادئة' },
    { id: 'duck-excited.jpg', name: 'البطة المتحمسة' },
    { id: 'duck-clever.jpg', name: 'البطة الذكية' },
    { id: 'duck-party.jpg', name: 'بطة الحفلة' },
  ];

  // Add Funds Form state
  const [selectedMethodId, setSelectedMethodId] = useState<number>(1);
  const [depositAmountEgp, setDepositAmountEgp] = useState<number | ''>('');
  const [senderPhone, setSenderPhone] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Orders filter & search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, srvRes, ordRes, txRes, pmRes, tickRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/services'),
        fetch(`/api/orders?current_user_id=${user.id}`),
        fetch(`/api/transactions?current_user_id=${user.id}`),
        fetch('/api/payment-methods'),
        fetch(`/api/tickets?current_user_id=${user.id}`),
      ]);

      const [catData, srvData, ordData, txData, pmData, tickData] = await Promise.all([
        catRes.json(),
        srvRes.json(),
        ordRes.json(),
        txRes.json(),
        pmRes.json(),
        tickRes.json(),
      ]);

      setCategories(catData);
      setServices(srvData);
      setOrders(ordData.orders || []);
      setTransactions(txData.transactions || []);
      setPaymentMethods(pmData.methods || []);
      setTickets(tickData.tickets || []);

      if (catData.length > 0 && selectedCategory === '') {
        setSelectedCategory(catData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  // Filtered services for category
  const categoryServices = services.filter((s) => {
    const matchesCat = selectedCategory ? s.categoryId === Number(selectedCategory) : true;
    const matchesSearch = serviceSearch
      ? s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(serviceSearch.toLowerCase())
      : true;
    return matchesCat && matchesSearch;
  });

  const selectedService = services.find((s) => s.id === Number(selectedServiceId));

  // Auto-select first service when category changes
  useEffect(() => {
    if (categoryServices.length > 0) {
      setSelectedServiceId(categoryServices[0].id);
    } else {
      setSelectedServiceId('');
    }
  }, [selectedCategory, serviceSearch]);

  // Calculated charge for current order
  const calculatedChargeUsd =
    selectedService && typeof orderQuantity === 'number' && orderQuantity > 0
      ? (orderQuantity / 1000) * selectedService.rate
      : 0;
  const calculatedChargeEgp = calculatedChargeUsd * exchangeRate;

  // Handle Order Submit
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    setOrderSuccess(null);

    if (!selectedServiceId) {
      setOrderError('يرجى اختيار الخدمة');
      return;
    }
    if (!orderLink || orderLink.trim().length < 4) {
      setOrderError('يرجى إدخال رابط صالح');
      return;
    }
    if (!orderQuantity || Number(orderQuantity) <= 0) {
      setOrderError('يرجى تحديد الكمية المطلوبة');
      return;
    }

    setOrderSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          service_id: selectedServiceId,
          quantity: orderQuantity,
          link: orderLink,
          notes: orderNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.error || 'حدث خطأ أثناء إنشاء الطلب.');
      } else {
        setOrderSuccess(`تم إنشاء الطلب بنجاح! رقم الطلب: #${data.order.id}`);
        setOrderLink('');
        setOrderNotes('');
        onRefreshUser();
        fetchData();
      }
    } catch {
      setOrderError('تعذر الاتصال بالخادم. يرجى المحاولة لاحقًا.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Handle Add Funds Submit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);

    if (!depositAmountEgp || Number(depositAmountEgp) <= 0) {
      setDepositError('يرجى إدخال مبلغ الإيداع بالجنيه');
      return;
    }
    if (!senderPhone || senderPhone.trim().length < 7) {
      setDepositError('يرجى كتابة رقم الهاتف أو حساب التحويل بشكل صحيح');
      return;
    }

    setDepositSubmitting(true);
    try {
      const res = await fetch('/api/add-funds/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          method_id: selectedMethodId,
          amount: depositAmountEgp,
          sender_phone: senderPhone,
          proof_image: proofImage,
          notes: depositNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDepositError(data.error || 'حدث خطأ أثناء تقديم طلب الإيداع.');
      } else {
        setDepositSuccess(
          `تم إرسال إشعار الإيداع بنجاح! كود المعاملة: ${data.transaction.reference}. سيتم مراجعة التحويل واعتماد الرصيد فوراً.`
        );
        setDepositAmountEgp('');
        setSenderPhone('');
        setDepositNotes('');
        setProofImage(null);
        fetchData();
      }
    } catch {
      setDepositError('تعذر الاتصال بالخادم.');
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Handle Mass Order Submit
  const handleMassOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMassError(null);
    setMassSuccess(null);

    if (!massOrderData.trim()) {
      setMassError('يرجى كتابة أسطر الطلبات الجماعية.');
      return;
    }

    setMassSubmitting(true);
    try {
      const res = await fetch('/api/orders/mass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({ massData: massOrderData }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMassError(data.error || 'فشل تنفيذ الطلب الجماعي');
      } else {
        setMassSuccess(data.message);
        setMassOrderData('');
        onRefreshUser();
        fetchData();
      }
    } catch {
      setMassError('تعذر الاتصال بالخادم');
    } finally {
      setMassSubmitting(false);
    }
  };

  // Handle Create Ticket Submit
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    setTicketSuccess(null);

    if (!newTicketSubject || !newTicketMessage) {
      setTicketError('يرجى ملء موضوع التذكرة والرسالة');
      return;
    }

    setTicketSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          subject: newTicketSubject,
          category: newTicketCategory,
          orderId: newTicketOrderId || undefined,
          message: newTicketMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTicketError(data.error || 'تعذر فتح التذكرة');
      } else {
        setTicketSuccess(data.message);
        setNewTicketSubject('');
        setNewTicketMessage('');
        setNewTicketOrderId('');
        fetchData();
      }
    } catch {
      setTicketError('تعذر الاتصال بالخادم');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Handle Ticket Reply
  const handleTicketReply = async (ticketId: number) => {
    if (!ticketReplyText.trim()) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({ message: ticketReplyText }),
      });
      if (res.ok) {
        setTicketReplyText('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSubmitting(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify({
          firstname: profileFirstname,
          lastname: profileLastname,
          email: profileEmail,
          avatar: profileAvatar,
          password: profilePassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'تعذر حفظ البيانات');
      } else {
        setProfileSuccess(data.message);
        setProfilePassword('');
        onRefreshUser();
      }
    } catch {
      setProfileError('تعذر الاتصال بالخادم');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Selected payment method info
  const currentPaymentMethod = paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0];
  const calculatedCreditUsd =
    typeof depositAmountEgp === 'number' && depositAmountEgp > 0 ? depositAmountEgp / exchangeRate : 0;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const matchesSearch = orderSearchTerm
      ? o.id.toString().includes(orderSearchTerm) ||
        o.link.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        o.serviceName.toLowerCase().includes(orderSearchTerm.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const totalSpentUsd = orders.reduce((sum, o) => sum + o.charge, 0);

  return (
    <div className="min-h-screen bg-[#0f1117] pt-4 pb-28 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Welcome Hero */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#181b26] via-[#1c202e] to-[#181b26] border border-[#272c3d] p-6 sm:p-8 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f6b100]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={user.avatar?.startsWith('http') || user.avatar?.startsWith('/brand') ? user.avatar : `/images/avatars/${user.avatar || 'duck-happy.jpg'}`}
                  alt={user.firstname}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#f6b100]/60 shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/brand/yellow-duck.svg';
                  }}
                />
                {user.isGoogleAuth && (
                  <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-white rounded-full p-0.5 shadow flex items-center justify-center" title="حساب موثق من Google">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#f6b100]">أهلًا بك مجددًا 👋</span>
                  {user.isGoogleAuth && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-500/30">
                      <span>متصل بـ Google / Gmail</span>
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {user.firstname} {user.lastname}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  إدارة طلبات السوشيال ميديا، متابعة الرصيد والتحويلات المالية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('add-funds')}
                className="px-5 py-2.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#f6b100]/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة رصيد الآن</span>
              </button>
              <button
                onClick={() => {
                  onRefreshUser();
                  fetchData();
                }}
                className="p-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-slate-300 hover:text-white transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-[#f6b100] flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">رصيدك الحالي</span>
              <div className="text-lg sm:text-xl font-black text-white">
                {user.balanceEgp.toLocaleString()} ج.م
              </div>
              <span className="text-[11px] text-slate-500 font-normal">${user.balance.toFixed(2)} USD</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">إجمالي طلباتك</span>
              <div className="text-lg sm:text-xl font-black text-white">{orders.length}</div>
              <span className="text-[11px] text-emerald-400 font-medium">
                {orders.filter((o) => o.status === 'completed').length} مكتمل
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">إجمالي الصرف</span>
              <div className="text-lg sm:text-xl font-black text-white">
                {(totalSpentUsd * exchangeRate).toFixed(2)} ج.م
              </div>
              <span className="text-[11px] text-slate-500 font-normal">${totalSpentUsd.toFixed(2)} USD</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">الخدمات المتاحة</span>
              <div className="text-lg sm:text-xl font-black text-white">{services.length}</div>
              <span className="text-[11px] text-slate-500 font-normal">جاهزة للطلب الفوري</span>
            </div>
          </div>
        </div>

        {/* Platform Strip Shortcut Chips */}
        <div className="p-4 rounded-2xl bg-[#181b26] border border-[#272c3d]">
          <div className="text-xs font-bold text-slate-400 mb-3">اختر منصة السوشيال المطلوبة:</div>
          <div className="flex flex-wrap items-center gap-2.5">
            {categories.map((c) => {
              const isActive = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCategory(c.id);
                    setActiveTab('new-order');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#f6b100] text-black shadow-md shadow-[#f6b100]/20'
                      : 'bg-[#222634] text-slate-300 hover:bg-[#2c3244]'
                  }`}
                >
                  <img src={c.icon} alt="" className="w-4 h-4 object-contain" />
                  <span>{c.name.split('-')[0].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#272c3d] pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('new-order')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'new-order' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>طلب جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('mass-order')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mass-order' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>طلب جماعي</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>سجل الطلبات ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add-funds')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'add-funds' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>إضافة رصيد</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'transactions' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>سجل الإيداعات ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'tickets' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>الدعم والتذاكر ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>الملف الشخصي</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-3.5 py-2.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'services' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>قائمة الأسعار</span>
          </button>
        </div>

        {/* TAB 1: NEW ORDER */}
        {activeTab === 'new-order' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-[#181b26] p-6 sm:p-7 rounded-3xl border border-[#272c3d] shadow-xl">
              <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <span>إنشاء طلب جديد</span>
                <span className="text-xs font-normal text-slate-400">(تنفيذ آلي وفوري)</span>
              </h2>

              {orderSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{orderSuccess}</span>
                </div>
              )}

              {orderError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              <form onSubmit={handleCreateOrder} className="space-y-5">
                {/* Search / Filter service */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">البحث في الخدمات</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="ابحث باسم الخدمة أو المنصة..."
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                {/* Category Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">القسم / المنصة</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  >
                    <option value="">جميع الأقسام</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الخدمة المطلوبة</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  >
                    {categoryServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - ({(s.rate * exchangeRate).toFixed(2)} ج.م لكل 1000)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Metadata Box */}
                {selectedService && (
                  <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">الحد الأدنى</small>
                        <strong className="text-white font-black">{selectedService.min.toLocaleString()}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">الحد الأقصى</small>
                        <strong className="text-white font-black">{selectedService.max.toLocaleString()}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">السعر لكل 1000</small>
                        <strong className="text-[#f6b100] font-black">
                          {(selectedService.rate * exchangeRate).toFixed(2)} ج.م
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">نوع الخدمة</small>
                        <strong className="text-emerald-400 font-bold">{selectedService.type}</strong>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed bg-[#181b26]/60 p-3 rounded-xl border border-[#272c3d]/50">
                      <span className="font-bold text-white block mb-0.5">تفاصيل الخدمة:</span>
                      {selectedService.description}
                    </div>
                  </div>
                )}

                {/* Link */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    الرابط المباشر (رابط الحساب أو المنشور)
                  </label>
                  <input
                    type="url"
                    required
                    value={orderLink}
                    onChange={(e) => setOrderLink(e.target.value)}
                    placeholder="https://www.instagram.com/p/... أو https://tiktok.com/@..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                  <small className="text-[11px] text-slate-500 block mt-1">
                    تأكد من أن الحساب أو المنشور عام (Public) وليس خاصًا (Private).
                  </small>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الكمية المطلوبة</label>
                  <input
                    type="number"
                    required
                    min={selectedService?.min || 1}
                    max={selectedService?.max || 1000000}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`مثال: ${selectedService?.min || 1000}`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                {/* Live Charge Box */}
                <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#f6b100]/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">إجمالي التكلفة المحتسبة:</span>
                    <div className="text-xl font-black text-[#f6b100]">
                      {calculatedChargeEgp.toFixed(2)} جنيه مصري
                    </div>
                    <span className="text-[11px] text-slate-400">
                      يعادل (${calculatedChargeUsd.toFixed(4)} USD)
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-xs text-slate-400 block">رصيدك الحالي:</span>
                    <span
                      className={`text-sm font-bold ${
                        user.balanceEgp >= calculatedChargeEgp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {user.balanceEgp.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={orderSubmitting || (calculatedChargeEgp > 0 && user.balanceEgp < calculatedChargeEgp)}
                  className="w-full py-3.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {orderSubmitting
                      ? 'جاري إرسال الطلب...'
                      : user.balanceEgp < calculatedChargeEgp && calculatedChargeEgp > 0
                      ? 'الرصيد غير كافٍ - اشحن رصيدك'
                      : 'تأكيد وإرسال الطلب'}
                  </span>
                </button>
              </form>
            </div>

            {/* Sidebar Guidelines */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#181b26] p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#f6b100]" />
                  <span>إرشادات قبل تقديم الطلب</span>
                </h3>
                <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed list-disc list-inside">
                  <li>تأكد من أن الحساب مفتوح للعامة وغير مقفل (Public).</li>
                  <li>لا تقم بطلب نفس الرابط مرتين في نفس الوقت حتى يكتمل الطلب الأول.</li>
                  <li>لا تغير اسم المستخدم (Username) أو رابط الحساب أثناء تنفيذ الطلب.</li>
                  <li>في حال وجود أي نقص يتم التعويض تلقائياً للخدمات المشمولة بالضمان.</li>
                </ul>
              </div>

              <div className="bg-[#181b26] p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-2">طرق الدفع السريعة</h3>
                <p className="text-xs text-slate-400 mb-4">
                  اشحن رصيدك عبر فودافون كاش أو إنستاباي واستلم رصيدك خلال دقائق.
                </p>
                <button
                  onClick={() => setActiveTab('add-funds')}
                  className="w-full py-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>شحن الرصيد الآن</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS HISTORY */}
        {activeTab === 'orders' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-white">سجل طلباتك</h2>
                <p className="text-xs text-slate-400">متابعة حالة جميع الطلبات المنشأة</p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب أو الرابط..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100] w-full sm:w-60"
                />

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="processing">قيد التنفيذ</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                لا توجد طلبات مسجلة تطابق بحثك حاليًا.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                    <tr>
                      <th className="p-3.5 font-bold">الرقم</th>
                      <th className="p-3.5 font-bold">الخدمة</th>
                      <th className="p-3.5 font-bold">الرابط</th>
                      <th className="p-3.5 font-bold">الكمية</th>
                      <th className="p-3.5 font-bold">التكلفة</th>
                      <th className="p-3.5 font-bold">الحالة</th>
                      <th className="p-3.5 font-bold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#272c3d]/50">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#222634]/40 transition-colors">
                        <td className="p-3.5 font-black text-white">#{o.id}</td>
                        <td className="p-3.5 max-w-xs truncate text-slate-200" title={o.serviceName}>
                          <span className="font-semibold">{o.serviceName}</span>
                          <span className="block text-[10px] text-slate-500">{o.categoryName}</span>
                        </td>
                        <td className="p-3.5 max-w-[200px] truncate">
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
                        <td className="p-3.5 text-slate-400">{o.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADD FUNDS */}
        {activeTab === 'add-funds' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-[#181b26] p-6 sm:p-7 rounded-3xl border border-[#272c3d] shadow-xl">
              <h2 className="text-lg font-black text-white mb-2">إضافة رصيد (شحن المحفظة)</h2>
              <p className="text-xs text-slate-400 mb-6">
                كل {exchangeRate} جنيه مصري تضيف 1 دولار إلى رصيدك بعد مراجعة الأدمن.
              </p>

              {depositSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{depositSuccess}</span>
                </div>
              )}

              {depositError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {paymentMethods.map((m) => {
                  const isSel = selectedMethodId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMethodId(m.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
                        isSel
                          ? 'bg-[#222634] border-[#f6b100] shadow-md shadow-[#f6b100]/10'
                          : 'bg-[#0f1117] border-[#272c3d] hover:border-slate-600'
                      }`}
                    >
                      <img src={`/images/${m.image}`} alt={m.name} className="w-10 h-10 object-contain" />
                      <div>
                        <div className="font-bold text-white text-xs">{m.name}</div>
                        <div className="text-[11px] text-slate-400">
                          الحد الأدنى: {m.min} ج.م | الرسوم: {m.fee}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Details Card */}
              {currentPaymentMethod && (
                <div className="p-5 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400">رقم المحفظة / الحساب للتحويل:</span>
                      <div className="text-base sm:text-lg font-black text-white tracking-wide">
                        {currentPaymentMethod.accountNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentPaymentMethod.accountNumber);
                        setCopiedAccount(true);
                        setTimeout(() => setCopiedAccount(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-xs font-bold text-[#f6b100] flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedAccount ? 'تم النسخ!' : 'نسخ'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-[#181b26]/70 p-3 rounded-xl border border-[#272c3d]/60">
                    {currentPaymentMethod.instruction}
                  </p>
                </div>
              )}

              {/* Deposit Form */}
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    المبلغ المحول بالجنيه المصري (EGP)
                  </label>
                  <input
                    type="number"
                    required
                    min={currentPaymentMethod?.min || 55}
                    max={currentPaymentMethod?.max || 500000}
                    value={depositAmountEgp}
                    onChange={(e) => setDepositAmountEgp(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`مثال: 550 جنيه`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                  {typeof depositAmountEgp === 'number' && depositAmountEgp > 0 && (
                    <small className="text-emerald-400 block mt-1 text-xs font-semibold">
                      سيتم إضافة: ${calculatedCreditUsd.toFixed(2)} دولار إلى حسابك بعد الاعتماد.
                    </small>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    رقم الهاتف أو الحساب الذي تم التحويل منه
                  </label>
                  <input
                    type="text"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="مثال: 01012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    صورة إيصال التحويل (اختياري - لتسريع الفحص)
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] hover:border-[#f6b100] text-slate-300 text-xs font-medium flex items-center gap-2 transition-colors">
                        <Upload className="w-4 h-4 text-[#f6b100]" />
                        <span>{proofImage ? 'تغيير صورة الإيصال' : 'اختر صورة من جهازك'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setProofImage(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {proofImage && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>تم إرفاق الإيصال</span>
                        </span>
                      )}
                    </div>
                    {proofImage && (
                      <div className="relative inline-block border-2 border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg p-1 bg-[#0f1117]">
                        <img
                          src={proofImage}
                          alt="معاينة إيصال التحويل"
                          className="w-32 h-32 object-contain rounded-xl bg-black/40"
                        />
                        <button
                          type="button"
                          onClick={() => setProofImage(null)}
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] transition-colors shadow"
                        >
                          إلغاء الصورة
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات إضافية</label>
                  <input
                    type="text"
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    placeholder="أي بيانات أو رقم عملية التحويل إن وجد"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={depositSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{depositSubmitting ? 'جاري إرسال الإشعار...' : 'تأكيد إرسال الإيداع'}</span>
                </button>
              </form>
            </div>

            {/* Deposit Info Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#181b26] p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>وقت المعالجة المعتاد</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يتم فحص ومراجعة الإيداعات اليدوية في فترات قصيرة لا تتعدى من 5 إلى 15 دقيقة على مدار الساعة.
                </p>
              </div>

              <div className="bg-[#181b26] p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-2">سعر الصرف الحسابي</h3>
                <p className="text-xs text-slate-400 mb-3">
                  1 دولار أمريكي = {exchangeRate} جنيه مصري
                </p>
                <div className="text-[11px] text-slate-500">
                  إذا واجهتك أي مشكلة، تواصل مع الدعم الفني فوراً.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TRANSACTIONS HISTORY */}
        {activeTab === 'transactions' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
            <h2 className="text-lg font-black text-white mb-1">سجل المعاملات والإيداعات</h2>
            <p className="text-xs text-slate-400 mb-6">قائمة بجميع الإيداعات وشحنات الرصيد في حسابك</p>

            {transactions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">لا توجد معاملات مسجلة حتى الآن.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                    <tr>
                      <th className="p-3.5 font-bold">المرجع</th>
                      <th className="p-3.5 font-bold">طريقة الدفع</th>
                      <th className="p-3.5 font-bold">المبلغ (ج.م)</th>
                      <th className="p-3.5 font-bold">الرصيد المضاف ($)</th>
                      <th className="p-3.5 font-bold">رقم المحول</th>
                      <th className="p-3.5 font-bold">الحالة</th>
                      <th className="p-3.5 font-bold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#272c3d]/50">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-[#222634]/40 transition-colors">
                        <td className="p-3.5 font-mono text-white font-bold">{t.reference}</td>
                        <td className="p-3.5 text-slate-200">{t.methodName}</td>
                        <td className="p-3.5 font-black text-[#f6b100]">{t.amountEgp.toLocaleString()} ج.م</td>
                        <td className="p-3.5 font-bold text-emerald-400">${t.amountUsd.toFixed(2)}</td>
                        <td className="p-3.5 text-slate-300">{t.senderPhone}</td>
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
                              : 'قيد المراجعة ⏳'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{t.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: MASS ORDER */}
        {activeTab === 'mass-order' && (
          <div className="bg-[#181b26] p-6 sm:p-7 rounded-3xl border border-[#272c3d] shadow-xl max-w-4xl mx-auto">
            <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#f6b100]" />
              <span>طلب جماعي (Mass Order)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              أدخل كل طلب في سطر منفصل بالصيغة التالية: <code className="bg-[#0f1117] px-2 py-0.5 rounded text-amber-300 font-mono">رقم_الخدمة | الكمية | الرابط</code>
            </p>

            {massSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{massSuccess}</span>
              </div>
            )}

            {massError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{massError}</span>
              </div>
            )}

            <form onSubmit={handleMassOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">أسطر الطلب الجماعي</label>
                <textarea
                  rows={8}
                  required
                  value={massOrderData}
                  onChange={(e) => setMassOrderData(e.target.value)}
                  placeholder="101 | 1000 | https://instagram.com/myprofile&#10;201 | 5000 | https://tiktok.com/@video/12345"
                  className="w-full p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] text-white text-xs font-mono focus:outline-none focus:border-[#f6b100] leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] text-xs text-slate-400 space-y-1">
                <div className="font-bold text-white mb-1">ملاحظات هامة:</div>
                <div>• يمكنك معرفة أرقام الخدمات (ID) من تبويب "قائمة الأسعار".</div>
                <div>• افصل بين رقم الخدمة والكمية والرابط بعلامة الفاصل العمودي <code className="text-[#f6b100]">|</code>.</div>
                <div>• سيتم التحقق من رصيدك وخصم إجمالي التكلفة دفعة واحدة.</div>
              </div>

              <button
                type="submit"
                disabled={massSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{massSubmitting ? 'جاري تنفيذ الطلبات...' : 'إرسال الطلب الجماعي'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB: SUPPORT TICKETS */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Tickets list */}
            <div className="lg:col-span-5 bg-[#181b26] p-6 rounded-3xl border border-[#272c3d] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#f6b100]" />
                  <span>تذاكر الدعم الفني ({tickets.length})</span>
                </h2>
                <button
                  onClick={() => setActiveTicketId(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs transition-colors"
                >
                  + تذكرة جديدة
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">لا توجد تذاكر دعم مسجلة حتى الآن.</div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setActiveTicketId(t.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        activeTicketId === t.id
                          ? 'bg-[#222634] border-[#f6b100]'
                          : 'bg-[#0f1117] border-[#272c3d] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] text-slate-400">#{t.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'answered'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : t.status === 'closed'
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {t.status === 'answered' ? 'تم الرد' : t.status === 'closed' ? 'مغلقة' : 'قيد المتابعة'}
                        </span>
                      </div>
                      <div className="font-bold text-white text-xs truncate">{t.subject}</div>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                        <span>{t.category === 'order' ? 'استفسار طلب' : t.category === 'deposit' ? 'إيداع مالي' : 'عام'}</span>
                        <span>{t.updatedAt.slice(0, 16)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ticket Conversation or New Ticket Form */}
            <div className="lg:col-span-7 bg-[#181b26] p-6 rounded-3xl border border-[#272c3d] shadow-xl">
              {activeTicketId ? (
                (() => {
                  const currentTicket = tickets.find((t) => t.id === activeTicketId);
                  if (!currentTicket) return null;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#272c3d]">
                        <div>
                          <div className="text-xs text-slate-400">تذكرة رقم #{currentTicket.id}</div>
                          <h3 className="text-base font-black text-white">{currentTicket.subject}</h3>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            currentTicket.status === 'answered'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : currentTicket.status === 'closed'
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {currentTicket.status === 'answered'
                            ? 'تم الرد'
                            : currentTicket.status === 'closed'
                            ? 'مغلقة'
                            : 'قيد المتابعة'}
                        </span>
                      </div>

                      {/* Messages Thread */}
                      <div className="space-y-3 max-h-[400px] overflow-y-auto p-2">
                        {currentTicket.messages.map((m) => {
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
                                  {isAdminMsg ? '🐥 دعم البطة الصفرا' : m.senderName}
                                  {isAdminMsg && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                                      فريق الدعم
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-500">{m.createdAt}</span>
                              </div>
                              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Box */}
                      {currentTicket.status !== 'closed' && (
                        <div className="pt-3 border-t border-[#272c3d]">
                          <textarea
                            rows={3}
                            value={ticketReplyText}
                            onChange={(e) => setTicketReplyText(e.target.value)}
                            placeholder="اكتب ردك هنا..."
                            className="w-full p-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              type="button"
                              onClick={() => handleTicketReply(currentTicket.id)}
                              className="px-4 py-2 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>إرسال الرد</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* New Ticket Form */
                <div>
                  <h3 className="text-base font-black text-white mb-2">فتح تذكرة دعم جديدة</h3>
                  <p className="text-xs text-slate-400 mb-6">فريق الدعم متاح 24/7 لمساعدتك في أي استفسار أو مشكلة</p>

                  {ticketSuccess && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      {ticketSuccess}
                    </div>
                  )}

                  {ticketError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                      {ticketError}
                    </div>
                  )}

                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">الموضوع</label>
                      <input
                        type="text"
                        required
                        value={newTicketSubject}
                        onChange={(e) => setNewTicketSubject(e.target.value)}
                        placeholder="مثال: استفسار بخصوص بدء الطلب"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">القسم</label>
                        <select
                          value={newTicketCategory}
                          onChange={(e) => setNewTicketCategory(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                        >
                          <option value="order">استفسار عن طلب</option>
                          <option value="deposit">شحن الرصيد والمدفوعات</option>
                          <option value="refill">طلب تعويض (Refill)</option>
                          <option value="other">استفسار عام</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">رقم الطلب (إن وجد)</label>
                        <input
                          type="number"
                          value={newTicketOrderId}
                          onChange={(e) => setNewTicketOrderId(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="مثال: 1001"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">الرسالة أو التفاصيل</label>
                      <textarea
                        rows={4}
                        required
                        value={newTicketMessage}
                        onChange={(e) => setNewTicketMessage(e.target.value)}
                        placeholder="اكتب تفاصيل استفسارك أو مشكلتك بوضوح..."
                        className="w-full p-3.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors disabled:opacity-50"
                    >
                      {ticketSubmitting ? 'جاري الإرسال...' : 'فتح التذكرة'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PROFILE SETTINGS */}
        {activeTab === 'profile' && (
          <div className="bg-[#181b26] p-6 sm:p-8 rounded-3xl border border-[#272c3d] shadow-xl max-w-3xl mx-auto">
            <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#f6b100]" />
              <span>إعدادات الملف الشخصي</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">تعديل بياناتك واختيار صورتك الرمزية المفضلة من شخصيات البطة الصفرا</p>

            {profileSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Duck Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-3">اختر الصورة الرمزية (Duck Avatar):</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {duckAvatars.map((d) => {
                    const isSel = profileAvatar === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setProfileAvatar(d.id)}
                        className={`p-2 rounded-2xl border text-center cursor-pointer transition-all ${
                          isSel
                            ? 'bg-[#222634] border-[#f6b100] shadow-md shadow-[#f6b100]/20 scale-105'
                            : 'bg-[#0f1117] border-[#272c3d] hover:border-slate-500 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={`/images/avatars/${d.id}`}
                          alt={d.name}
                          className="w-14 h-14 rounded-xl object-cover mx-auto mb-1.5"
                        />
                        <div className="text-[10px] font-bold text-white truncate">{d.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الأول</label>
                  <input
                    type="text"
                    required
                    value={profileFirstname}
                    onChange={(e) => setProfileFirstname(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم العائلة</label>
                  <input
                    type="text"
                    required
                    value={profileLastname}
                    onChange={(e) => setProfileLastname(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  تغيير كلمة المرور (اتركها فارغة إذا كنت لا تريد التغيير)
                </label>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="كلمة مرور جديدة..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
              </div>

              <button
                type="submit"
                disabled={profileSubmitting}
                className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors shadow-lg shadow-[#f6b100]/20 disabled:opacity-50"
              >
                {profileSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: SERVICES CATALOG */}
        {activeTab === 'services' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-white">قائمة الخدمات والأسعار</h2>
                <p className="text-xs text-slate-400">استعرض كافة الخدمات المتاحة وأسعارها بالجنيه والدولار</p>
              </div>

              <input
                type="text"
                placeholder="ابحث عن أي خدمة..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100] w-full sm:w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                  <tr>
                    <th className="p-3.5 font-bold">الرقم</th>
                    <th className="p-3.5 font-bold">القسم</th>
                    <th className="p-3.5 font-bold">اسم الخدمة</th>
                    <th className="p-3.5 font-bold">السعر لكل 1000</th>
                    <th className="p-3.5 font-bold">الحد الأدنى</th>
                    <th className="p-3.5 font-bold">الحد الأقصى</th>
                    <th className="p-3.5 font-bold">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#272c3d]/50">
                  {services
                    .filter((s) =>
                      serviceSearch
                        ? s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                          s.description.toLowerCase().includes(serviceSearch.toLowerCase())
                        : true
                    )
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-[#222634]/40 transition-colors">
                        <td className="p-3.5 text-slate-400">#{s.id}</td>
                        <td className="p-3.5 font-bold text-slate-200">{s.categoryName}</td>
                        <td className="p-3.5 max-w-sm">
                          <div className="font-semibold text-white">{s.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{s.description}</div>
                        </td>
                        <td className="p-3.5 font-black text-[#f6b100]">
                          {(s.rate * exchangeRate).toFixed(2)} ج.م
                          <span className="block text-[10px] text-slate-500">${s.rate.toFixed(2)}</span>
                        </td>
                        <td className="p-3.5 text-slate-300">{s.min.toLocaleString()}</td>
                        <td className="p-3.5 text-slate-300">{s.max.toLocaleString()}</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => {
                              setSelectedCategory(s.categoryId);
                              setSelectedServiceId(s.id);
                              setActiveTab('new-order');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#f6b100]/20 hover:bg-[#f6b100] text-[#f6b100] hover:text-black font-bold text-[11px] transition-colors"
                          >
                            اطلب الآن
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav aria-label="شريط التنقل السريع للهاتف" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12141c]/95 backdrop-blur-lg border-t border-[#272c3d] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab('new-order');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all ${
            activeTab === 'new-order' ? 'text-[#f6b100] font-black' : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <PlusCircle className={`w-5 h-5 ${activeTab === 'new-order' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">طلب جديد</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('orders');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all relative ${
            activeTab === 'orders' ? 'text-[#f6b100] font-black' : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <ShoppingBag className={`w-5 h-5 ${activeTab === 'orders' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">طلباتي</span>
          {orders.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#f6b100]"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('add-funds');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all ${
            activeTab === 'add-funds' ? 'text-[#f6b100] font-black' : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'add-funds' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">شحن رصيد</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('services');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all ${
            activeTab === 'services' ? 'text-[#f6b100] font-black' : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'services' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">الخدمات</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tickets');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all ${
            activeTab === 'tickets' ? 'text-[#f6b100] font-black' : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${activeTab === 'tickets' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">الدعم</span>
        </button>
      </nav>
    </div>
  );
};
