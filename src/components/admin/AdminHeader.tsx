import { AlertTriangle, CheckCircle, Loader2, LogOut, Moon, RefreshCw, Sun } from 'lucide-react';
import { TransparentLogo } from '@/components/brand/TransparentLogo';
import { getAssetUrl } from '@/lib/utils';

interface AdminHeaderProps {
  language: 'en' | 'bm';
  theme: string;
  title: string;
  toggleTheme: () => void;
  calendarState: { ok: boolean; error?: string; loading: boolean };
  onToggleLanguage: () => void;
  onRefresh: () => void;
  refreshDisabled: boolean;
  onLogout: () => void | Promise<void>;
  navigate: (path: string) => void;
  t: (key: string) => string;
}

export function AdminHeader({
  language, theme, title, toggleTheme, calendarState, onToggleLanguage, onRefresh, refreshDisabled, onLogout, navigate, t,
}: AdminHeaderProps) {
  const isDark = theme === 'dark';
  const ThemeIcon = isDark ? Sun : Moon;
  const CalendarIcon = calendarState.loading ? Loader2 : calendarState.ok ? CheckCircle : AlertTriangle;
  const calendarLabel = t(calendarState.loading ? 'admin_calendar_checking' :
    calendarState.ok ? 'admin_calendar_synced' : 'admin_calendar_setup');

  return (
    <header className="admin-topbar">
      <span className="admin-breadcrumb">Admin <span aria-hidden="true">/</span> <strong>{title}</strong></span>
      <div className="admin-mobile-brand">
        <TransparentLogo src={getAssetUrl('/assets/brand/wawasan_logo.png')} alt="" className="admin-brand-logo" />
        <span className="font-artistic">Restoran Wawasan</span>
      </div>
      <div className="admin-header-tools">
        <button type="button" className="admin-control admin-calendar-status" onClick={() => navigate('/settings')}
          aria-label={calendarLabel} title={calendarState.error || calendarLabel}>
          <CalendarIcon size={16} aria-hidden="true" />
          <span>{calendarLabel}</span>
        </button>
        <button type="button" className="admin-control" onClick={onRefresh} disabled={refreshDisabled}
          aria-label={t('admin_refresh')} title={t('admin_refresh')}>
          <RefreshCw size={16} aria-hidden="true" />
        </button>
        <button type="button" className="admin-control" onClick={onToggleLanguage}
          aria-label={t('admin_language')} lang={language === 'bm' ? 'en' : 'ms'}>
          {t('admin_language_current')}
        </button>
        <button type="button" className="admin-control" onClick={toggleTheme}
          aria-label={t(isDark ? 'admin_light_theme' : 'admin_dark_theme')}
          title={t(isDark ? 'admin_light_theme' : 'admin_dark_theme')}>
          <ThemeIcon size={16} aria-hidden="true" />
        </button>
        <button type="button" className="admin-control" onClick={onLogout}
          aria-label={t('admin_logout')} title={t('admin_logout')}>
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
