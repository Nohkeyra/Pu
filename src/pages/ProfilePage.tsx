import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import UserProfileDashboard from '@/components/UserProfileDashboard';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User as UserIcon, Shield, ExternalLink } from 'lucide-react';
import { getAssetUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { TransparentLogo } from '@/components/TransparentLogo';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 dark:bg-background/90 backdrop-blur-xl border-b border-border shadow-sm pt-[var(--sat)]">
        <div className="flex items-center justify-between px-6 h-[76px]">
          <div onClick={() => navigate('/home')} className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 flex items-center justify-center">
              <TransparentLogo
                src={getAssetUrl("/assets/wawasan_logo.svg")}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-display font-semibold text-xl text-deep-forest dark:text-white tracking-tight">
                {t('nav_profile')}
              </span>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>
        </div>
      </header>

      <main className="pt-[calc(76px+var(--sat)+2rem)] px-4 max-w-4xl mx-auto space-y-6">
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
                <p className="text-xs text-stone dark:text-stone/70">
                  {language === 'bm' ? 'Anda dilog masuk sebagai Admin Wawasan Pak Usop.' : 'You are currently logged in as Wawasan Pak Usop Admin.'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/admin')}
              className="bg-sunshine hover:bg-crisp-carrot text-white font-bold rounded-2xl px-5 py-2.5 flex items-center gap-2 text-xs flex-shrink-0"
            >
              <span>{language === 'bm' ? 'Buka Panel Admin' : 'Open Admin Panel'}</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}

        {!currentUser ? (
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-sunshine/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon className="w-8 h-8 text-sunshine" />
            </div>
            <h2 className="text-2xl font-display font-bold text-deep-forest dark:text-white mb-4">
              Access Your Bookings
            </h2>
            <p className="text-stone dark:text-stone/70 mb-8">
              Please sign in to view your order history and manage your professional catering documentation.
            </p>
            <Button onClick={() => navigate('/order')} className="bg-sunshine hover:bg-crisp-carrot px-8 py-6 rounded-2xl text-lg font-bold">
              Go to Order Page
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-display font-bold text-deep-forest dark:text-white mb-1">Your Dashboard</h1>
              <p className="text-stone font-medium text-sm">Manage your profile and track your catering requests.</p>
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
    </div>
  );
}
