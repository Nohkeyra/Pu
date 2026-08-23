import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, User, Shield, Trash2, Home } from 'lucide-react';

interface FallbackDashboardProps {
  onExit: () => void;
}

export default function FallbackDashboard({ onExit }: FallbackDashboardProps) {
  const [stats, setStats] = useState({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    platform: Capacitor.getPlatform(),
    native: Capacitor.isNativePlatform(),
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setStats(prev => ({ ...prev, width: window.innerWidth, height: window.innerHeight }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setStatusMsg('Semua cache, preferences, dan session storage telah dikosongkan!');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatusMsg('Gagal membersihkan cache: ' + String(err));
    }
  };

  const handleLaunchStandard = () => {
    try {
      localStorage.removeItem('wawasan_fallback_ui');
    } catch (err) {
      console.warn('Gagal memadam fallback preferences:', err);
    }
    onExit();
    window.location.reload();
  };

  const handleBypassSession = (role: 'guest' | 'admin') => {
    try {
      sessionStorage.setItem('wawasan_session_started', 'true');
      if (role === 'guest') {
        sessionStorage.setItem('wawasan_guest_allowed', 'true');
        window.location.hash = '#/home';
      } else {
        window.location.hash = '#/admin';
      }
      window.location.reload();
    } catch (err) {
      setStatusMsg('Gagal menetapkan session: ' + String(err));
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-stone-950 p-6 flex flex-col justify-between font-body text-charcoal dark:text-stone-200">
      <div className="max-w-md mx-auto w-full space-y-8 pt-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[var(--color-sunshine-cta)]/15 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto border border-[var(--color-sunshine-cta)]/30">
            <AlertTriangle className="w-8 h-8 text-[var(--color-sunshine-cta)]" />
          </div>
          <h1 className="text-2xl font-black text-deep-forest dark:text-stone-50 tracking-tight uppercase">
            Wawasan <span className="text-[var(--color-sunshine-cta)]">Safe Mode</span>
          </h1>
          <p className="microcopy-14-upper text-stone">
            Diagnostic & Fallback Console
          </p>
          {statusMsg && (
            <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium text-center">
              {statusMsg}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-stone-900 border border-border p-5 rounded-3xl shadow-sm space-y-3">
          <h2 className="microcopy-14-upper font-bold text-deep-forest dark:text-amber-400">
            Sistem Diagnostik Semasa
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Status Internet</span>
              <span className={stats.online ? "text-emerald-600 font-bold" : "text-tomato-burst font-bold"}>
                {stats.online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Platform</span>
              <span className="text-deep-forest dark:text-stone-300 font-bold uppercase">{stats.platform}</span>
            </div>
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Capacitor Native</span>
              <span className="text-deep-forest dark:text-stone-300 font-bold">{stats.native ? 'YES' : 'NO'}</span>
            </div>
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Dimensi Skrin</span>
              <span className="text-deep-forest dark:text-stone-300 font-bold">{stats.width}x{stats.height}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          <button
            type="button"
            onClick={() => handleBypassSession('guest')}
            className="touch-target-row w-full min-h-[52px] px-5 bg-white dark:bg-stone-900 hover:bg-cream dark:hover:bg-stone-800 border border-border rounded-2xl font-bold flex items-center justify-between text-left shadow-sm transition-all duration-200"
          >
            <div>
              <span className="block text-sm text-deep-forest dark:text-stone-50">Log Masuk Pelanggan (Guest)</span>
              <span className="microcopy-14 text-stone font-medium">Bypass session guard dan buat tempahan catering</span>
            </div>
            <User className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
          </button>

          <button
            type="button"
            onClick={() => handleBypassSession('admin')}
            className="touch-target-row w-full min-h-[52px] px-5 bg-white dark:bg-stone-900 hover:bg-cream dark:hover:bg-stone-800 border border-border rounded-2xl font-bold flex items-center justify-between text-left shadow-sm transition-all duration-200"
          >
            <div>
              <span className="block text-sm text-deep-forest dark:text-stone-50">Panel Pentadbir (Admin)</span>
              <span className="microcopy-14 text-stone font-medium">Urus pesanan dan jana invois (RM)</span>
            </div>
            <Shield className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
          </button>

          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <button
              type="button"
              onClick={handleClearCache}
              className="touch-target-row min-h-[44px] py-3.5 px-4 bg-tomato-burst/10 hover:bg-tomato-burst/15 border border-tomato-burst/20 text-tomato-burst font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Reset App Cache
            </button>

            <button
              type="button"
              onClick={handleLaunchStandard}
              className="btn-cta touch-target-row min-h-[44px] py-3.5 px-4 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              Standard Mode
            </button>
          </div>
        </div>
      </div>

      <div className="text-center microcopy-12-upper text-stone/80 py-4">
        Restoran Wawasan v1.0 • Diagnostic Helper
      </div>
    </div>
  );
}
