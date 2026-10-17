import React, { useState, useEffect, useMemo } from 'react';
import { User, Category, Service, Order, Transaction, PaymentMethod, Ticket } from '../types';
import { apiFetch as fetch } from '../lib/apiFetch';
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
  ArrowUpDown,
} from 'lucide-react';

interface UserDashboardProps {
  user: User;
  exchangeRate: number;
  onRefreshUser: () => void;
  onNavigate: (view: string) => void;
}

interface SubcategoryGroup {
  key: string;
  rawName: string;
  displayName: string;
  isArabic: boolean;
  platformId: number;
  platformName: string;
  minRate: number;
  minRateEgp: string;
  services: Service[];
}

interface PlatformBucket {
  platform: Category;
  arabicSubcategories: SubcategoryGroup[];
  englishSubcategories: SubcategoryGroup[];
  totalServices: number;
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

  // New Order Form state (Platform -> Subcategory -> Price-Sorted Service)
  const [selectedPlatform, setSelectedPlatform] = useState<number | 'all'>('all');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'ar' | 'en'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [orderLink, setOrderLink] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number | ''>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderNeedsDeposit, setOrderNeedsDeposit] = useState(false);

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

  // Services Catalog filter & pagination
  const [servicesTabCategory, setServicesTabCategory] = useState<number | 'all'>('all');
  const [servicesTabSubcategory, setServicesTabSubcategory] = useState<string>('all');
  const [servicesTabLang, setServicesTabLang] = useState<'all' | 'ar' | 'en'>('all');
  const [servicesTabPage, setServicesTabPage] = useState<number>(1);
  const SERVICES_PER_PAGE = 50;

  // Clean actual username display without generic placeholders
  const displayUsername = user.username || user.firstname || 'مستخدم';
  const cleanFullName = [user.firstname, user.lastname]
    .filter(
      (part) =>
        part &&
        part !== 'المستخدم' &&
        part !== 'مستخدم' &&
        part !== 'المتصل' &&
        part !== 'جوجل' &&
        part.toLowerCase() !== (user.username || '').toLowerCase()
    )
    .join(' ')
    .trim();

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

      setCategories(Array.isArray(catData) ? catData : []);
      setServices(Array.isArray(srvData) ? srvData : []);
      setOrders(ordData.orders || []);
      setTransactions(txData.transactions || []);
      setPaymentMethods(pmData.methods || []);
      setTickets(tickData.tickets || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  // Build hierarchical Platform -> Subcategories (Arabic first, then English) -> Services (Price ASC)
  const platformBuckets = useMemo<PlatformBucket[]>(() => {
    const q = serviceSearch.trim().toLowerCase();

    return categories
      .filter((cat) => selectedPlatform === 'all' || cat.id === Number(selectedPlatform))
      .map((cat) => {
        const platformServices = services.filter((s) => {
          if (s.categoryId !== cat.id) return false;
          if (!q) return true;
          return (
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            (s.categoryName && s.categoryName.toLowerCase().includes(q)) ||
            (s.subcategoryDisplay && s.subcategoryDisplay.toLowerCase().includes(q)) ||
            String(s.id).includes(q)
          );
        });

        const subMap = new Map<string, Service[]>();
        for (const srv of platformServices) {
          const rawSub = (srv.categoryName || cat.name).trim();
          const key = `${cat.id}::${rawSub}`;
          const existing = subMap.get(key);
          if (existing) {
            existing.push(srv);
          } else {
            subMap.set(key, [srv]);
          }
        }

        const arabicSubcategories: SubcategoryGroup[] = [];
        const englishSubcategories: SubcategoryGroup[] = [];

        subMap.forEach((srvList, key) => {
          // Sort services inside every subcategory from cheapest to most expensive
          const sortedList = [...srvList].sort((a, b) => a.rate - b.rate || a.id - b.id);
          const first = sortedList[0];
          const rawName = (first.categoryName || cat.name).trim();
          const isArabic =
            first.isArabicCategory !== undefined
              ? first.isArabicCategory
              : /[\u0600-\u06FF]/.test(rawName);
          const displayName = first.subcategoryDisplay || rawName;
          const minRate = first.rate;

          if (languageFilter === 'ar' && !isArabic) return;
          if (languageFilter === 'en' && isArabic) return;

          const group: SubcategoryGroup = {
            key,
            rawName,
            displayName,
            isArabic,
            platformId: cat.id,
            platformName: cat.name,
            minRate,
            minRateEgp: (minRate * exchangeRate).toFixed(2),
            services: sortedList,
          };

          if (isArabic) {
            arabicSubcategories.push(group);
          } else {
            englishSubcategories.push(group);
          }
        });

        // Sort subcategories cleanly so lowest starting price or primary categories appear smoothly
        arabicSubcategories.sort((a, b) => a.minRate - b.minRate);
        englishSubcategories.sort((a, b) => a.minRate - b.minRate);

        return {
          platform: cat,
          arabicSubcategories,
          englishSubcategories,
          totalServices:
            arabicSubcategories.reduce((acc, g) => acc + g.services.length, 0) +
            englishSubcategories.reduce((acc, g) => acc + g.services.length, 0),
        };
      })
      .filter((b) => b.arabicSubcategories.length > 0 || b.englishSubcategories.length > 0);
  }, [categories, services, selectedPlatform, languageFilter, serviceSearch, exchangeRate]);

  // Flat ordered list of all currently visible subcategories
  const allVisibleSubcategories = useMemo<SubcategoryGroup[]>(() => {
    const list: SubcategoryGroup[] = [];
    for (const bucket of platformBuckets) {
      list.push(...bucket.arabicSubcategories);
      list.push(...bucket.englishSubcategories);
    }
    return list;
  }, [platformBuckets]);

  // Auto-select first subcategory when platform, language filter, or search changes
  useEffect(() => {
    if (allVisibleSubcategories.length === 0) {
      setSelectedSubcategory('');
      return;
    }
    const stillExists = allVisibleSubcategories.some((g) => g.key === selectedSubcategory);
    if (!stillExists) {
      setSelectedSubcategory(allVisibleSubcategories[0].key);
    }
  }, [allVisibleSubcategories, selectedSubcategory]);

  // Services inside the currently selected subcategory (strictly sorted by lowest price first)
  const currentSubcategoryGroup = useMemo(() => {
    return (
      allVisibleSubcategories.find((g) => g.key === selectedSubcategory) ||
      allVisibleSubcategories[0] ||
      null
    );
  }, [allVisibleSubcategories, selectedSubcategory]);

  const categoryServices = useMemo(() => {
    if (!currentSubcategoryGroup) return [];
    return currentSubcategoryGroup.services;
  }, [currentSubcategoryGroup]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === Number(selectedServiceId)),
    [services, selectedServiceId]
  );

  // Auto-select first (cheapest!) service when subcategory changes
  useEffect(() => {
    if (categoryServices.length > 0) {
      const existsInSubcat = categoryServices.some((s) => s.id === Number(selectedServiceId));
      if (!existsInSubcat) {
        setSelectedServiceId(categoryServices[0].id);
      }
    } else {
      setSelectedServiceId('');
    }
  }, [categoryServices, selectedSubcategory]);

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
    setOrderNeedsDeposit(false);

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
        if (data.needsDeposit) {
          setOrderNeedsDeposit(true);
        }
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
    <div className="min-h-screen bg-[#0f1117] pt-3 sm:pt-4 pb-28 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 space-y-5 sm:space-y-7">
        {/* Welcome Hero — displays actual username cleanly without extra Google badges */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#181b26] via-[#1c202e] to-[#181b26] border border-[#272c3d] p-4 sm:p-7 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f6b100]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={
                    user.avatar?.startsWith('http') || user.avatar?.startsWith('/brand')
                      ? user.avatar
                      : `/images/avatars/${user.avatar || 'duck-happy.jpg'}`
                  }
                  alt={displayUsername}
                  className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-[#f6b100]/60 shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/brand/yellow-duck.svg';
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#f6b100]">أهلًا بك مجددًا 👋</span>
                  <span className="text-[11px] font-mono text-slate-400 bg-[#0f1117]/80 px-2 py-0.5 rounded-lg border border-[#272c3d]">
                    @{user.username}
                  </span>
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-white truncate mt-0.5">
                  {displayUsername}
                  {cleanFullName && (
                    <span className="text-sm sm:text-base font-bold text-slate-400 mr-2">
                      ({cleanFullName})
                    </span>
                  )}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                  إدارة طلبات السوشيال ميديا، متابعة الرصيد والتحويلات المالية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={() => setActiveTab('add-funds')}
                className="flex-1 sm:flex-initial justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#f6b100]/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>إضافة رصيد الآن</span>
              </button>
              <button
                onClick={() => {
                  onRefreshUser();
                  fetchData();
                }}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#222634] hover:bg-[#2c3244] text-slate-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 text-[#f6b100] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium block">رصيدك الحالي</span>
              <div className="text-base sm:text-xl font-black text-white tabular-nums truncate">
                {user.balanceEgp.toLocaleString()} ج.م
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal tabular-nums">
                ${user.balance.toFixed(2)} USD
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium block">إجمالي طلباتك</span>
              <div className="text-base sm:text-xl font-black text-white tabular-nums">{orders.length}</div>
              <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium tabular-nums">
                {orders.filter((o) => o.status === 'completed').length} مكتمل
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium block">إجمالي الصرف</span>
              <div className="text-base sm:text-xl font-black text-white tabular-nums truncate">
                {(totalSpentUsd * exchangeRate).toFixed(2)} ج.م
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal tabular-nums">
                ${totalSpentUsd.toFixed(2)} USD
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#181b26] border border-[#272c3d] flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium block">الخدمات المتاحة</span>
              <div className="text-base sm:text-xl font-black text-white tabular-nums">{services.length}</div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal">
                مرتبة بالأقل سعراً
              </span>
            </div>
          </div>
        </div>

        {/* Platform Strip Shortcut Chips (All Platforms + 12 Ordered Platforms) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#181b26] border border-[#272c3d]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-300">
              اختر المنصة لتصفية أقسامها الفرعية (عربي وإنجليزي):
            </span>
            {selectedPlatform !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedPlatform('all')}
                className="text-[11px] font-bold text-[#f6b100] hover:underline cursor-pointer"
              >
                عرض جميع المنصات ({services.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:flex-wrap scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setSelectedPlatform('all');
                setActiveTab('new-order');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedPlatform === 'all'
                  ? 'bg-[#f6b100] text-black shadow-md shadow-[#f6b100]/20'
                  : 'bg-[#222634] text-slate-300 hover:bg-[#2c3244]'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>كل المنصات ({services.length})</span>
            </button>

            {categories.map((c) => {
              const isActive = selectedPlatform === c.id;
              const platformCount = services.filter((s) => s.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(c.id);
                    setActiveTab('new-order');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#f6b100] text-black shadow-md shadow-[#f6b100]/20'
                      : 'bg-[#222634] text-slate-300 hover:bg-[#2c3244]'
                  }`}
                >
                  <img src={c.icon} alt="" className="w-4 h-4 object-contain shrink-0" />
                  <span>{c.name.split('-')[0].trim()}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                      isActive ? 'bg-black/20 text-black font-black' : 'bg-[#181b26] text-slate-400'
                    }`}
                  >
                    {platformCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-[#272c3d] pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('new-order')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'new-order' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>طلب جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'services' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4 shrink-0" />
            <span>قائمة الأقسام والأسعار</span>
          </button>

          <button
            onClick={() => setActiveTab('mass-order')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'mass-order' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>طلب جماعي</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'orders' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>سجل الطلبات ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add-funds')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'add-funds' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>إضافة رصيد</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'transactions' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>سجل الإيداعات ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tickets' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>الدعم والتذاكر ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>الملف الشخصي</span>
          </button>
        </div>

        {/* TAB 1: NEW ORDER */}
        {activeTab === 'new-order' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            <div className="lg:col-span-8 bg-[#181b26] p-4 sm:p-7 rounded-3xl border border-[#272c3d] shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>إنشاء طلب جديد</span>
                  <span className="text-xs font-normal text-slate-400">(تنفيذ آلي وفوري)</span>
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-xl w-fit">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>الخدمات مرتبة من الأرخص إلى الأغلى</span>
                </span>
              </div>

              {orderSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{orderSuccess}</span>
                </div>
              )}

              {orderError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                    <div className="flex-1">
                      <div className="leading-relaxed">{orderError}</div>
                      {orderNeedsDeposit && (
                        <div className="mt-3 pt-3 border-t border-rose-500/25 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-300">
                            يمكنك شحن المحفظة فوراً عبر فودافون كاش أو إنستاباي:
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('add-funds')}
                            className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-[#f6b100]/20 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>شحن المحفظة الآن</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateOrder} className="space-y-5">
                {/* Search / Filter service */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    البحث السريع في الأقسام أو الخدمات
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="ابحث باسم الخدمة، نوع التفاعل، أو رقم الخدمة (ID)..."
                      className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  </div>
                </div>

                {/* Language Filter Pills for Subcategories */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="text-xs font-bold text-slate-300">
                    القسم الفرعي ({allVisibleSubcategories.length} قسم متاح):
                  </label>
                  <div className="flex items-center gap-1.5 bg-[#0f1117] p-1 rounded-xl border border-[#272c3d] text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setLanguageFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        languageFilter === 'all'
                          ? 'bg-[#f6b100] text-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الكل (عربي ثم إنجليزي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguageFilter('ar')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        languageFilter === 'ar'
                          ? 'bg-emerald-500 text-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      أقسام عربي
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguageFilter('en')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        languageFilter === 'en'
                          ? 'bg-sky-500 text-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      أقسام إنجليزي
                    </button>
                  </div>
                </div>

                {/* Detailed Subcategory Select: Grouped by Platform -> Arabic Subcategories -> English Subcategories */}
                <div>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs font-semibold focus:outline-none focus:border-[#f6b100]"
                  >
                    {platformBuckets.length === 0 ? (
                      <option value="">لا توجد أقسام مطابقة لبحثك</option>
                    ) : (
                      platformBuckets.map((bucket) => (
                        <React.Fragment key={bucket.platform.id}>
                          {bucket.arabicSubcategories.length > 0 && (
                            <optgroup
                              label={`🟢 ${bucket.platform.name} — الأقسام العربية (${bucket.arabicSubcategories.length})`}
                            >
                              {bucket.arabicSubcategories.map((sub) => (
                                <option key={sub.key} value={sub.key}>
                                  {sub.displayName} ({sub.services.length} خدمة — تبدأ من {sub.minRateEgp} ج.م)
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {bucket.englishSubcategories.length > 0 && (
                            <optgroup
                              label={`🔵 ${bucket.platform.name} — الأقسام الإنجليزية (${bucket.englishSubcategories.length})`}
                            >
                              {bucket.englishSubcategories.map((sub) => (
                                <option key={sub.key} value={sub.key}>
                                  {sub.displayName} ({sub.services.length} خدمة — تبدأ من {sub.minRateEgp} ج.م)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </select>
                </div>

                {/* Service Select — Strictly sorted by lowest price first */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      الخدمة المطلوبة ({categoryServices.length} خدمة في هذا القسم)
                    </label>
                    <span className="text-[11px] text-[#f6b100] font-semibold">
                      الأرخص سعراً في الأعلى ↑
                    </span>
                  </div>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                    className="w-full px-3.5 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs font-semibold focus:outline-none focus:border-[#f6b100]"
                  >
                    {categoryServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.rate * exchangeRate).toFixed(2)} ج.م (${s.rate.toFixed(3)}) — {s.name} [#{s.id}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Metadata Box */}
                {selectedService && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#272c3d]/70">
                      <span className="text-[11px] font-bold text-[#f6b100]">
                        {selectedService.subcategoryDisplay || selectedService.categoryName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        رقم الخدمة: #{selectedService.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">الحد الأدنى</small>
                        <strong className="text-white font-black tabular-nums">
                          {selectedService.min.toLocaleString()}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">الحد الأقصى</small>
                        <strong className="text-white font-black tabular-nums">
                          {selectedService.max.toLocaleString()}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">السعر لكل 1000</small>
                        <strong className="text-[#f6b100] font-black tabular-nums">
                          {(selectedService.rate * exchangeRate).toFixed(2)} ج.م
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#181b26] border border-[#272c3d]">
                        <small className="text-slate-400 block text-[10px]">السعر بالدولار</small>
                        <strong className="text-emerald-400 font-bold tabular-nums">
                          ${selectedService.rate.toFixed(3)}
                        </strong>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed bg-[#181b26]/60 p-3 rounded-xl border border-[#272c3d]/50">
                      <span className="font-bold text-white block mb-0.5">{selectedService.name}</span>
                      <span className="text-slate-400">{selectedService.description}</span>
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
                    className="w-full px-3.5 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
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
                    className="w-full px-3.5 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs tabular-nums focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                {/* Live Charge Box */}
                <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#f6b100]/30 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block">إجمالي التكلفة المحتسبة:</span>
                    <div className="text-lg sm:text-xl font-black text-[#f6b100] tabular-nums">
                      {calculatedChargeEgp.toFixed(2)} جنيه مصري
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      يعادل (${calculatedChargeUsd.toFixed(4)} USD)
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-xs text-slate-400 block">رصيدك الحالي:</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        user.balanceEgp >= calculatedChargeEgp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {user.balanceEgp.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                {/* Proactive Low Balance Alert */}
                {calculatedChargeEgp > 0 && user.balanceEgp < calculatedChargeEgp && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        رصيدك الحالي ({user.balanceEgp.toLocaleString()} ج.م) أقل من تكلفة الطلب (
                        {calculatedChargeEgp.toFixed(2)} ج.م). ينقصك{' '}
                        {(calculatedChargeEgp - user.balanceEgp).toFixed(2)} ج.م.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('add-funds')}
                      className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#f6b100]/20 cursor-pointer whitespace-nowrap"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>شحن المحفظة فوراً</span>
                    </button>
                  </div>
                )}

                {/* Submit button / Deposit Redirect */}
                {calculatedChargeEgp > 0 && user.balanceEgp < calculatedChargeEgp ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('add-funds')}
                    className="w-full py-3.5 min-h-[48px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f6b100]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>الرصيد غير كافٍ — اضغط هنا لشحن الرصيد فوراً</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={orderSubmitting}
                    className="w-full py-3.5 min-h-[48px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{orderSubmitting ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال الطلب'}</span>
                  </button>
                )}
              </form>
            </div>

            {/* Sidebar Guidelines */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-[#181b26] p-5 sm:p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#f6b100]" />
                  <span>إرشادات قبل تقديم الطلب</span>
                </h3>
                <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed list-disc list-inside">
                  <li>تأكد من أن الحساب مفتوح للعامة وغير مقفل (Public).</li>
                  <li>الأقسام مرتبة لكل منصة: الأقسام العربية أولاً ثم الإنجليزية.</li>
                  <li>جميع الخدمات داخل كل قسم مرتبة تلقائياً من الأقل سعراً إلى الأعلى.</li>
                  <li>لا تقم بطلب نفس الرابط مرتين في نفس الوقت حتى يكتمل الطلب الأول.</li>
                </ul>
              </div>

              <div className="bg-[#181b26] p-5 sm:p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-2">طرق الدفع السريعة</h3>
                <p className="text-xs text-slate-400 mb-4">
                  اشحن رصيدك عبر فودافون كاش أو إنستاباي واستلم رصيدك خلال دقائق.
                </p>
                <button
                  onClick={() => setActiveTab('add-funds')}
                  className="w-full py-3 min-h-[44px] rounded-xl bg-[#222634] hover:bg-[#2c3244] text-[#f6b100] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>شحن الرصيد الآن</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS HISTORY (Desktop Table + Mobile Cards) */}
        {activeTab === 'orders' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-white">سجل طلباتك</h2>
                <p className="text-xs text-slate-400">متابعة حالة جميع الطلبات المنشأة</p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب أو الرابط..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100] w-full sm:w-60"
                />

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
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
              <>
                {/* Mobile Cards View (< md) */}
                <div className="md:hidden space-y-3">
                  {filteredOrders.map((o) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-white text-sm">#{o.id}</span>
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
                      </div>

                      <div className="text-xs font-bold text-slate-100 leading-snug">{o.serviceName}</div>
                      <div className="text-[11px] text-slate-400">{o.categoryName}</div>

                      <a
                        href={o.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-400 hover:underline flex items-center gap-1 break-all"
                      >
                        <span className="line-clamp-1">{o.link}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#272c3d]/60 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">الكمية</span>
                          <strong className="text-white tabular-nums">{o.quantity.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">التكلفة</span>
                          <strong className="text-[#f6b100] tabular-nums">
                            {(o.charge * exchangeRate).toFixed(2)} ج.م
                          </strong>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-400 block">التاريخ</span>
                          <span className="text-slate-300 tabular-nums">{o.createdAt.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
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
                          <td className="p-3.5 font-black text-white tabular-nums">#{o.id}</td>
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
                          <td className="p-3.5 font-bold text-white tabular-nums">
                            {o.quantity.toLocaleString()}
                          </td>
                          <td className="p-3.5 font-bold text-[#f6b100] tabular-nums">
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
                          <td className="p-3.5 text-slate-400 tabular-nums">{o.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: ADD FUNDS */}
        {activeTab === 'add-funds' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            <div className="lg:col-span-8 bg-[#181b26] p-4 sm:p-7 rounded-3xl border border-[#272c3d] shadow-xl">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
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
                      <img src={`/images/${m.image}`} alt={m.name} className="w-10 h-10 object-contain shrink-0" />
                      <div>
                        <div className="font-bold text-white text-xs">{m.name}</div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          الحد الأدنى: {m.min} ج.م | الرسوم: {m.fee}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Details Card */}
              {currentPaymentMethod && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-4 mb-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-[11px] text-slate-400">رقم المحفظة / الحساب للتحويل:</span>
                      <div className="text-base sm:text-lg font-black text-white tracking-wide font-mono">
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
                      className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#222634] hover:bg-[#2c3244] text-xs font-bold text-[#f6b100] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedAccount ? 'تم النسخ!' : 'نسخ الرقم'}</span>
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
                    placeholder="مثال: 550 جنيه"
                    className="w-full px-3.5 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs tabular-nums focus:outline-none focus:border-[#f6b100]"
                  />
                  {typeof depositAmountEgp === 'number' && depositAmountEgp > 0 && (
                    <small className="text-emerald-400 block mt-1 text-xs font-semibold tabular-nums">
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
                    className="w-full px-3.5 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    صورة إيصال التحويل (اختياري - لتسريع الفحص)
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="cursor-pointer px-4 py-2.5 min-h-[42px] rounded-xl bg-[#0f1117] border border-[#272c3d] hover:border-[#f6b100] text-slate-300 text-xs font-medium flex items-center gap-2 transition-colors">
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
                    className="w-full px-3.5 py-3 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={depositSubmitting}
                  className="w-full py-3.5 min-h-[48px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{depositSubmitting ? 'جاري إرسال الإشعار...' : 'تأكيد إرسال الإيداع'}</span>
                </button>
              </form>
            </div>

            {/* Deposit Info Sidebar */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-[#181b26] p-5 sm:p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>وقت المعالجة المعتاد</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يتم فحص ومراجعة الإيداعات اليدوية في فترات قصيرة لا تتعدى من 5 إلى 15 دقيقة على مدار الساعة.
                </p>
              </div>

              <div className="bg-[#181b26] p-5 sm:p-6 rounded-3xl border border-[#272c3d]">
                <h3 className="text-sm font-bold text-white mb-2">سعر الصرف الحسابي</h3>
                <p className="text-xs text-slate-400 mb-3 tabular-nums">
                  1 دولار أمريكي = {exchangeRate} جنيه مصري
                </p>
                <div className="text-[11px] text-slate-500">
                  إذا واجهتك أي مشكلة، تواصل مع الدعم الفني فوراً.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TRANSACTIONS HISTORY (Desktop Table + Mobile Cards) */}
        {activeTab === 'transactions' && (
          <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-4 sm:p-6 shadow-xl">
            <h2 className="text-lg font-black text-white mb-1">سجل المعاملات والإيداعات</h2>
            <p className="text-xs text-slate-400 mb-6">قائمة بجميع الإيداعات وشحنات الرصيد في حسابك</p>

            {transactions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">لا توجد معاملات مسجلة حتى الآن.</div>
            ) : (
              <>
                {/* Mobile Cards View (< md) */}
                <div className="md:hidden space-y-3">
                  {transactions.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-white">{t.reference}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                      </div>
                      <div className="text-xs font-bold text-amber-300">{t.methodName}</div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#272c3d]/60 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">المبلغ</span>
                          <strong className="text-[#f6b100] tabular-nums">
                            {t.amountEgp.toLocaleString()} ج.م
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">بالدولار</span>
                          <strong className="text-emerald-400 tabular-nums">${t.amountUsd.toFixed(2)}</strong>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-400 block">المحول</span>
                          <span className="text-slate-300 font-mono">{t.senderPhone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
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
                          <td className="p-3.5 font-black text-[#f6b100] tabular-nums">
                            {t.amountEgp.toLocaleString()} ج.م
                          </td>
                          <td className="p-3.5 font-bold text-emerald-400 tabular-nums">
                            ${t.amountUsd.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-slate-300 font-mono">{t.senderPhone}</td>
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
                          <td className="p-3.5 text-slate-400 tabular-nums">{t.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: MASS ORDER */}
        {activeTab === 'mass-order' && (
          <div className="bg-[#181b26] p-4 sm:p-7 rounded-3xl border border-[#272c3d] shadow-xl max-w-4xl mx-auto">
            <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#f6b100]" />
              <span>طلب جماعي (Mass Order)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              أدخل كل طلب في سطر منفصل بالصيغة التالية:{' '}
              <code className="bg-[#0f1117] px-2 py-0.5 rounded text-amber-300 font-mono">
                رقم_الخدمة | الكمية | الرابط
              </code>
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
                <div>• يمكنك معرفة أرقام الخدمات (ID) من تبويب "قائمة الأقسام والأسعار".</div>
                <div>
                  • افصل بين رقم الخدمة والكمية والرابط بعلامة الفاصل العمودي{' '}
                  <code className="text-[#f6b100]">|</code>.
                </div>
                <div>• سيتم التحقق من رصيدك وخصم إجمالي التكلفة دفعة واحدة.</div>
              </div>

              <button
                type="submit"
                disabled={massSubmitting}
                className="w-full py-3.5 min-h-[48px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{massSubmitting ? 'جاري تنفيذ الطلبات...' : 'إرسال الطلب الجماعي'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB: SUPPORT TICKETS */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Tickets list */}
            <div className="lg:col-span-5 bg-[#181b26] p-4 sm:p-6 rounded-3xl border border-[#272c3d] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#f6b100]" />
                  <span>تذاكر الدعم الفني ({tickets.length})</span>
                </h2>
                <button
                  onClick={() => setActiveTicketId(null)}
                  className="px-3 py-2 min-h-[38px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs transition-colors cursor-pointer"
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
                        <span>
                          {t.category === 'order' ? 'استفسار طلب' : t.category === 'deposit' ? 'إيداع مالي' : 'عام'}
                        </span>
                        <span>{t.updatedAt.slice(0, 16)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ticket Conversation or New Ticket Form */}
            <div className="lg:col-span-7 bg-[#181b26] p-4 sm:p-6 rounded-3xl border border-[#272c3d] shadow-xl">
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
                              className="px-4 py-2.5 min-h-[40px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  <p className="text-xs text-slate-400 mb-6">
                    فريق الدعم متاح 24/7 لمساعدتك في أي استفسار أو مشكلة
                  </p>

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full py-3 min-h-[44px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors disabled:opacity-50 cursor-pointer"
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
          <div className="bg-[#181b26] p-4 sm:p-8 rounded-3xl border border-[#272c3d] shadow-xl max-w-3xl mx-auto">
            <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#f6b100]" />
              <span>إعدادات الملف الشخصي (@{user.username})</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              تعديل بياناتك واختيار صورتك الرمزية المفضلة من شخصيات البطة الصفرا
            </p>

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
                <label className="block text-xs font-bold text-slate-300 mb-3">
                  اختر الصورة الرمزية (Duck Avatar):
                </label>
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
                className="w-full py-3.5 min-h-[46px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-colors shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 cursor-pointer"
              >
                {profileSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: SERVICES CATALOG (Ordered by Platform -> Arabic Subcats -> English Subcats -> Price ASC) */}
        {activeTab === 'services' &&
          (() => {
            const platformOrderMap = new Map<number, number>();
            categories.forEach((c, idx) => platformOrderMap.set(c.id, idx));

            // Collect subcategories for the selected platform in Catalog
            const catalogSubcategories = Array.from(
              new Set(
                services
                  .filter((s) => servicesTabCategory === 'all' || s.categoryId === servicesTabCategory)
                  .map((s) => s.categoryName || 'عام')
              )
            );

            const filtered = services
              .filter((s) => {
                const matchesCat = servicesTabCategory === 'all' || s.categoryId === servicesTabCategory;
                if (!matchesCat) return false;
                if (servicesTabSubcategory !== 'all' && s.categoryName !== servicesTabSubcategory) return false;
                const isAr =
                  s.isArabicCategory !== undefined
                    ? s.isArabicCategory
                    : /[\u0600-\u06FF]/.test(s.categoryName || '');
                if (servicesTabLang === 'ar' && !isAr) return false;
                if (servicesTabLang === 'en' && isAr) return false;

                if (!serviceSearch.trim()) return true;
                const q = serviceSearch.toLowerCase();
                return (
                  s.name.toLowerCase().includes(q) ||
                  s.id.toString().includes(q) ||
                  s.description.toLowerCase().includes(q) ||
                  (s.categoryName && s.categoryName.toLowerCase().includes(q)) ||
                  (s.subcategoryDisplay && s.subcategoryDisplay.toLowerCase().includes(q))
                );
              })
              .sort((a, b) => {
                // 1. Platform order (Instagram, Facebook, TikTok, YouTube...)
                const pA = platformOrderMap.get(a.categoryId) ?? 99;
                const pB = platformOrderMap.get(b.categoryId) ?? 99;
                if (pA !== pB) return pA - pB;

                // 2. Arabic subcategories first, then English subcategories
                const arA = a.isArabicCategory ? 0 : 1;
                const arB = b.isArabicCategory ? 0 : 1;
                if (arA !== arB) return arA - arB;

                // 3. Same subcategory grouped together, or sorted by cheapest rate
                if (a.categoryName !== b.categoryName) {
                  return (a.categoryName || '').localeCompare(b.categoryName || '');
                }

                // 4. Inside each subcategory: lowest price to highest price
                return a.rate - b.rate;
              });

            const totalPages = Math.ceil(filtered.length / SERVICES_PER_PAGE) || 1;
            const safePage = Math.min(Math.max(1, servicesTabPage), totalPages);
            const startIndex = (safePage - 1) * SERVICES_PER_PAGE;
            const currentServices = filtered.slice(startIndex, startIndex + SERVICES_PER_PAGE);

            return (
              <div className="bg-[#181b26] rounded-3xl border border-[#272c3d] p-4 sm:p-6 shadow-xl space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#f6b100]" />
                      <span>قائمة الأقسام الفرعية والأسعار المعتمدة</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      مرتبة حسب المنصة (الأقسام العربية ثم الإنجليزية) وداخل كل قسم من الأرخص إلى الأغلى سعراً
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="ابحث باسم الخدمة أو القسم أو ID..."
                      value={serviceSearch}
                      onChange={(e) => {
                        setServiceSearch(e.target.value);
                        setServicesTabPage(1);
                      }}
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                {/* Platform Categories Filter Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => {
                      setServicesTabCategory('all');
                      setServicesTabSubcategory('all');
                      setServicesTabPage(1);
                    }}
                    className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      servicesTabCategory === 'all'
                        ? 'bg-[#f6b100] text-black shadow-md shadow-[#f6b100]/20'
                        : 'bg-[#0f1117] text-slate-300 hover:bg-[#222634] border border-[#272c3d]'
                    }`}
                  >
                    جميع المنصات ({services.length})
                  </button>
                  {categories.map((c) => {
                    const catCount = services.filter((s) => s.categoryId === c.id).length;
                    const isSelected = servicesTabCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setServicesTabCategory(c.id);
                          setServicesTabSubcategory('all');
                          setServicesTabPage(1);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-[#f6b100] text-black shadow-md shadow-[#f6b100]/20'
                            : 'bg-[#0f1117] text-slate-300 hover:bg-[#222634] border border-[#272c3d]'
                        }`}
                      >
                        <img src={c.icon} alt="" className="w-3.5 h-3.5 object-contain" />
                        <span>{c.name.split('-')[0].trim()}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                            isSelected ? 'bg-black/20 text-black' : 'bg-[#222634] text-slate-400'
                          }`}
                        >
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Subcategory & Language Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-7">
                    <select
                      value={servicesTabSubcategory}
                      onChange={(e) => {
                        setServicesTabSubcategory(e.target.value);
                        setServicesTabPage(1);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs font-semibold focus:outline-none focus:border-[#f6b100]"
                    >
                      <option value="all">جميع الأقسام الفرعية ({catalogSubcategories.length} قسم)</option>
                      {catalogSubcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5 flex items-center justify-end gap-1.5 bg-[#0f1117] p-1 rounded-xl border border-[#272c3d] text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setServicesTabLang('all');
                        setServicesTabPage(1);
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        servicesTabLang === 'all' ? 'bg-[#f6b100] text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setServicesTabLang('ar');
                        setServicesTabPage(1);
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        servicesTabLang === 'ar' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      عربي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setServicesTabLang('en');
                        setServicesTabPage(1);
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        servicesTabLang === 'en' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      إنجليزي
                    </button>
                  </div>
                </div>

                {/* Services Table Info */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    عرض {filtered.length === 0 ? 0 : startIndex + 1} -{' '}
                    {Math.min(startIndex + SERVICES_PER_PAGE, filtered.length)} من إجمالي{' '}
                    {filtered.length.toLocaleString()} خدمة
                  </span>
                  <span>
                    الصفحة {safePage} من {totalPages}
                  </span>
                </div>

                {/* Mobile Cards (< md) */}
                <div className="md:hidden space-y-3">
                  {currentServices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      لا توجد خدمات مطابقة لبحثك في هذا القسم حالياً.
                    </div>
                  ) : (
                    currentServices.map((s) => (
                      <div
                        key={s.id}
                        className="p-4 rounded-2xl bg-[#0f1117] border border-[#272c3d] space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-slate-400">#{s.id}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#181b26] text-[#f6b100] border border-[#272c3d] truncate max-w-[220px]">
                            {s.subcategoryDisplay || s.categoryName}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white leading-relaxed">{s.name}</div>
                        <div className="flex items-center justify-between pt-2 border-t border-[#272c3d]/60">
                          <div>
                            <span className="text-[10px] text-slate-400 block">السعر لكل 1000</span>
                            <strong className="text-sm font-black text-[#f6b100] tabular-nums">
                              {(s.rate * exchangeRate).toFixed(2)} ج.م
                            </strong>
                            <span className="text-[10px] text-slate-500 mr-1 tabular-nums">
                              (${s.rate.toFixed(3)})
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-slate-400 block">الحدود</span>
                            <span className="text-[11px] text-slate-200 font-mono tabular-nums">
                              {s.min.toLocaleString()} - {s.max.toLocaleString()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlatform(s.categoryId);
                              setLanguageFilter('all');
                              setSelectedSubcategory(`${s.categoryId}::${(s.categoryName || '').trim()}`);
                              setSelectedServiceId(s.id);
                              setActiveTab('new-order');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-4 py-2 min-h-[40px] rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-all shadow-md shadow-[#f6b100]/20 cursor-pointer"
                          >
                            اطلب الآن
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#272c3d]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#0f1117] text-slate-400 border-b border-[#272c3d]">
                      <tr>
                        <th className="p-3.5 font-bold">الرقم</th>
                        <th className="p-3.5 font-bold">القسم الفرعي / المنصة</th>
                        <th className="p-3.5 font-bold">اسم الخدمة</th>
                        <th className="p-3.5 font-bold">السعر لكل 1000</th>
                        <th className="p-3.5 font-bold">الحد الأدنى</th>
                        <th className="p-3.5 font-bold">الحد الأقصى</th>
                        <th className="p-3.5 font-bold text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#272c3d]/50 bg-[#141721]">
                      {currentServices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            لا توجد خدمات مطابقة لبحثك في هذا القسم حالياً.
                          </td>
                        </tr>
                      ) : (
                        currentServices.map((s) => (
                          <tr key={s.id} className="hover:bg-[#222634]/50 transition-colors">
                            <td className="p-3.5 font-mono text-slate-400 tabular-nums">#{s.id}</td>
                            <td className="p-3.5 font-bold text-slate-200 max-w-[240px]">
                              <div className="truncate text-[#f6b100]" title={s.subcategoryDisplay || s.categoryName}>
                                {s.subcategoryDisplay || s.categoryName}
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {s.platformName} • {s.isArabicCategory ? 'قسم عربي' : 'قسم إنجليزي'}
                              </span>
                            </td>
                            <td className="p-3.5 max-w-md">
                              <div className="font-semibold text-white leading-snug">{s.name}</div>
                              {s.description && (
                                <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {s.description}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 font-black text-[#f6b100] whitespace-nowrap tabular-nums">
                              {(s.rate * exchangeRate).toFixed(2)} ج.م
                              <span className="block text-[10px] text-slate-500 font-normal">
                                ${s.rate.toFixed(3)} USD
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-300 font-mono tabular-nums">
                              {s.min.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-slate-300 font-mono tabular-nums">
                              {s.max.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlatform(s.categoryId);
                                  setLanguageFilter('all');
                                  setSelectedSubcategory(`${s.categoryId}::${(s.categoryName || '').trim()}`);
                                  setSelectedServiceId(s.id);
                                  setActiveTab('new-order');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-3.5 py-2 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-all shadow-md shadow-[#f6b100]/20 cursor-pointer whitespace-nowrap"
                              >
                                اطلب الآن
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="text-xs text-slate-400">
                      الصفحة <strong className="text-white">{safePage}</strong> من{' '}
                      <strong className="text-white">{totalPages}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setServicesTabPage((p) => Math.max(1, p - 1))}
                        className="px-3.5 py-2 min-h-[38px] rounded-xl bg-[#0f1117] border border-[#272c3d] text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        السابق
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum = safePage - 2 + i;
                          if (pageNum < 1) pageNum = 1 + i;
                          if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                          if (pageNum < 1 || pageNum > totalPages) return null;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setServicesTabPage(pageNum)}
                              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                safePage === pageNum
                                  ? 'bg-[#f6b100] text-black font-black'
                                  : 'bg-[#0f1117] border border-[#272c3d] text-slate-300 hover:bg-[#222634]'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setServicesTabPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3.5 py-2 min-h-[38px] rounded-xl bg-[#0f1117] border border-[#272c3d] text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
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

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        aria-label="شريط التنقل السريع للهاتف"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12141c]/95 backdrop-blur-lg border-t border-[#272c3d] px-1.5 py-1.5 flex items-center justify-around shadow-2xl"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('new-order');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all cursor-pointer ${
            activeTab === 'new-order'
              ? 'text-[#f6b100] font-black'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <PlusCircle className={`w-5 h-5 ${activeTab === 'new-order' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">طلب جديد</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('services');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'text-[#f6b100] font-black'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'services' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">الأقسام</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('orders');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all relative cursor-pointer ${
            activeTab === 'orders'
              ? 'text-[#f6b100] font-black'
              : 'text-slate-400 font-medium hover:text-slate-200'
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
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all cursor-pointer ${
            activeTab === 'add-funds'
              ? 'text-[#f6b100] font-black'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'add-funds' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">شحن رصيد</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tickets');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all cursor-pointer ${
            activeTab === 'tickets'
              ? 'text-[#f6b100] font-black'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${activeTab === 'tickets' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">الدعم</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-[#f6b100] font-black'
              : 'text-slate-400 font-medium hover:text-slate-200'
          }`}
        >
          <UserIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'scale-110 text-[#f6b100]' : ''}`} />
          <span className="text-[10px] mt-1">حسابي</span>
        </button>
      </nav>
    </div>
  );
};
