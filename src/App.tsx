import React, { useState, useEffect } from 'react';
import { User } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { TermsModal } from './components/TermsModal';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(55);
  const [currentView, setCurrentView] = useState<'welcome' | 'dashboard' | 'admin'>('welcome');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current user
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.exchangeRate) {
          setExchangeRate(data.exchangeRate);
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
  }, []);

  // Quick Switch between user and admin
  const handleSwitchRole = async () => {
    if (!user) return;
    const targetUserId = user.role === 'admin' ? 2 : 1;
    try {
      const res = await fetch(`/api/auth/me?current_user_id=${targetUserId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCurrentView(data.user.role === 'admin' ? 'admin' : 'dashboard');
      }
    } catch (err) {
      console.error('Failed to switch role', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    setCurrentView('welcome');
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView(loggedInUser.role === 'admin' ? 'admin' : 'dashboard');
  };

  const handleNavigate = (view: string) => {
    if (view === 'dashboard' || view === 'admin') {
      if (!user) {
        handleOpenAuth('login');
        return;
      }
      if (view === 'admin' && user.role !== 'admin') {
        // switch to admin or notify
        setCurrentView('dashboard');
        return;
      }
      setCurrentView(view as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentView('welcome');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col selection:bg-[#f6b100] selection:text-black">
      <Header
        user={user}
        exchangeRate={exchangeRate}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
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
