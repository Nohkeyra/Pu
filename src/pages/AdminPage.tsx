import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '@/components/AdminPanel';
import AuthModal from '@/components/AuthModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import WawasanLoader from '@/components/WawasanLoader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fingerprint, Lock, Loader2 } from 'lucide-react';
import { triggerNotification, NotificationType } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { useAdminBiometric } from '@/hooks/useAdminBiometric';

export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [authOpen, setAuthOpen] = useState(false);

  const t = useCallback((en: string, bm: string) => (language === 'bm' ? bm : en), [language]);

  const {
    isAuthenticated,
    adminToken,
    user,
    isInitializing,
    hasAdminBiometrics,
    isBiometricLoading,
    error,
    authenticateBiometric,
    logout,
  } = useAdminBiometric({ autoRehydrate: true });

  const handleBiometricUnlock = useCallback(async () => {
    const res = await authenticateBiometric({
      reason: t(
        'Sahkan identiti untuk mengakses panel kawalan admin Restoran Wawasan.',
        'Sahkan identiti untuk mengakses panel kawalan admin Restoran Wawasan.'
      ),
      title: t('Pengesahan Biometrik Admin', 'Pengesahan Biometrik Admin'),
    });

    if (res.success) {
      triggerNotification(NotificationType.Success);
      toast({
        title: t('Admin Access Granted', 'Akses Admin Diberikan'),
        description: t(
          'Successfully verified Admin biometrics!',
          'Berjaya disahkan dengan Biometrik Admin!'
        ),
        variant: 'success',
      });
    }
  }, [authenticateBiometric, t, toast]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <WawasanLoader size={80} />
        <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">
          {t('Verifying Admin Access...', 'Mengesahkan Akses Pentadbir...')}
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !adminToken) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots flex flex-col items-center justify-center relative p-4">
        <Card className="panel-surface p-8 max-w-md w-full text-center space-y-6 z-10 shadow-xl rounded-2xl border border-amber-500/20">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-[var(--color-sunshine-cta)] mx-auto flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-artistic text-deep-forest dark:text-white">
              {t('Admin Access Restricted', 'Akses Pentadbir Terhad')}
            </h2>
            {error ? (
              <p className="text-red-600 dark:text-red-400 font-medium text-sm">{error}</p>
            ) : (
              <p className="text-stone-600 dark:text-stone-300 text-sm">
                {t('You must be logged in as an authorized administrator.', 'Anda perlu log masuk sebagai pentadbir yang diberi kuasa.')}
              </p>
            )}
          </div>
          
          <div className="space-y-3 pt-2">
            {hasAdminBiometrics && !isAuthenticated && (
              <Button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={isBiometricLoading}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-medium flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
              >
                {isBiometricLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 text-amber-300" />
                    <span>{t('Unlock with Biometrics', 'Buka Kunci dengan Biometrik')}</span>
                  </>
                )}
              </Button>
            )}

            {!user ? (
              <Button 
                onClick={() => setAuthOpen(true)} 
                className="w-full bg-[var(--color-sunshine-cta)] text-white hover:opacity-90 font-medium h-11"
              >
                {t('Log In with Password', 'Log Masuk dengan Kata Laluan')}
              </Button>
            ) : (
              <Button onClick={logout} variant="outline" className="w-full h-11">
                {t('Sign Out', 'Log Keluar')}
              </Button>
            )}

            <Button onClick={() => navigate('/login')} variant="ghost" className="w-full text-stone-600 dark:text-stone-400">
              {t('Back to Main Menu', 'Kembali ke Menu Utama')}
            </Button>
          </div>
        </Card>
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => setAuthOpen(false)}
          isAdminAuth={true}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AdminPanel
        adminToken={adminToken}
        onLogout={async () => {
          await logout();
          navigate('/login');
        }}
      />
    </ErrorBoundary>
  );
}
