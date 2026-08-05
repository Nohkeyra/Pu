import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import UserProfileDashboard from '@/components/UserProfileDashboard';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User as UserIcon, Shield, ExternalLink, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { getAssetUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { TransparentLogo } from '@/components/TransparentLogo';
import AuthModal from '@/components/AuthModal';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-4 pt-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.uid === 'admin';

  return (
    <div className="min-h-screen bg-cream dark:bg-background pb-[calc(100px+env(safe-area-inset-bottom,16px))]">
      {/*
        P0 — standardised dark-mode text colour override so header
        label stays legible in both modes.  Page Shell-like surface
        (.glass-header) is reused so behaviour matches other pages.
      */}
      <header className="glass-header fixed top-0 left-0 right-0 z-50 pt-[var(--sat)]">
        <div className="flex items-center justify-between px-4 sm:px-6 min-h-[60px] sm:min-h-[64px]">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="touch-target-row flex items-center gap-3 text-left"
            aria-label="Go to home"
          >
            <div className="h-10 w-10 flex items-center justify-center">
              {/*
                Brand asset path preserved verbatim — visual logo /
                Malaysian heritage graphic must remain 100% intact.
              */}
              <TransparentLogo
                src={getAssetUrl('/assets/wawasan_logo.svg')}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-display font-semibold text-xl page-header-text tracking-tight">
                {t('nav_profile')}
              </span>
            </div>
          </button>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="touch-target-row rounded-full min-h-[44px] text-stone hover:text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>
        </div>
      </header>

      <main className="page-shell__main pt-[calc(76px+var(--sat)+2rem)] max-w-4xl mx-auto space-y-6">
        {isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-deep-forest dark:text-white">
                  {language === 'bm' ? 'Akaun Pentadbir Sesi Aktif' : 'Active System Administrator Account'}
                </p>
                <p className="microcopy-14 text-stone dark:text-stone/75">
                  {language === 'bm' ? 'Anda dilog masuk sebagai Admin Wawasan Pak Usop.' : 'You are currently logged in as Wawasan Pak Usop.'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/admin')}
              className="btn-cta rounded-2xl px-5 py-2.5 min-h-[44px] flex items-center gap-2 text-xs font-bold"
            >
              <span>{language === 'bm' ? 'Buka Panel Admin' : 'Open Admin Panel'}</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}

        {!currentUser ? (
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto">
            <div className="w-16 h-16 bg-[var(--color-sunshine-cta)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon className="w-8 h-8 text-[var(--color-sunshine-cta)]" />
            </div>
            <h2 className="text-2xl font-display font-bold text-deep-forest dark:text-white mb-2">
              {language === 'bm' ? 'Akses Tempahan Anda' : 'Access Your Bookings'}
            </h2>
            <p className="text-stone dark:text-stone/75 microcopy-14 mb-8 max-w-md mx-auto">
              {language === 'bm'
                ? 'Sila log masuk atau daftar akaun untuk melihat sejarah pesanan dan menguruskan dokumen katering rasmi anda.'
                : 'Please sign in or register to view your order history and manage your professional catering documentation.'}
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthModalOpen(true);
                  }}
                  className="btn-cta w-full py-4 min-h-[52px] rounded-2xl text-base font-bold flex items-center justify-center gap-2 shadow-sunshine-glow"
                >
                  <LogIn className="w-5 h-5" />
                  <span>{language === 'bm' ? 'Log Masuk' : 'Sign In'}</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="w-full py-4 min-h-[52px] rounded-2xl text-base font-bold border-stone/20 hover:border-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/10 flex items-center justify-center gap-2 text-deep-forest dark:text-white"
                >
                  <UserPlus className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
                  <span>{language === 'bm' ? 'Daftar Akaun' : 'Sign Up'}</span>
                </Button>
              </div>

              <div className="pt-2 border-t border-stone/10">
                <button
                  type="button"
                  onClick={() => navigate('/order')}
                  className="w-full py-3 px-2 min-h-[44px] text-xs font-semibold text-stone hover:text-deep-forest dark:hover:text-white flex items-center justify-center gap-2 transition-colors group text-center leading-relaxed"
                >
                  <span>
                    {language === 'bm'
                      ? 'Atau teruskan ke Borang Pesanan tanpa kisah tentang tempahan terkini anda'
                      : 'Or proceed directly to Order Form without even caring about what you have ordered recently'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--color-sunshine-cta)] shrink-0 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-display font-bold text-deep-forest dark:text-white mb-1">Your Dashboard</h1>
              <p className="text-stone dark:text-stone/75 microcopy-14 font-medium">Manage your profile and track your catering requests.</p>
            </div>

            <div className="relative bg-white dark:bg-card rounded-3xl overflow-hidden border border-border shadow-lg">
              <UserProfileDashboard
                isOpen={true}
                isEmbedded={true}
                onClose={() => navigate('/home')}
                onReorder={(data) => navigate('/order', { state: { reorderData: data } })}
              />
            </div>
          </div>
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
