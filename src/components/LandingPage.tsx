import React, { useState } from 'react';
import { User } from '../types';
import {
  Zap,
  Package,
  Cpu,
  CreditCard,
  CheckCircle,
  HelpCircle,
  Mail,
  Send,
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Layers,
  ChevronDown,
  Clock,
} from 'lucide-react';

interface LandingPageProps {
  user: User | null;
  exchangeRate: number;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenTerms: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  exchangeRate,
  onNavigate,
  onOpenAuth,
  onOpenTerms,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const platforms = [
    { name: 'Instagram', icon: '/images/platforms/instagram.svg', desc: 'متابعون، إعجابات، مشاهدات ريلز' },
    { name: 'TikTok', icon: '/images/platforms/tiktok.svg', desc: 'مشاهدات فورية، متابعين، لايكات' },
    { name: 'YouTube', icon: '/images/platforms/youtube.svg', desc: 'مشتركين، ساعات مشاهدة، إعجابات' },
    { name: 'Facebook', icon: '/images/platforms/facebook.svg', desc: 'تفاعل صفحات، بوستات ومتابعين' },
    { name: 'Telegram', icon: '/images/platforms/telegram.svg', desc: 'أعضاء قنوات، مشاهدات ومجموعات' },
    { name: 'X (Twitter)', icon: '/images/platforms/x.svg', desc: 'متابعين بريميوم، ريتويت وإعجاب' },
  ];

  const features = [
    {
      icon: <Package className="w-6 h-6 text-[#f6b100]" />,
      title: 'طلبات واضحة ومباشرة',
      desc: 'كل طلب له خدمة ورابط وكمية وحالة وتكلفة واضحة، ويمكن متابعته من حسابك ثانية بثانية.',
    },
    {
      icon: <Cpu className="w-6 h-6 text-[#f6b100]" />,
      title: 'ربط أسرع مزودي API',
      desc: 'مزامنة مستمرة مع أفضل وأوثق مزودي السيرفرات لضمان بدء الخدمات خلال ثوانٍ.',
    },
    {
      icon: <CreditCard className="w-6 h-6 text-[#f6b100]" />,
      title: 'دفع محلي مرن',
      desc: 'ادفع بالجنيه المصري عبر فودافون كاش أو إنستاباي، ويتم تحويلها وحسابها بأمان.',
    },
    {
      icon: <Smartphone className="w-6 h-6 text-[#f6b100]" />,
      title: 'متوافق مع كل الأجهزة',
      desc: 'واجهة عصرية وسلسة مصممة خصيصًا للهواتف الذكية وأجهزة التابلت والكمبيوتر.',
    },
    {
      icon: <Zap className="w-6 h-6 text-[#f6b100]" />,
      title: 'دخول سريع وسهل',
      desc: 'أنشئ حسابك وابدأ اختيار الخدمات والطلب مباشرة بدون أي تعقيد.',
    },
    {
      icon: <Layers className="w-6 h-6 text-[#f6b100]" />,
      title: 'إدارة مركزية شاملة',
      desc: 'لوحة تحكم ذكية تمكنك من مراجعة رصيدك وسجل مدفوعاتك والتحكم في طلباتك.',
    },
  ];

  const faqs = [
    {
      q: 'ما هي منصة البطة الصفرا؟',
      a: 'منصة البطة الصفرا هي لوحة خدمات سوشيال ميديا (SMM Panel) عربية وموثوقة لتقديم خدمات نمو الحسابات والمتابعين والتفاعلات والمشاهدات لمختلف منصات التواصل الاجتماعي بأعلى جودة وأفضل سعر.',
    },
    {
      q: 'كيف يمكنني شحن رصيدي عن طريق فودافون كاش أو إنستاباي؟',
      a: `بكل بساطة: ادخل إلى قسم "إضافة رصيد"، اختر فودافون كاش أو InstaPay، وقم بالتحويل على الرقم أو الحساب الموضح، ثم اكتب رقمك والمبلغ بالجنيه المصري (سعر الصرف حالياً $1 = ${exchangeRate} ج.م) وسيتم مراجعة الإيداع واعتماده فوراً.`,
    },
    {
      q: 'هل أحتاج لكلمة مرور حسابي في السوشيال ميديا؟',
      a: 'أبداً! لا نطلب أي كلمة مرور لأي حساب إطلاقاً. كل ما نحتاجه هو الرابط العام للحساب أو المنشور فقط.',
    },
    {
      q: 'ماذا يحدث إذا لم يكتمل الطلب أو حدث أي نقص؟',
      a: 'العديد من خدماتنا تأتي مع ضمان تعويض تلقائي، وفي حال عدم اكتمال أي طلب يتم استرداد الرصيد المتبقي مباشرة إلى محفظتك في المنصة.',
    },
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactBody) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contactName, email: contactEmail, body: contactBody }),
      });
      if (res.ok) {
        setContactSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactBody('');
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-[#222634]">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#f6b100]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f6b100]/15 border border-[#f6b100]/30 text-[#f6b100] text-xs font-bold">
                <span>🐥</span>
                <span>منصة عربية لخدمات السوشيال ميديا</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                كل خدمات السوشيال ميديا في مكان واحد مع{' '}
                <span className="text-[#f6b100] underline decoration-[#f6b100]/40 decoration-wavy decoration-2">
                  البطة الصفرا
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                اطلب المتابعين والمشاهدات والتفاعلات والخدمات الرقمية بسهولة، تابع طلباتك من لوحة واحدة، واربط مزودي الخدمات والدفع بطريقة منظمة وسريعة.
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {user ? (
                  <button
                    onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'dashboard')}
                    className="px-6 py-3.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm shadow-xl shadow-[#f6b100]/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <span>الذهاب إلى لوحة التحكم</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenAuth('register')}
                      className="px-6 py-3.5 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-sm shadow-xl shadow-[#f6b100]/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <span>ابدأ الآن مجانًا</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenAuth('login')}
                      className="px-6 py-3.5 rounded-xl bg-[#181b26] hover:bg-[#222634] border border-[#272c3d] text-slate-200 font-bold text-sm transition-all"
                    >
                      عندي حساب بالفعل
                    </button>
                  </>
                )}
              </div>

              {/* Trust Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
                <div className="flex items-center gap-2 bg-[#181b26]/80 border border-[#272c3d] px-3 py-2 rounded-xl text-xs text-slate-200">
                  <span className="text-[#f6b100]">⚡</span>
                  <span>طلب سريع وفوري</span>
                </div>
                <div className="flex items-center gap-2 bg-[#181b26]/80 border border-[#272c3d] px-3 py-2 rounded-xl text-xs text-slate-200">
                  <span className="text-[#f6b100]">📦</span>
                  <span>متابعة حالة الطلب</span>
                </div>
                <div className="flex items-center gap-2 bg-[#181b26]/80 border border-[#272c3d] px-3 py-2 rounded-xl text-xs text-slate-200">
                  <span className="text-[#f6b100]">🔌</span>
                  <span>مزودون متعددون</span>
                </div>
                <div className="flex items-center gap-2 bg-[#181b26]/80 border border-[#272c3d] px-3 py-2 rounded-xl text-xs text-slate-200">
                  <span className="text-[#f6b100]">💳</span>
                  <span>دفع كاش وإنستاباي</span>
                </div>
              </div>
            </div>

            {/* Hero Card Graphic */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-gradient-to-b from-[#181b26] to-[#12141c] border border-[#272c3d] p-7 shadow-2xl shadow-black/60 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f6b100]/10 rounded-full blur-2xl"></div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#f6b100] flex items-center justify-center p-2 shadow-lg shadow-[#f6b100]/20">
                      <img src="/brand/yellow-duck.svg" alt="البطة الصفرا" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">البطة الصفرا SMM</h3>
                      <p className="text-xs text-slate-400">لوحة واحدة لكل احتياجاتك</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    جاهزة للتشغيل
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  اختر الخدمة، أضف الرابط والكمية، وتابع الطلب من لحظة الإنشاء وحتى الإكمال بأعلى درجات الدقة والسرعة.
                </p>

                {/* Stat Grid */}
                <div className="grid grid-cols-3 gap-3 bg-[#0f1117] p-3.5 rounded-2xl border border-[#272c3d] text-center mb-6">
                  <div>
                    <strong className="block text-lg font-black text-[#f6b100]">24/7</strong>
                    <span className="text-[11px] text-slate-400">المنصة متاحة</span>
                  </div>
                  <div className="border-x border-[#272c3d]">
                    <strong className="block text-lg font-black text-white">API</strong>
                    <span className="text-[11px] text-slate-400">سيرفرات فائقة</span>
                  </div>
                  <div>
                    <strong className="block text-lg font-black text-emerald-400">3</strong>
                    <span className="text-[11px] text-slate-400">خطوات للطلب</span>
                  </div>
                </div>

                {/* Quick platform badges preview */}
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400 font-medium">المنصات الشائعة:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#272c3d]/60 text-xs text-slate-200 flex items-center gap-1.5">
                      <img src="/images/platforms/instagram.svg" alt="" className="w-3.5 h-3.5" /> Instagram
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#272c3d]/60 text-xs text-slate-200 flex items-center gap-1.5">
                      <img src="/images/platforms/tiktok.svg" alt="" className="w-3.5 h-3.5" /> TikTok
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#272c3d]/60 text-xs text-slate-200 flex items-center gap-1.5">
                      <img src="/images/platforms/youtube.svg" alt="" className="w-3.5 h-3.5" /> YouTube
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#272c3d]/60 text-xs text-slate-200 flex items-center gap-1.5">
                      <img src="/images/platforms/facebook.svg" alt="" className="w-3.5 h-3.5" /> Facebook
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Strip */}
      <section className="py-6 bg-[#12141c] border-b border-[#222634]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4 text-xs font-semibold text-slate-300">
            <span className="text-slate-400 font-bold">المنصات المدعومة:</span>
            {platforms.map((p) => (
              <div key={p.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181b26] border border-[#272c3d]">
                <img src={p.icon} alt={p.name} className="w-4 h-4 object-contain" />
                <span>{p.name}</span>
              </div>
            ))}
            <div className="text-[#f6b100] font-bold">⚡ والمزيد من المنصات...</div>
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section id="services" className="py-16 border-b border-[#222634]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#f6b100] text-xs font-bold uppercase tracking-wider">الخدمات</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">الخدمات الأكثر طلبًا</h2>
            <p className="text-sm text-slate-400 mt-2">
              المنصة مجهزة لتوفير كافة خدمات السوشيال ميديا مع تحديث الأسعار والمزامنة الفورية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((p) => (
              <div
                key={p.name}
                onClick={() => {
                  if (user) onNavigate(user.role === 'admin' ? 'admin' : 'dashboard');
                  else onOpenAuth('login');
                }}
                className="group p-6 rounded-2xl bg-[#181b26] border border-[#272c3d] hover:border-[#f6b100]/60 transition-all cursor-pointer hover:shadow-xl hover:shadow-[#f6b100]/5 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#222634] group-hover:bg-[#f6b100]/20 flex items-center justify-center mb-4 transition-colors">
                    <img src={p.icon} alt={p.name} className="w-6 h-6 object-contain" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#f6b100] transition-colors">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{p.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#272c3d] flex items-center justify-between text-xs font-bold text-[#f6b100]">
                  <span>طلب الخدمة</span>
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Yellow Duck Features */}
      <section className="py-16 bg-[#12141c] border-b border-[#222634]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#f6b100] text-xs font-bold uppercase tracking-wider">ليه البطة الصفرا؟</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">تجربة بسيطة وسريعة وموثوقة</h2>
            <p className="text-sm text-slate-400 mt-2">
              ركزنا على تجربة سهلة بدون تعقيد لكي تطلب وتتابع طلباتك بثقة وأمان تام.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#181b26] border border-[#272c3d]">
                <div className="w-12 h-12 rounded-xl bg-[#222634] flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works: 3 Steps */}
      <section className="py-16 border-b border-[#222634]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#f6b100] text-xs font-bold uppercase tracking-wider">طريقة الاستخدام</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">3 خطوات بسيطة فقط</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#181b26] border border-[#272c3d] relative">
              <div className="w-9 h-9 rounded-full bg-[#f6b100] text-black font-black flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">أنشئ حسابك واشحن رصيدك</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                سجل حسابك في دقيقة واحدة واشحن رصيدك بسهولة عبر فودافون كاش أو إنستاباي.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#181b26] border border-[#272c3d] relative">
              <div className="w-9 h-9 rounded-full bg-[#f6b100] text-black font-black flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">اختر الخدمة المناسبة</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                حدد المنصة ونوع الخدمة (متابعين، لايكات، مشاهدات)، ضع الرابط والكمية المطلوبة.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#181b26] border border-[#272c3d] relative">
              <div className="w-9 h-9 rounded-full bg-[#f6b100] text-black font-black flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">تابع تنفيذ طلبك فوراً</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                شاهد حالة طلبك وتقدمه لحظة بلحظة مباشرة من جدول الطلبات في لوحة حسابك.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-16 bg-[#12141c] border-b border-[#222634]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-[#f6b100] text-xs font-bold uppercase tracking-wider">F.A.Q</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">الأسئلة الشائعة</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#181b26] border border-[#272c3d] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-right text-sm sm:text-base font-bold text-white hover:text-[#f6b100] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transform transition-transform ${openFaq === idx ? 'rotate-180 text-[#f6b100]' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 border-t border-[#272c3d]/50 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-us" className="py-16 border-b border-[#222634]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[#f6b100] text-xs font-bold uppercase tracking-wider">الدعم الفني</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">محتاج مساعدة؟</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                ارسل استفسارك أو طلبك وسيقوم فريق الدعم بمراجعة رسالتك والرد عليك فوراً.
              </p>
              <div className="p-4 rounded-xl bg-[#181b26] border border-[#272c3d] text-xs space-y-2 text-slate-300">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Mail className="w-4 h-4 text-[#f6b100]" />
                  <span>البريد الإلكتروني: support@yellowduck.com</span>
                </div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>ساعات العمل: 24 ساعة على مدار الأسبوع</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#181b26] p-6 rounded-2xl border border-[#272c3d]">
              <h3 className="text-lg font-bold text-white mb-4">تواصل معنا</h3>

              {contactSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  تم إرسال رسالتك بنجاح! سيتم التواصل معك قريبًا.
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="مثال: أحمد محمود"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رسالتك</label>
                  <textarea
                    rows={4}
                    required
                    value={contactBody}
                    onChange={(e) => setContactBody(e.target.value)}
                    placeholder="اكتب استفسارك أو تفاصيل المشكلة هنا..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0b0d13] text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/brand/yellow-duck.svg" alt="البطة الصفرا" className="w-6 h-6 object-contain" />
            <span className="font-bold text-white">منصة البطة الصفرا SMM</span>
            <span>• جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onOpenTerms} className="hover:text-white transition-colors">
              الشروط والأحكام
            </button>
            <span>•</span>
            <span className="text-slate-500">سعر الصرف: 1$ = {exchangeRate} ج.م</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
