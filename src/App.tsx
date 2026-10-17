import React, { useState, useEffect } from 'react';
import { User } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AuthModal } from './components/AuthModal';
import { TermsModal } from './components/TermsModal';
import { initAuth, logoutGoogle } from './lib/firebaseAuth';
import { apiFetch as fetch } from './lib/apiFetch';

const SESSION_STORAGE_KEY = 'yd_active_session_v5';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(55);
  const [currentView, setCurrentView] = useState<'welcome' | 'dashboard' | 'admin' | 'admin-login'>('welcome');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const userRef = React.useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const persistUserSession = (u: User | null) => {
    try {
      if (u) {
        const payload = JSON.stringify({ userId: u.id, username: u.username, role: u.role });
        localStorage.setItem(SESSION_STORAGE_KEY, payload);
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        document.cookie = `yellow_duck_session_v5=${encodeURIComponent(payload)}; path=/; max-age=28800; ${
          isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax'
        }`;
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        document.cookie = 'yellow_duck_session_v5=; path=/; max-age=0';
      }
    } catch {}
  };

  // Load current user
  const fetchCurrentUser = async () => {
    try {
      const savedSession = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
      const res = await fetch('/api/auth/me', {
        headers: savedSession ? { 'x-yd-session': savedSession } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          persistUserSession(data.user);
          setUser(data.user);
        } else {
          setUser(null);
        }
        if (data.exchangeRate) {
          setExchangeRate(data.exchangeRate);
        }

        // Check path on initial load
        const path = window.location.pathname;
        if (path === '/admin' || path.startsWith('/admin')) {
          if (data.user && data.user.role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('admin-login');
          }
        } else if (path === '/dashboard') {
          if (data.user) {
            setCurrentView(data.user.role === 'admin' ? 'admin' : 'dashboard');
          } else {
            setCurrentView('welcome');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    const unsubscribe = initAuth();

    const handlePopState = () => {
      const activeUser = userRef.current;
      const path = window.location.pathname;
      if (path === '/admin' || path.startsWith('/admin')) {
        if (activeUser && activeUser.role === 'admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('admin-login');
        }
      } else if (path === '/dashboard') {
        if (activeUser) {
          setCurrentView(activeUser.role === 'admin' ? 'admin' : 'dashboard');
        } else {
          setCurrentView('welcome');
        }
      } else {
        setCurrentView('welcome');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleLogout = async () => {
    persistUserSession(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    await logoutGoogle();
    setUser(null);
    window.history.pushState({}, '', '/');
    setCurrentView('welcome');
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    persistUserSession(loggedInUser);
    setUser(loggedInUser);
    if (loggedInUser.role === 'admin') {
      window.history.pushState({}, '', '/admin');
      setCurrentView('admin');
    } else {
      window.history.pushState({}, '', '/dashboard');
      setCurrentView('dashboard');
    }
  };

  const handleAdminLoginSuccess = (adminUser: User) => {
    persistUserSession(adminUser);
    setUser(adminUser);
    window.history.pushState({}, '', '/admin');
    setCurrentView('admin');
  };

  const handleAdminBackToStore = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('welcome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: string) => {
    if (view === 'admin') {
      window.history.pushState({}, '', '/admin');
      if (user && user.role === 'admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('admin-login');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'dashboard') {
      if (!user) {
        handleOpenAuth('login');
        return;
      }
      if (user.role === 'admin') {
        window.history.pushState({}, '', '/admin');
        setCurrentView('admin');
      } else {
        window.history.pushState({}, '', '/dashboard');
        setCurrentView('dashboard');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.history.pushState({}, '', '/');
    setCurrentView('welcome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-[#f6b100] flex items-center justify-center p-2.5 animate-bounce mb-4 shadow-xl shadow-[#f6b100]/30">
          <img src="/brand/yellow-duck.svg" alt="البطة الصفرا" className="w-full h-full object-contain" />
        </div>
        <div className="text-sm font-bold text-slate-300">جاري تشغيل البطة الصفرا...</div>
      </div>
    );
  }

  // Dedicated Admin Login Gate View (when accessing /admin without admin session)
  if (currentView === 'admin-login' || (currentView === 'admin' && (!user || user.role !== 'admin'))) {
    return (
      <AdminLoginPage
        onLoginSuccess={handleAdminLoginSuccess}
        onBackToStore={handleAdminBackToStore}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col selection:bg-[#f6b100] selection:text-black">
      <Header
        user={user}
        exchangeRate={exchangeRate}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {currentView === 'welcome' && (
          <LandingPage
            user={user}
            exchangeRate={exchangeRate}
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
            onOpenTerms={() => setIsTermsModalOpen(true)}
          />
        )}

        {currentView === 'dashboard' && user && (
          <UserDashboard
            user={user}
            exchangeRate={exchangeRate}
            onRefreshUser={fetchCurrentUser}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'admin' && user && user.role === 'admin' && (
          <AdminDashboard
            admin={user}
            exchangeRate={exchangeRate}
            onRefresh={fetchCurrentUser}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onOpenTerms={() => {
          setIsAuthModalOpen(false);
          setIsTermsModalOpen(true);
        }}
      />

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
    </div>
  );
};
