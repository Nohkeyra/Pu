import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Building, 
  Briefcase,
  X, 
  ArrowRight, 
  ChevronDown,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SAVED_COMPANIES } from '@/constants/companies';
import { triggerNotification, NotificationType } from '@/lib/haptics';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { useOverlayAccessibility } from '@/hooks/useOverlayAccessibility';
import { useAdminBiometric } from '@/hooks/useAdminBiometric';
import { 
  checkBiometricAvailability, 
  storeCustomerBiometricCredentials,
  authenticateCustomerWithBiometrics,
  deleteCustomerBiometricCredentials,
  isAdminBiometricsEnabledOnDevice,
  isCustomerBiometricsEnabledOnDevice,
  isStaleCredentialError,
} from '@/services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot';
  isAdminAuth?: boolean;
  /**
   * Show the fingerprint / Face ID prompt automatically when the sign-in form
   * opens and biometrics are enabled for this role (default true). The admin
   * gate passes false because it has already prompted before opening this form.
   */
  autoPromptBiometric?: boolean;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin', isAdminAuth = false, autoPromptBiometric = true }: AuthModalProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useOverlayAccessibility({ isOpen, onClose, containerRef: modalRef });

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [to, setTo] = useState(''); // Organization
  const [selectedCompany, setSelectedCompany] = useState('');
  const [attn, setAttn] = useState(''); // Attn
  const [department, setDepartment] = useState(''); // Corporate Billing Details (Division / Department)
  const [initials, setInitials] = useState(''); // Initial Identifier

  // Biometric States
  const [rememberBiometrics, setRememberBiometrics] = useState(false);
  const [isBiometricHardwareAvailable, setIsBiometricHardwareAvailable] = useState(false);
  const [hasStoredBiometrics, setHasStoredBiometrics] = useState(false);

  // Translation helpers - DECLARED EARLY
  const t = useCallback((en: string, bm: string) => (language === 'bm' ? bm : en), [language]);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setName('');
    setContact('');
    setTo('');
    setSelectedCompany('');
    setAttn('');
    setDepartment('');
    setInitials('');
    setRememberBiometrics(false);
  }, []);

  const { authenticateBiometric, loginWithPassword: loginAdminWithPassword } = useAdminBiometric({ autoRehydrate: false });

  const biometricBusyRef = useRef(false);
  const autoPromptedRef = useRef(false);

  // Hardware + per-role enrolment. Admin form only ever looks at admin biometrics,
  // member form only at member biometrics: no cross-role prompts.
  const refreshBiometricState = useCallback(async (): Promise<boolean> => {
    try {
      const avail = await checkBiometricAvailability();
      setIsBiometricHardwareAvailable(avail.isAvailable);
      const enabled =
        avail.isAvailable &&
        (isAdminAuth ? await isAdminBiometricsEnabledOnDevice() : await isCustomerBiometricsEnabledOnDevice());
      setHasStoredBiometrics(enabled);
      return enabled;
    } catch (err) {
      console.warn('Failed to initialize biometrics:', err);
      setHasStoredBiometrics(false);
      return false;
    }
  }, [isAdminAuth]);

  const handleBiometricLogin = useCallback(async () => {
    if (biometricBusyRef.current) return;
    biometricBusyRef.current = true;
    setIsLoading(true);

    const finishSignedIn = (description: string) => {
      triggerNotification(NotificationType.Success);
      toast({ title: t('Success', 'Berjaya'), description, variant: 'success' });
      resetForm();
      onSuccess?.();
      onClose();
    };

    try {
      if (isAdminAuth) {
        const res = await authenticateBiometric({
          reason: 'Sahkan identiti untuk mengakses panel kawalan admin Restoran Wawasan.',
          title: 'Pengesahan Biometrik Admin',
        });
        if (res.success) {
          finishSignedIn(t('Successfully verified Admin biometrics!', 'Berjaya disahkan dengan Biometrik Admin!'));
          return;
        }
        if (res.cancelled) return; // user chose the password form instead
        await refreshBiometricState(); // stale credentials may have been removed
        toast({
          title: t('Biometric Failed', 'Biometrik Gagal'),
          description: res.error || t('Biometric verification failed.', 'Pengesahan biometrik gagal.'),
          variant: 'error'
        });
        return;
      }

      const res = await authenticateCustomerWithBiometrics({
        reason: 'Sahkan identiti untuk log masuk ke akaun Restoran Wawasan.',
        title: 'Pengesahan Biometrik Pelanggan',
      });

      if (res.success && res.creds) {
        try {
          await signInWithEmailAndPassword(auth, res.creds.email, res.creds.password);
        } catch (signErr) {
          if (isStaleCredentialError(signErr)) {
            // Password was changed elsewhere: the saved secret is dead, remove it and ask for the password.
            await deleteCustomerBiometricCredentials();
            setHasStoredBiometrics(false);
            toast({
              title: t('Sign in again', 'Sila Log Masuk Semula'),
              description: t(
                'Your password changed. Sign in with your password, then re-enable biometrics.',
                'Kata laluan anda telah berubah. Log masuk dengan kata laluan, kemudian aktifkan semula biometrik.'
              ),
              variant: 'warning'
            });
            return;
          }
          throw signErr;
        }
        finishSignedIn(t('Successfully logged in with Biometrics!', 'Berjaya log masuk dengan Biometrik!'));
        return;
      }

      if (res.cancelled) return;
      await refreshBiometricState();
      toast({
        title: t('Biometric Failed', 'Biometrik Gagal'),
        description: res.lockedOut
          ? t('Biometrics are temporarily locked. Please use your password.', 'Biometrik dikunci sementara. Sila guna kata laluan.')
          : t('Verification failed. You can sign in with your password.', 'Pengesahan gagal. Anda boleh log masuk dengan kata laluan.'),
        variant: 'error'
      });
    } catch (err) {
      console.warn('Biometric login failed:', err);
      toast({
        title: t('Biometric Failed', 'Biometrik Gagal'),
        description: t('An unexpected error occurred during biometric verification.', 'Ralat tidak dijangka berlaku semasa pengesahan biometrik.'),
        variant: 'error'
      });
    } finally {
      biometricBusyRef.current = false;
      setIsLoading(false);
    }
  }, [t, toast, onSuccess, onClose, resetForm, isAdminAuth, authenticateBiometric, refreshBiometricState]);

  // Always call the latest handler from timers without re-arming them.
  const handleBiometricLoginRef = useRef(handleBiometricLogin);
  useEffect(() => {
    handleBiometricLoginRef.current = handleBiometricLogin;
  }, [handleBiometricLogin]);

  useEffect(() => {
    if (isOpen) {
      void refreshBiometricState();
    } else {
      autoPromptedRef.current = false;
    }
  }, [isOpen, refreshBiometricState]);

  // Standard biometric flow: opening the sign-in form with biometrics enabled shows the
  // system prompt once. Cancelling leaves the password form (and a retry button) in place.
  useEffect(() => {
    if (!isOpen || !autoPromptBiometric || mode !== 'signin' || !hasStoredBiometrics) return;
    const timer = window.setTimeout(() => {
      if (autoPromptedRef.current || document.visibilityState !== 'visible') return;
      autoPromptedRef.current = true;
      void handleBiometricLoginRef.current();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [isOpen, autoPromptBiometric, mode, hasStoredBiometrics]);

  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
  };

  // Phone number masking helper: 012-345 6789
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    let formatted = numbers;
    if (numbers.length > 3) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }
    if (numbers.length > 6) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
    }
    return formatted.slice(0, 12);
  };

  const notifyBiometricNotEnabled = () => {
    toast({
      title: t('Biometrics not enabled', 'Biometrik Tidak Diaktifkan'),
      description: t(
        'Fingerprint / Face ID was not confirmed. You can enable it later in Settings.',
        'Cap jari / Face ID tidak disahkan. Anda boleh aktifkannya kemudian dalam Tetapan.'
      ),
      variant: 'info'
    });
  };

  // Opt-in enrolment after a successful password login. Never blocks or fails the login itself.
  const enrolCustomerBiometrics = async (emailValue: string, passwordValue: string) => {
    const enrolled = await storeCustomerBiometricCredentials(emailValue, passwordValue);
    await refreshBiometricState();
    if (enrolled) {
      toast({
        title: t('Biometrics Enabled', 'Biometrik Diaktifkan'),
        description: t('Next time, sign in with your fingerprint / Face ID.', 'Lain kali, log masuk dengan cap jari / Face ID.'),
        variant: 'success'
      });
    } else {
      notifyBiometricNotEnabled();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      triggerNotification(NotificationType.Warning);
      toast({
        title: t('Email Required', 'E-mel Diperlukan'),
        description: t('Please enter your email address.', 'Sila masukkan alamat e-mel anda.'),
        variant: 'warning'
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        if (!password) throw new Error(t('Password is required', 'Kata laluan diperlukan'));

        if (isAdminAuth) {
          const wantsEnrolment = rememberBiometrics && isBiometricHardwareAvailable && !hasStoredBiometrics;
          const res = await loginAdminWithPassword(email, password, wantsEnrolment);
          if (!res.success) {
            throw new Error(res.error || t('Invalid email or password.', 'E-mel atau kata laluan tidak sah.'));
          }
          if (wantsEnrolment) {
            await refreshBiometricState();
            if (res.biometricEnrolled === false) notifyBiometricNotEnabled();
          }
        } else {
          await signInWithEmailAndPassword(auth, email, password);

          if (rememberBiometrics && isBiometricHardwareAvailable && !hasStoredBiometrics) {
            await enrolCustomerBiometrics(email, password);
          }
        }

        triggerNotification(NotificationType.Success);
        toast({
          title: t('Success', 'Berjaya'),
          description: t('Successfully signed in.', 'Berjaya log masuk.'),
          variant: 'success'
        });

        resetForm();
        onSuccess?.();
        onClose();
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          throw new Error(t('Password must be at least 6 characters.', 'Kata laluan mestilah sekurang-kurangnya 6 aksara.'));
        }
        if (!name) throw new Error(t('Name is required.', 'Nama diperlukan.'));
        if (!contact) throw new Error(t('Contact number is required.', 'Nombor telefon diperlukan.'));

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save User Profile Metadata to Firestore under /users/{uid}
        const profileData = {
          uid: user.uid,
          name,
          email,
          contact,
          to,
          attn,
          department,
          division: department,
          initials,
          initialIdentifier: initials,
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), profileData);

        if (rememberBiometrics && isBiometricHardwareAvailable) {
          await enrolCustomerBiometrics(email, password);
        }

        triggerNotification(NotificationType.Success);
        toast({
          title: t('Account Created', 'Akaun Dicipta'),
          description: t('Profile saved successfully.', 'Profil berjaya disimpan.'),
          variant: 'success'
        });
        resetForm();
        onSuccess?.();
        onClose();
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        triggerNotification(NotificationType.Success);
        toast({
          title: t('Email Sent', 'E-mel Dihantar'),
          description: t('Password reset instructions have been sent to your email.', 'Arahan set semula kata laluan telah dihantar ke e-mel anda.'),
          variant: 'success'
        });
        setMode('signin');
      }
    } catch (err) {
      console.error('Authentication Error:', err);
      const authError = err as { code?: string; message?: string };
      let errMsg = authError.message || '';
      if (isStaleCredentialError(err) && authError.code !== 'auth/user-disabled') {
        errMsg = t('Invalid email or password.', 'E-mel atau kata laluan tidak sah.');
      } else if (authError.code === 'auth/email-already-in-use') {
        errMsg = t('Email already in use.', 'E-mel ini sudah digunakan.');
      } else if (authError.code === 'auth/invalid-email') {
        errMsg = t('Invalid email format.', 'Format e-mel tidak sah.');
      } else if (authError.code === 'auth/weak-password') {
        errMsg = t('Weak password. Minimum 6 characters.', 'Kata laluan lemah. Sekurang-kurangnya 6 aksara.');
      }
      triggerNotification(NotificationType.Error);
      toast({
        title: t('Authentication Failed', 'Ralat Autentikasi'),
        description: errMsg,
        variant: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto scrollbar-hide">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Panel */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'signin' ? t('Sign In', 'Log Masuk') : mode === 'signup' ? t('Register Account', 'Daftar Akaun Baru') : t('Reset Password', 'Set Semula Kata Laluan')}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl z-10 flex-shrink-0 my-auto overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Batik Pattern Overlay */}
          <Batik3DMotion
            mode="background"
            opacity={0.09}
            mixBlendMode="overlay"
            className="rounded-2xl"
            maxRotation={10}
          />

          {/* Accent Gold Line */}
          <div className="relative h-[3px] bg-gradient-to-r from-sunshine-cta via-honey to-sunshine-cta z-10 shrink-0" />

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('Close dialog', 'Tutup tetingkap')}
            className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="relative p-6 sm:p-8 z-10 overflow-y-auto flex-1">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">
                {mode === 'signin' && t('Sign In', 'Log Masuk')}
                {mode === 'signup' && t('Register Account', 'Daftar Akaun Baru')}
                {mode === 'forgot' && t('Reset Password', 'Set Semula Kata Laluan')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 font-sans">
                {mode === 'signin' && t('Access your saved profile & catering invoice history', 'Akses profil & sejarah invois katering anda')}
                {mode === 'signup' && t('Create a profile for instant billing auto-population', 'Daftar profil untuk automasi maklumat bil tempahan')}
                {mode === 'forgot' && t('Enter your registered email to receive reset instructions', 'Masukkan e-mel anda untuk menerima arahan set semula')}
              </p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4 font-sans text-foreground">
              {/* Registration Fields */}
              {mode === 'signup' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="signup-name" className="microcopy-12-upper uppercase tracking-wider font-bold text-muted-foreground">
                      {t('Full Name *', 'Nama Penuh *')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="signup-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dato' Ahmad"
                        autoComplete="name"
                        className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="signup-contact" className="microcopy-12-upper uppercase tracking-wider font-bold text-muted-foreground">
                      {t('Contact Number *', 'No. Telefon *')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="signup-contact"
                        type="tel"
                        value={contact}
                        onChange={(e) => setContact(formatPhoneNumber(e.target.value))}
                        placeholder="e.g. 012-345 6789"
                        autoComplete="tel"
                        className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="signup-company" className="microcopy-12-upper uppercase tracking-wider font-bold text-muted-foreground">
                      {t('Organization / Company', 'Syarikat / Organisasi')}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select
                        id="signup-company"
                        value={selectedCompany}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCompany(val);
                          if (val === 'other') {
                            setTo('');
                          } else {
                            setTo(val);
                          }
                        }}
                        autoComplete="organization"
                        className="w-full h-11 pl-10 pr-10 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200 appearance-none"
                      >
                        <option value="" className="text-muted-foreground bg-background">-- {t('Select Company / Organization', 'Pilih Syarikat / Organisasi')} --</option>
                        {SAVED_COMPANIES.map((company, idx) => (
                          <option key={idx} value={company} className="text-foreground bg-background">
                            {company}
                          </option>
                        ))}
                        <option value="other" className="text-sunshine-cta bg-background font-semibold">{t('Other (Specify)', 'Lain-lain (Nyatakan)')}</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {selectedCompany === 'other' && (
                      <div className="relative mt-2">
                        <label htmlFor="signup-custom-company" className="sr-only">
                          {t('Other Company Name', 'Nama Syarikat Lain')}
                        </label>
                        <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          id="signup-custom-company"
                          aria-label={t('Other Company Name', 'Nama Syarikat Lain')}
                          type="text"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          placeholder={t('e.g. PMO Putrajaya', 'cth. PMO Putrajaya')}
                          className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="signup-department" className="microcopy-12-upper uppercase tracking-wider font-bold text-muted-foreground">
                        {t('Division / Department', 'Bahagian / Jabatan')}
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          id="signup-department"
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="cth: Bahagian Kewangan"
                          className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="signup-attn" className="microcopy-12-upper uppercase tracking-wider font-bold text-muted-foreground">
                      {t('Attn / U.P', 'Attn / U.P')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="signup-attn"
                        type="text"
                        value={attn}
                        onChange={(e) => setAttn(e.target.value)}
                        placeholder="cth: Encik Ahmad / Puan Siti"
                        className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Core Email Field */}
              <div className="space-y-1">
                <label htmlFor="auth-email" className="microcopy-12-upper uppercase tracking-wider font-bold text-muted-foreground">
                  {t('Email Address', 'Alamat E-mel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. nama@organisasi.gov.my"
                    autoComplete="email"
                    className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Core Password Field (only for signin/signup) */}
              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="auth-password" className="microcopy-12-upper uppercase tracking-wider font-bold text-muted-foreground">
                      {t('Password', 'Kata Laluan')}
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot')}
                        className="microcopy-12-upper text-sunshine-cta hover:underline"
                      >
                        {t('Forgot Password?', 'Lupa Kata Laluan?')}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-kiwi/60 focus:ring-1 focus:ring-kiwi/40 outline-none transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Remember Me with Biometrics Checkbox */}
                  {isBiometricHardwareAvailable && !hasStoredBiometrics && (
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <input
                        id="remember-biometrics"
                        type="checkbox"
                        checked={rememberBiometrics}
                        onChange={(e) => setRememberBiometrics(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 dark:border-white/10 text-primary focus:ring-primary/40 focus:ring-1 cursor-pointer"
                      />
                      <label htmlFor="remember-biometrics" className="text-xs font-semibold text-stone-600 dark:text-stone-400 cursor-pointer flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)] animate-pulse shrink-0" />
                        <span>{t('Use Fingerprint / Face ID next time', 'Guna Cap Jari / Face ID lain kali')}</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-6 font-semibold"
              >
                {mode === 'signin' && t('Enter Dashboard', 'Masuk ke Papan Pemuka')}
                {mode === 'signup' && t('Register Profile', 'Daftar Profil')}
                {mode === 'forgot' && t('Send Reset Instructions', 'Hantar Arahan Set Semula')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              {/* Quick Biometric Access Button */}
              {mode === 'signin' && hasStoredBiometrics && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleBiometricLogin}
                  disabled={isLoading}
                  className="w-full mt-3 font-semibold flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-5 h-5 text-[var(--color-sunshine-cta)] shrink-0" />
                  <span>
                    {isAdminAuth
                      ? t('Unlock Admin with Fingerprint / Face ID', 'Buka Kunci Admin dengan Cap Jari / Wajah')
                      : t('Sign In with Fingerprint / Face ID', 'Log Masuk dengan Cap Jari / Wajah')}
                  </span>
                </Button>
              )}

              {/* Toggle modes */}
              <div className="text-center mt-6 pt-4 border-t border-border text-xs">
                {mode === 'signin' && (
                  <p className="text-muted-foreground">
                    {t("First time booking?", "Pertama kali menempah?")}{' '}
                    <button
                      type="button"
                      onClick={() => handleModeChange('signup')}
                      className="text-sunshine-cta font-semibold hover:underline"
                    >
                      {t('Register account', 'Daftar akaun')}
                    </button>
                  </p>
                )}
                {mode === 'signup' && (
                  <p className="text-muted-foreground">
                    {t('Already registered?', 'Sudah mendaftar?')}{' '}
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className="text-sunshine-cta font-semibold hover:underline"
                    >
                      {t('Sign in here', 'Log masuk di sini')}
                    </button>
                  </p>
                )}
                {mode === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="text-sunshine-cta font-semibold hover:underline"
                  >
                    {t('Back to sign in', 'Kembali ke log masuk')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
