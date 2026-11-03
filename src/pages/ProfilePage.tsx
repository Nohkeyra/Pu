import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import UserProfileDashboard from '@/components/UserProfileDashboard';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User as UserIcon, LogIn, UserPlus, ArrowRight, FileText, MapPin, Check } from 'lucide-react';
import WawasanLoader from '@/components/WawasanLoader';
import { CustomerPageHeader } from '@/components/CustomerPageHeader';
import CustomerPageLayout from '@/components/CustomerPageLayout';
import './customer-calendar-profile.css';
import AuthModal from '@/components/AuthModal';

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
    <CustomerPageLayout className="customer-profile-page relative">
      <CustomerPageHeader
          backDestination={window.history.state?.idx > 0 ? 'history' : 'home'}
        title={t('nav_profile')}
        subtitle={language === 'bm' ? 'Ruang anda bersama Wawasan' : 'Your space with Wawasan'}
        onBack={() => {
          if (window.history.state?.idx > 0) navigate(-1);
          else navigate('/home');
        }}
        actions={[
          ...(!currentUser ? [{ label: language === 'bm' ? 'Log masuk' : 'Sign in', onSelect: () => { setAuthMode('signin'); setAuthModalOpen(true); } }] : []),
          { label: language === 'bm' ? 'Tempahan baharu' : 'New order', onSelect: () => navigate('/order') },
          { label: language === 'bm' ? 'Tetapan' : 'Settings', onSelect: () => navigate('/settings') },
        ]}
      />

      <div className="customer-content customer-profile-content">
        {!currentUser ? (
          <Card className="customer-profile-access">
            <div className="customer-profile-symbol">
              <UserIcon className="w-8 h-8 text-[var(--color-sunshine-cta)]" />
            </div>
            <h2 className="customer-profile-access-title">
              {language === 'bm' ? 'Tempahan anda, lebih teratur.' : 'Your orders, all in one place.'}
            </h2>
            <p className="customer-profile-access-description">
              {language === 'bm'
                ? 'Log masuk untuk melihat tempahan, menyimpan lokasi dan mengurus maklumat anda.'
                : 'Sign in to view orders, save locations and manage your details.'}
            </p>

            <ul className="customer-profile-benefits">
              {[
                { icon: FileText, label: language === 'bm' ? 'Semak status dan sejarah tempahan' : 'Check order status and history' },
                { icon: MapPin, label: language === 'bm' ? 'Simpan lokasi untuk tempahan seterusnya' : 'Save locations for your next order' },
                { icon: UserIcon, label: language === 'bm' ? 'Urus maklumat profil anda' : 'Manage your profile details' },
              ].map(({ icon: Icon, label }) => (
                <li key={label}><Icon aria-hidden="true" /><span>{label}</span><Check className="customer-profile-benefit-check" aria-hidden="true" /></li>
              ))}
            </ul>
            <div className="customer-profile-entry-actions space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthModalOpen(true);
                  }}
                  className="customer-profile-signin w-full min-h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
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
                  className="customer-profile-register w-full min-h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
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
                      ? 'Tempah sebagai tetamu'
                      : 'Order as a guest'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--color-sunshine-cta)] shrink-0 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="customer-profile-member">
            <div className="relative">
              <UserProfileDashboard
                isOpen={true}
                isEmbedded={true}
                onClose={() => navigate('/home')}
                onReorder={(data) => navigate('/order', { state: { reorderData: data } })}
              />
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </CustomerPageLayout>
  );
}
