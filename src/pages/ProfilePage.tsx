import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import UserProfileDashboard from '@/components/UserProfileDashboard';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User as UserIcon, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import WawasanLoader from '@/components/WawasanLoader';
import AuthModal from '@/components/AuthModal';
import PageShell from '@/components/PageShell';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => !auth.currentUser && !sessionStorage.getItem('wawasan_session_started'));
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      const isAdmin = user?.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null;
      if (isAdmin) {
        navigate('/admin', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-3">
        <WawasanLoader size={80} />
        <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">Memuatkan...</p>
      </div>
    );
  }

  return (
    <PageShell
      title={t('nav_profile') || 'Profil'}
      subtitle={language === 'bm' ? 'Papan Pemuka Pelanggan' : 'Customer Profile'}
      backHref="/home"
    >
      <div className="max-w-4xl mx-auto space-y-6 w-full py-4 pb-20">
        {!currentUser ? (
          <Card className="bg-white dark:bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto">
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
                  className="btn-cta w-full py-4 min-h-[52px] rounded-2xl text-base font-bold flex items-center justify-center gap-2 shadow-md"
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
                <Button
                  variant="ghost"
                  onClick={() => navigate('/order')}
                  className="w-full py-3 px-2 min-h-[44px] text-xs font-semibold text-stone hover:text-deep-forest dark:hover:text-white flex items-center justify-center gap-2 transition-colors group text-center leading-relaxed whitespace-normal h-auto"
                >
                  <span>
                    {language === 'bm'
                      ? 'Atau teruskan ke Borang Pesanan sebagai tetamu'
                      : 'Or proceed directly to Order Form as a guest'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--color-sunshine-cta)] shrink-0 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-display font-bold text-deep-forest dark:text-white mb-1">
                {language === 'bm' ? 'Papan Pemuka Anda' : 'Your Dashboard'}
              </h1>
              <p className="text-stone dark:text-stone/75 microcopy-14 font-medium">
                {language === 'bm' 
                  ? 'Urus profil anda dan jejak permintaan katering anda.' 
                  : 'Manage your profile and track your catering requests.'}
              </p>
            </div>

            <Card className="relative bg-white dark:bg-card rounded-3xl overflow-hidden border border-border shadow-lg p-0">
              <UserProfileDashboard
                isOpen={true}
                isEmbedded={true}
                onClose={() => navigate('/home')}
                onReorder={(data) => navigate('/order', { state: { reorderData: data } })}
              />
            </Card>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </PageShell>
  );
}
