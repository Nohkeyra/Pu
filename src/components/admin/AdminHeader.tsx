import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransparentLogo } from '@/components/TransparentLogo';
import { 
  LogOut, 
  Sun, 
  Moon, 
  CheckCircle, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';

interface AdminHeaderProps {
  language: string;
  theme: string;
  toggleTheme: () => void;
  syncStatus: 'connecting' | 'connected' | 'offline' | 'syncing';
  calendarState?: { ok: boolean; error?: string; loading: boolean };
  onLogout?: () => void | Promise<void>;
  getCalendarEnableUrl?: () => string;
  navigate?: (path: string) => void;
  t?: (key: string) => string;
  adminToken?: string;
  getApiUrl?: (path: string) => string;
}

export function AdminHeader({
  language,
  theme,
  toggleTheme,
  syncStatus,
  calendarState = { ok: false, loading: false },
  onLogout,
  getCalendarEnableUrl = () => '/api/auth/google/calendar',
}: AdminHeaderProps) {
  return (
    <header className="[grid-area:header] border-b border-stone/15 dark:border-white/10 bg-card/80 dark:bg-card/40 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-charcoal p-1.5 flex items-center justify-center border border-amber-500/30 shadow-md">
            <TransparentLogo src="/assets/wawasan_logo.png" alt="Restoran Wawasan Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-display tracking-tight text-deep-forest dark:text-white leading-tight">
                Restoran Wawasan
              </h1>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                Admin HQ
              </Badge>
            </div>
            <p className="microcopy-12 text-stone/80 dark:text-stone-400 font-normal">
              {language === 'en' ? 'Catering Control Center' : 'Pusat Kawalan Katering'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Calendar Status */}
          <div className="hidden md:flex items-center">
            {calendarState.loading ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 text-stone text-xs rounded-xl border border-stone/15">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing Calendar...</span>
              </div>
            ) : calendarState.ok ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl border border-emerald-500/20" title="Google Calendar Sync operational">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Calendar Synced</span>
              </div>
            ) : (
              <a
                href={getCalendarEnableUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Enable Calendar</span>
              </a>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-muted/70 dark:bg-stone-800 border border-stone/15 dark:border-white/10 flex items-center justify-center text-stone dark:text-stone-300 hover:text-crisp-carrot transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Logout Button */}
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 font-semibold text-xs transition-all gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'en' ? 'Log Out' : 'Log Keluar'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sync Status Banner Bar */}
      <div className={`w-full h-7 px-4 sm:px-6 border-t border-stone/15 dark:border-white/10 flex items-center justify-between text-[11px] font-medium transition-all duration-300 ${
        syncStatus === 'connected' 
          ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' 
          : syncStatus === 'syncing'
          ? 'bg-sky-500/5 text-sky-600 dark:text-sky-400'
          : syncStatus === 'connecting'
          ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400'
          : 'bg-stone-500/5 text-stone-500 dark:text-stone-400'
      }`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {syncStatus !== 'offline' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                syncStatus === 'connected' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-sky-500' : 'bg-amber-500'
              }`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              syncStatus === 'connected' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-sky-500' : syncStatus === 'connecting' ? 'bg-amber-500' : 'bg-stone-400'
            }`}></span>
          </span>
          <span>
            {syncStatus === 'connected' && (language === 'en' ? 'Live connection active — Receiving real-time updates' : 'Sambungan langsung aktif — Menerima kemaskini masa nyata')}
            {syncStatus === 'connecting' && (language === 'en' ? 'Connecting to Firestore WebSocket...' : 'Menghubungkan ke WebSocket Firestore...')}
            {syncStatus === 'syncing' && (language === 'en' ? 'Syncing database logs...' : 'Penyelarasan log pangkalan data...')}
            {syncStatus === 'offline' && (language === 'en' ? 'Offline — Reconnecting automatically' : 'Luar talian — Menyambung semula secara automatik')}
          </span>
        </div>
        <span className="uppercase tracking-wider opacity-70 text-[10px]">
          {syncStatus}
        </span>
      </div>
    </header>
  );
}
