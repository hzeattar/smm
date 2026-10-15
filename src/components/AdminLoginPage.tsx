import React, { useState } from 'react';
import { User } from '../types';
import { Shield, Lock, User as UserIcon, ArrowRight, AlertTriangle, KeyRound } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (adminUser: User) => void;
  onBackToStore: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          isAdminLogin: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل التحقق من بيانات المشرف');
      }

      if (data.user.role !== 'admin') {
        throw new Error('هذا الحساب ليس لديه صلاحيات الإدارة.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء محاولة تسجيل دخول الإدارة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-[#f6b100] selection:text-black">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(246,177,0,0.12),rgba(255,255,255,0))]" />

      <div className="w-full max-w-md relative z-10">
        {/* Top Back Action */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#f6b100] transition-colors py-2 px-3 rounded-xl hover:bg-[#181b26] cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمتجر الرئيسي</span>
          </button>
          <span className="text-[11px] font-mono text-slate-500 bg-[#161922] px-2.5 py-1 rounded-lg border border-[#272c3d]">
            PATH: /admin
          </span>
        </div>

        {/* Admin Login Card */}
        <div className="bg-[#141721] border border-[#272c3d] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Subtle Security Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#f6b100] to-yellow-300" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-[#f6b100] shadow-lg shadow-[#f6b100]/10">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">بوابة إدارة النظام</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              منطقة محمية ومخصصة لمشرفي المنصة فقط. يتطلب الوصول إدخال بيانات اعتماد الإدارة.
            </p>
          </div>

          {/* Security Notice */}
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-[11px] text-amber-300 font-medium leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              جميع محاولات الدخول إلى مسار الإدارة مراقبة ومسجلة بحسب معايير الأمان لمنع التسلل والوصول غير المصرح.
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم مستخدم المشرف (Admin Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-[#0b0d13] border border-[#272c3d] text-white text-xs font-semibold focus:outline-none focus:border-[#f6b100] transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كلمة المرور المشفرة (Admin Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-[#0b0d13] border border-[#272c3d] text-white text-xs font-semibold focus:outline-none focus:border-[#f6b100] transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3.5 px-4 rounded-xl bg-[#f6b100] hover:bg-[#e09f00] text-black font-extrabold text-xs transition-all shadow-xl shadow-[#f6b100]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحقق من الصلاحيات...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>تسجيل الدخول إلى لوحة التحكم</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 pt-5 border-t border-[#272c3d]/60 text-center">
            <span className="text-[11px] text-slate-500">
              منصة البطة الصفرا لخدمات السوشيال ميديا © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
