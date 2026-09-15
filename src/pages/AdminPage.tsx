import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import AdminPanel from '@/components/AdminPanel';
import AuthModal from '@/components/AuthModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getApiUrl } from '@/lib/api';
import WawasanLoader from '@/components/WawasanLoader';
import { Button } from '@/components/ui/button';
import { 
  saveAdminToken, 
  clearAdminSession, 
  getAdminBiometricCredentials, 
  checkBiometricAvailability, 
  ADMIN_BIOMETRIC_PREF_KEY 
} from '@/services/authService';
import { getSecureItem } from '@/lib/preferences';
import { Fingerprint, Lock, Loader2 } from 'lucide-react';
import { triggerNotification, NotificationType } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState('');
  const [hasAdminBiometrics, setHasAdminBiometrics] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const hasAutoPromptedRef = useRef(false);

  const t = useCallback((en: string, bm: string) => (language === 'bm' ? bm : en), [language]);

  const handleBiometricUnlock = useCallback(async () => {
    try {
      setIsBiometricLoading(true);
      setError('');
      const creds = await getAdminBiometricCredentials();
      if (creds && creds.username && creds.password) {
        await signInWithEmailAndPassword(auth, creds.username, creds.password);
        triggerNotification(NotificationType.Success);
        toast({
          title: t('Admin Access Granted', 'Akses Admin Diberikan'),
          description: t('Successfully verified Admin biometrics!', 'Berjaya disahkan dengan Biometrik Admin!'),
          variant: 'success'
        });
      } else {
        setIsBiometricLoading(false);
      }
    } catch (err: any) {
      console.warn('Admin biometric unlock failed:', err);
      setIsBiometricLoading(false);
      const errMsg = err?.message || '';
      if (!errMsg.toLowerCase().includes('cancel') && !errMsg.toLowerCase().includes('user cancel')) {
        setError(t('Biometric verification failed. Please log in with password.', 'Pengesahan biometrik gagal. Sila log masuk dengan kata laluan.'));
      }
    }
  }, [t, toast]);

  useEffect(() => {
    async function checkAdminBiometrics() {
      try {
        const avail = await checkBiometricAvailability();
        const enabled = await getSecureItem(ADMIN_BIOMETRIC_PREF_KEY);
        if (avail.isAvailable && enabled === 'true') {
          setHasAdminBiometrics(true);
        }
      } catch (e) {
        console.warn('Error checking admin biometrics:', e);
      }
    }
    checkAdminBiometrics();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken(true);
          
          // Verify with server to ensure it has admin claim
          const res = await fetch(getApiUrl('/api/admin/verify'), {
            headers: { Authorization: `Bearer ${idToken}` }
          });
          
          if (res.ok) {
            await saveAdminToken(idToken);
            setToken(idToken);
            setError('');
          } else {
            setToken('');
            await clearAdminSession();
            setError(t('You do not have administrative privileges. Only authorized users may access this panel.', 'Anda tidak mempunyai kebenaran pentadbir. Hanya pengguna yang diberi kuasa boleh mengakses panel ini.'));
          }
        } catch {
          setToken('');
          setError(t('Failed to verify admin status.', 'Gagal mengesahkan status pentadbir.'));
        }
      } else {
        setToken('');
        await clearAdminSession();
      }
      setIsInitializing(false);
      setIsBiometricLoading(false);
    });

    return () => unsubscribe();
  }, [t]);

  // Auto-prompt admin biometrics on initial load if stored and not logged in
  useEffect(() => {
    if (!isInitializing && !user && hasAdminBiometrics && !hasAutoPromptedRef.current) {
      hasAutoPromptedRef.current = true;
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isInitializing, user, hasAdminBiometrics, handleBiometricUnlock]);

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

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots flex flex-col items-center justify-center relative p-4">
        <div className="panel-surface p-8 max-w-md w-full text-center space-y-6 z-10 shadow-xl rounded-2xl border border-amber-500/20">
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
            {hasAdminBiometrics && !user && (
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
              <Button onClick={() => signOut(auth)} variant="outline" className="w-full h-11">
                {t('Sign Out', 'Log Keluar')}
              </Button>
            )}

            <Button onClick={() => navigate('/login')} variant="ghost" className="w-full text-stone-600 dark:text-stone-400">
              {t('Back to Main Menu', 'Kembali ke Menu Utama')}
            </Button>
          </div>
        </div>
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
        adminToken={token}
        onLogout={async () => {
          await clearAdminSession();
          await signOut(auth);
          navigate('/login');
        }}
      />
    </ErrorBoundary>
  );
}
