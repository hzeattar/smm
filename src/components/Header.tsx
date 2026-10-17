import React, { useState } from 'react';
import { User } from '../types';
import { Wallet, LogOut, Sparkles, LayoutDashboard, Menu, X } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  exchangeRate: number;
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  exchangeRate,
  currentView,
  onNavigate,
  onOpenAuth,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayUsername = user?.username || user?.firstname || 'مستخدم';

  return (
    <header className="sticky top-0 z-40 bg-[#0f1117]/95 backdrop-blur-md border-b border-[#222634]">
      {/* Top Info Strip */}
      <div className="bg-[#181b26] border-b border-[#272c3d]/60 px-3 sm:px-4 py-1 text-[11px] sm:text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 truncate">
            <span className="font-semibold text-[#f6b100] whitespace-nowrap">سعر الصرف المعتمد:</span>
            <span className="bg-[#272c3d] px-2 py-0.5 rounded text-slate-200 tabular-nums whitespace-nowrap">
              1 USD = <strong className="text-white">{exchangeRate}</strong> ج.م
            </span>
            <span className="hidden md:inline text-slate-400">· بوابات الدفع: فودافون كاش وإنستاباي</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <span className="sm:hidden text-[11px] font-bold text-emerald-400 tabular-nums">
                {user.balanceEgp.toLocaleString()} ج.م
              </span>
            )}
            <span className="hidden sm:inline text-slate-400">الدعم الفني متاح 24/7</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div
          onClick={() => {
            onNavigate('welcome');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#f6b100] flex items-center justify-center p-1.5 shadow-lg shadow-[#f6b100]/20 group-hover:scale-105 transition-transform">
            <img src="/brand/yellow-duck.svg" alt="البطة الصفرا" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-[#f6b100] transition-colors whitespace-nowrap">
                البطة الصفرا
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f6b100]/20 text-[#f6b100]">
                SMM
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400 leading-none">
              لخدمات السوشيال ميديا المباشرة
            </p>
          </div>
        </div>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('welcome')}
            className={`hover:text-[#f6b100] transition-colors whitespace-nowrap cursor-pointer ${
              currentView === 'welcome' ? 'text-[#f6b100] font-bold' : ''
            }`}
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
            className="hover:text-[#f6b100] transition-colors whitespace-nowrap cursor-pointer"
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
            className="hover:text-[#f6b100] transition-colors whitespace-nowrap cursor-pointer"
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
            className="hover:text-[#f6b100] transition-colors whitespace-nowrap cursor-pointer"
          >
            تواصل معنا
          </button>
        </nav>

        {/* User / Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
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
                  <div className="text-xs font-bold text-white flex items-center gap-1 tabular-nums">
                    <span>{user.balanceEgp.toLocaleString()} ج.م</span>
                    <span className="text-slate-400 font-normal text-[10px]">(${user.balance.toFixed(2)})</span>
                  </div>
                </div>
              </div>

              {/* User badge — always displays actual username cleanly */}
              <div
                onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#181b26] border border-[#272c3d] hover:border-[#383f56] cursor-pointer transition-colors min-h-[40px]"
              >
                <img
                  src={
                    user.avatar?.startsWith('http') || user.avatar?.startsWith('/brand')
                      ? user.avatar
                      : `/images/avatars/${user.avatar || 'duck-happy.jpg'}`
                  }
                  alt={displayUsername}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-[#272c3d] shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/brand/yellow-duck.svg';
                  }}
                />
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1 max-w-[95px] sm:max-w-[150px] truncate">
                    <span className="truncate">{displayUsername}</span>
                    {user.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold shrink-0">
                        أدمن
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-[10px] text-slate-400 truncate max-w-[140px]">
                    @{user.username}
                  </div>
                </div>
              </div>

              {/* Dashboard / Control Button */}
              <button
                onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 min-h-[40px] rounded-xl bg-[#f6b100] text-black font-bold text-xs hover:bg-[#e09f00] transition-colors shadow-md shadow-[#f6b100]/20 cursor-pointer whitespace-nowrap"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">لوحة التحكم</span>
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-[#181b26] transition-colors cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>دخول بجيميل</span>
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-[#181b26] transition-colors cursor-pointer whitespace-nowrap"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold bg-[#f6b100] text-black hover:bg-[#e09f00] transition-colors shadow-lg shadow-[#f6b100]/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>إنشاء حساب</span>
              </button>
            </div>
          )}

          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#181b26] border border-[#272c3d] text-slate-300 hover:text-white cursor-pointer"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#141721] border-t border-[#272c3d] px-4 py-3 space-y-2 shadow-2xl">
          {user && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f1117] border border-[#272c3d] mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#f6b100]" />
                <span className="text-xs text-slate-300">الرصيد المتاح:</span>
              </div>
              <div className="text-xs font-black text-white tabular-nums">
                {user.balanceEgp.toLocaleString()} ج.م{' '}
                <span className="text-slate-400 font-normal">(${user.balance.toFixed(2)})</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              onClick={() => {
                onNavigate('welcome');
                setMobileMenuOpen(false);
              }}
              className="py-2.5 px-3 rounded-xl bg-[#181b26] text-slate-200 hover:text-[#f6b100] text-right cursor-pointer"
            >
              الرئيسية
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate(user.role === 'admin' ? 'admin' : 'dashboard');
                } else {
                  onNavigate('welcome');
                  setTimeout(() => {
                    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="py-2.5 px-3 rounded-xl bg-[#181b26] text-slate-200 hover:text-[#f6b100] text-right cursor-pointer"
            >
              الخدمات والأسعار
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('welcome');
                setTimeout(() => {
                  document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="py-2.5 px-3 rounded-xl bg-[#181b26] text-slate-200 hover:text-[#f6b100] text-right cursor-pointer"
            >
              الأسئلة الشائعة
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('welcome');
                setTimeout(() => {
                  document.getElementById('contact-us')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="py-2.5 px-3 rounded-xl bg-[#181b26] text-slate-200 hover:text-[#f6b100] text-right cursor-pointer"
            >
              تواصل معنا
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
