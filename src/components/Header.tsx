import React from 'react';
import { User } from '../types';
import { Wallet, ShieldCheck, UserCheck, LogOut, ArrowRightLeft, Sparkles, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  exchangeRate: number;
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onLogout: () => void;
  onSwitchRole: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  exchangeRate,
  currentView,
  onNavigate,
  onOpenAuth,
  onLogout,
  onSwitchRole,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0f1117]/90 backdrop-blur-md border-b border-[#222634]">
      {/* Top Banner with Exchange Rate & Role Switcher */}
      <div className="bg-[#181b26] border-b border-[#272c3d]/60 px-4 py-1.5 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-[#f6b100]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              سعر الصرف المعتمد:
            </span>
            <span className="bg-[#272c3d] px-2 py-0.5 rounded text-slate-200">
              1 دولار (USD) = <strong className="text-white">{exchangeRate}</strong> جنيه (EGP)
            </span>
            <span className="hidden md:inline text-slate-400">• بوابات الدفع: فودافون كاش & إنستاباي</span>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={onSwitchRole}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#272c3d] hover:bg-[#343b52] text-amber-300 hover:text-amber-200 transition-colors text-xs"
                title="التبديل بين وضع المستخدم والأدمن لتجربة المنصة"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>التبديل إلى {user.role === 'admin' ? 'وضع العميل' : 'لوحة الإدارة'}</span>
              </button>
            )}
            <span className="text-slate-400">الدعم الفني متاح 24/7</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate('welcome')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#f6b100] flex items-center justify-center p-1.5 shadow-lg shadow-[#f6b100]/20 group-hover:scale-105 transition-transform">
            <img src="/brand/yellow-duck.svg" alt="البطة الصفرا" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-[#f6b100] transition-colors">
                البطة الصفرا
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f6b100]/20 text-[#f6b100]">SMM</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">لخدمات السوشيال ميديا المباشرة</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('welcome')}
            className={`hover:text-[#f6b100] transition-colors ${currentView === 'welcome' ? 'text-[#f6b100] font-bold' : ''}`}
          >
            الرئيسية
          </button>
          <button
            onClick={() => {
              if (user) {
                onNavigate(user.role === 'admin' ? 'admin' : 'dashboard');
              } else {
                onNavigate('welcome');
                setTimeout(() => {
                  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-[#f6b100] transition-colors"
          >
            الخدمات والأسعار
          </button>
          <button
            onClick={() => {
              onNavigate('welcome');
              setTimeout(() => {
                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="hover:text-[#f6b100] transition-colors"
          >
            الأسئلة الشائعة
          </button>
          <button
            onClick={() => {
              onNavigate('welcome');
              setTimeout(() => {
                document.getElementById('contact-us')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="hover:text-[#f6b100] transition-colors"
          >
            تواصل معنا
          </button>
        </nav>

        {/* User / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Wallet info */}
              <div
                onClick={() => onNavigate('dashboard')}
                className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#181b26] border border-[#272c3d] hover:border-[#f6b100]/50 cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#f6b100]/10 flex items-center justify-center text-[#f6b100]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">الرصيد المتاح</div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{user.balanceEgp.toLocaleString()} ج.م</span>
                    <span className="text-slate-400 font-normal text-[10px]">(${user.balance.toFixed(2)})</span>
                  </div>
                </div>
              </div>

              {/* User badge */}
              <div
                onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-[#181b26] border border-[#272c3d] hover:border-[#383f56] cursor-pointer transition-colors"
              >
                <img
                  src={`/images/avatars/${user.avatar || 'duck-happy.jpg'}`}
                  alt={user.firstname}
                  className="w-8 h-8 rounded-lg object-cover border border-[#272c3d]"
                  onError={(e) => {
                    // Fallback to duck-happy
                    (e.target as HTMLImageElement).src = '/brand/yellow-duck.svg';
                  }}
                />
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                    {user.firstname} {user.lastname}
                    {user.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-semibold">
                        أدمن
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">@{user.username}</div>
                </div>
              </div>

              {/* Dashboard / Control Button */}
              <button
                onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f6b100] text-black font-bold text-xs hover:bg-[#e09f00] transition-colors shadow-md shadow-[#f6b100]/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-[#181b26] transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-[#181b26] transition-colors"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f6b100] text-black hover:bg-[#e09f00] transition-colors shadow-lg shadow-[#f6b100]/20 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>إنشاء حساب</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
