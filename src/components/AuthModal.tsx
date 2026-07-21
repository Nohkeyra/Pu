import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Building, 
  Briefcase, 
  X, 
  ArrowRight, 
  Loader2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SAVED_COMPANIES } from '@/constants/companies';
import { triggerNotification, NotificationType } from '@/lib/haptics';
import { getAssetUrl } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [to, setTo] = useState(''); // Organization
  const [selectedCompany, setSelectedCompany] = useState('');
  const [attn, setAttn] = useState(''); // Attn

  // Translation helpers - DECLARED EARLY
  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setContact('');
    setTo('');
    setSelectedCompany('');
    setAttn('');
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
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
        await signInWithEmailAndPassword(auth, email, password);

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
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), profileData);

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
      if (authError.code === 'auth/wrong-password' || authError.code === 'auth/user-not-found') {
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
          className="fixed inset-0 bg-[#161618]/80 backdrop-blur-md"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#1C1C1E] border border-[#2E2E32] rounded-3xl shadow-2xl z-10 flex-shrink-0 my-auto overflow-hidden"
        >
          {/* Batik Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none rounded-3xl"
            style={{
              backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Accent Gold Line */}
          <div className="relative h-[3px] bg-gradient-to-r from-[#FF7A1A] via-[#FFA35C] to-[#FF7A1A] z-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#8E8E93] hover:text-[#F4F4F6] hover:bg-[#2E2E32] rounded-lg transition-colors duration-200 z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative p-6 sm:p-8 z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl font-bold text-[#F4F4F6] tracking-wide">
                {mode === 'signin' && t('Sign In', 'Log Masuk')}
                {mode === 'signup' && t('Register Account', 'Daftar Akaun Baru')}
                {mode === 'forgot' && t('Reset Password', 'Set Semula Kata Laluan')}
              </h2>
              <p className="text-xs text-[#8E8E93] mt-1 font-sans">
                {mode === 'signin' && t('Access your saved profile & catering invoice history', 'Akses profil & sejarah invois katering anda')}
                {mode === 'signup' && t('Create a profile for instant billing auto-population', 'Daftar profil untuk automasi maklumat bil tempahan')}
                {mode === 'forgot' && t('Enter your registered email to receive reset instructions', 'Masukkan e-mel anda untuk menerima arahan set semula')}
              </p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4 font-sans text-[#F4F4F6]">
              {/* Registration Fields */}
              {mode === 'signup' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">
                      {t('Full Name *', 'Nama Penuh *')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dato' Ahmad"
                        className="w-full h-11 pl-10 pr-4 bg-[#161618] border border-[#2E2E32] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]/40 focus:border-[#A8E10C]/60 focus:ring-1 focus:ring-[#A8E10C]/40 outline-none transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">
                      {t('Contact Number *', 'No. Telefon *')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                      <input
                        type="tel"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="e.g. +60123456789"
                        className="w-full h-11 pl-10 pr-4 bg-[#161618] border border-[#2E2E32] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]/40 focus:border-[#A8E10C]/60 focus:ring-1 focus:ring-[#A8E10C]/40 outline-none transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">
                      {t('Organization / Company', 'Syarikat / Organisasi')}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93] pointer-events-none" />
                      <select
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
                        className="w-full h-11 pl-10 pr-10 bg-[#161618] border border-[#2E2E32] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]/40 focus:border-[#A8E10C]/60 focus:ring-1 focus:ring-[#A8E10C]/40 outline-none transition-all duration-200 appearance-none"
                      >
                        <option value="" className="text-[#8E8E93] bg-[#161618]">-- {t('Select Company / Organization', 'Pilih Syarikat / Organisasi')} --</option>
                        {SAVED_COMPANIES.map((company, idx) => (
                          <option key={idx} value={company} className="text-[#F4F4F6] bg-[#161618]">
                            {company}
                          </option>
                        ))}
                        <option value="other" className="text-[#FF7A1A] bg-[#161618] font-semibold">{t('Other (Specify)', 'Lain-lain (Nyatakan)')}</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93] pointer-events-none" />
                    </div>
                    {selectedCompany === 'other' && (
                      <div className="relative mt-2">
                        <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                        <input
                          type="text"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          placeholder={t('e.g. PMO Putrajaya', 'cth. PMO Putrajaya')}
                          className="w-full h-11 pl-10 pr-4 bg-[#161618] border border-[#2E2E32] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]/40 focus:border-[#A8E10C]/60 focus:ring-1 focus:ring-[#A8E10C]/40 outline-none transition-all duration-200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">
                      {t('Department / Attention (Attn)', 'Bahagian / Untuk Perhatian')}
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                      <input
                        type="text"
                        value={attn}
                        onChange={(e) => setAttn(e.target.value)}
                        placeholder="e.g. Unit Kewangan"
                        className="w-full h-11 pl-10 pr-4 bg-[#161618] border border-[#2E2E32] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]/40 focus:border-[#A8E10C]/60 focus:ring-1 focus:ring-[#A8E10C]/40 outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Core Email Field */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">
                  {t('Email Address', 'Alamat E-mel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. nama@organisasi.gov.my"
                    className="w-full h-11 pl-10 pr-4 bg-[#161618] border border-[#2E2E32] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]/40 focus:border-[#A8E10C]/60 focus:ring-1 focus:ring-[#A8E10C]/40 outline-none transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Core Password Field (only for signin/signup) */}
              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">
                      {t('Password', 'Kata Laluan')}
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot')}
                        className="text-[10px] text-[#FF7A1A] hover:underline"
                      >
                        {t('Forgot Password?', 'Lupa Kata Laluan?')}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-10 pr-4 bg-[#161618] border border-[#2E2E32] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]/40 focus:border-[#A8E10C]/60 focus:ring-1 focus:ring-[#A8E10C]/40 outline-none transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#FF7A1A] text-[#161618] font-semibold rounded-lg hover:bg-[#FFA35C] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2 text-sm mt-6 shadow-lg shadow-[#FF7A1A]/10 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' && t('Enter Dashboard', 'Masuk ke Papan Pemuka')}
                    {mode === 'signup' && t('Register Profile', 'Daftar Profil')}
                    {mode === 'forgot' && t('Send Reset Instructions', 'Hantar Arahan Set Semula')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Toggle modes */}
              <div className="text-center mt-6 pt-4 border-t border-[#2E2E32] text-xs">
                {mode === 'signin' && (
                  <p className="text-[#8E8E93]">
                    {t("First time booking?", "Pertama kali menempah?")}{' '}
                    <button
                      type="button"
                      onClick={() => handleModeChange('signup')}
                      className="text-[#FF7A1A] font-semibold hover:underline"
                    >
                      {t('Register account', 'Daftar akaun')}
                    </button>
                  </p>
                )}
                {mode === 'signup' && (
                  <p className="text-[#8E8E93]">
                    {t('Already registered?', 'Sudah mendaftar?')}{' '}
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className="text-[#FF7A1A] font-semibold hover:underline"
                    >
                      {t('Sign in here', 'Log masuk di sini')}
                    </button>
                  </p>
                )}
                {mode === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="text-[#FF7A1A] font-semibold hover:underline"
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
