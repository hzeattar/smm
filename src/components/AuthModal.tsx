import React, { useState } from 'react';
import { User } from '../types';
import { X, Lock, Mail, User as UserIcon, Check, Sparkles, Shield } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { appUser } = await googleSignIn();
      onLoginSuccess(appUser);
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed')) {
        setError('تم إغلاق نافذة تسجيل الدخول من Google قبل اكتمال العملية.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // user clicked again or cancelled
      } else {
        setError(err.message || 'تعذر تسجيل الدخول بحساب Google. تأكد من السماح بالنوافذ المنبثقة.');
      }
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#181b26] border border-[#272c3d] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#222634] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="text-center mb-6">
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
        <div className="grid grid-cols-2 gap-2 bg-[#0f1117] p-1 rounded-2xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all ${
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
            className={`py-2 rounded-xl transition-all ${
              mode === 'register' ? 'bg-[#f6b100] text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            إنشاء حساب
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Google One-Click Sign In */}
        <div className="mb-5 space-y-3">
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
                  placeholder="اسم المستخدم أو البريد الإلكتروني"
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
              className="w-full py-3 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#f6b100]/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'جاري الإنشاء...' : 'إنشاء الحساب وبدء الطلب'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
