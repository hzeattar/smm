import React, { useState } from 'react';
import { User } from '../types';
import { X, Lock, Mail, User as UserIcon, Check, Copy, Info } from 'lucide-react';
import { googleSignIn } from '../lib/firebaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onOpenTerms: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onLoginSuccess,
  onOpenTerms,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Direct Google Fallback state when popup is blocked, closed, or domain is not whitelisted
  const [showGoogleFallback, setShowGoogleFallback] = useState(false);
  const [isDomainUnauthorized, setIsDomainUnauthorized] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleDisplayName, setGoogleDisplayName] = useState('');
  const [showFirebaseDomainGuide, setShowFirebaseDomainGuide] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'smm-production-de6d.up.railway.app';

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { appUser } = await googleSignIn();
      onLoginSuccess(appUser);
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      const errCode = String(err.code || '');
      const errMsg = String(err.message || '');

      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        setIsDomainUnauthorized(true);
        setShowGoogleFallback(true);
        setError(null);
      } else if (errCode === 'auth/cancelled-popup-request') {
        // user clicked again, ignore
      } else if (errCode === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed')) {
        setIsDomainUnauthorized(false);
        setShowGoogleFallback(true);
        setError('تم إغلاق النافذة المنبثقة؛ يمكنك إتمام الدخول فوراً بإدخال بريد Gmail أدناه.');
      } else if (errCode === 'auth/popup-blocked' || errMsg.includes('popup-blocked')) {
        setIsDomainUnauthorized(false);
        setShowGoogleFallback(true);
        setError('تم حظر النافذة المنبثقة في المتصفح؛ يمكنك المتابعة فوراً عبر الدخول السريع أدناه.');
      } else {
        setIsDomainUnauthorized(false);
        setShowGoogleFallback(true);
        setError('يمكنك المتابعة مباشرة بإدخال بريد Gmail الخاص بك أدناه لتسجيل الدخول الفوري.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDirectGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = googleEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('يرجى إدخال بريد Google / Gmail صحيح.');
      return;
    }

    setError(null);
    setGoogleLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          displayName: googleDisplayName.trim() || trimmedEmail.split('@')[0],
          photoUrl: '/brand/yellow-duck.svg',
          uid: `google_${trimmedEmail.replace(/[^a-z0-9]/g, '_')}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر إتمام الدخول بحساب Google');
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاتصال بحساب Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'تعذر تسجيل الدخول. راجع البيانات وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAgreed) {
      setError('يجب الموافقة على الشروط والأحكام أولاً');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, firstname, lastname, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'تعذر إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden my-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#222634] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#f6b100] flex items-center justify-center p-2 mx-auto mb-3 shadow-lg shadow-[#f6b100]/20">
            <img src="/brand/yellow-duck.svg" alt="البطة الصفرا" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-black text-white">
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'ادخل إلى لوحة التحكم لإدارة طلباتك ورصيدك'
              : 'أنشئ حسابك واحصل على رصيد ترحيبي مجاني'}
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#0f1117] p-1 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'login' ? 'bg-[#f6b100] text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'register' ? 'bg-[#f6b100] text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            إنشاء حساب
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Google One-Click Sign In or Direct Fallback */}
        <div className="mb-5 space-y-3">
          {!showGoogleFallback ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2.5 border border-slate-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>
                  {googleLoading
                    ? 'جاري الاتصال بحساب Google...'
                    : mode === 'login'
                    ? 'الدخول المباشر بحساب Google / Gmail'
                    : 'التسجيل الفوري بحساب Google / Gmail'}
                </span>
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsDomainUnauthorized(false);
                    setShowGoogleFallback(true);
                    setError(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-[#f6b100] transition-colors cursor-pointer"
                >
                  أو الدخول السريع ببريد Gmail مباشرة بدون نافذة منبثقة
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#0f1117] border border-[#f6b100]/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span className="text-xs font-bold text-white">الدخول السريع بحساب Google / Gmail</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleFallback(false)}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              <form onSubmit={handleDirectGoogleSubmit} className="space-y-2.5">
                <input
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="أدخل بريدك في Gmail (مثال: name@gmail.com)"
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
                <input
                  type="text"
                  value={googleDisplayName}
                  onChange={(e) => setGoogleDisplayName(e.target.value)}
                  placeholder="الاسم الظاهر (اختياري)"
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs transition-all cursor-pointer"
                >
                  {googleLoading ? 'جاري تسجيل الدخول...' : 'متابعة الدخول الفوري بحساب Google'}
                </button>
              </form>

              {/* Firebase Authorized Domain Helper (only shown when domain is unauthorized) */}
              {isDomainUnauthorized && (
                <div className="pt-2 border-t border-[#272c3d]">
                  <button
                    type="button"
                    onClick={() => setShowFirebaseDomainGuide(!showFirebaseDomainGuide)}
                    className="flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>كيف أفعل نافذة Google المنبثقة على هذا الدومين؟</span>
                  </button>

                  {showFirebaseDomainGuide && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[#181b26] border border-[#272c3d] text-[11px] text-slate-300 space-y-2 leading-relaxed">
                      <p>
                        لتفعيل النافذة المنبثقة المباشرة من Firebase على دومين Railway، افتح{' '}
                        <strong className="text-white">Firebase Console</strong> ثم انتقل إلى:
                        <span className="block font-mono text-[10px] text-[#f6b100] mt-0.5">
                          Authentication &rarr; Settings &rarr; Authorized domains &rarr; Add domain
                        </span>
                      </p>
                      <div className="flex items-center justify-between gap-2 bg-[#0f1117] px-2.5 py-1.5 rounded-lg border border-[#272c3d]">
                        <code className="font-mono text-[11px] text-emerald-400 truncate">{currentDomain}</code>
                        <button
                          type="button"
                          onClick={handleCopyDomain}
                          className="px-2 py-1 rounded bg-[#222634] hover:bg-[#2c3244] text-white text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedDomain ? 'تم النسخ' : 'نسخ الدومين'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#272c3d]" />
            <span className="text-[11px] text-slate-500 font-medium">أو بالبيانات اليدوية</span>
            <div className="flex-1 h-px bg-[#272c3d]" />
          </div>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="user@yellowduck.app أو admin@yellowduck.app"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستخدم</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: ahmed_duck"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الأول</label>
                <input
                  type="text"
                  required
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="الاسم الأول"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم العائلة</label>
                <input
                  type="text"
                  required
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="مثال: محمود"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] text-white text-xs focus:outline-none focus:border-[#f6b100]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="rounded bg-[#0f1117] border-[#272c3d] text-[#f6b100] focus:ring-0"
              />
              <span className="text-xs text-slate-400">
                أوافق على{' '}
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-[#f6b100] hover:underline"
                >
                  الشروط والأحكام
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'جاري الإنشاء...' : 'إنشاء الحساب وبدء الطلب'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
