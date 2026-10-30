import { useState, useEffect } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Fingerprint } from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  storeAdminBiometricCredentials,
  storeCustomerBiometricCredentials,
} from '@/services/authService';

interface BiometricEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'admin' | 'customer';
  /** Called after biometrics were really saved (not on cancel or failure). */
  onEnabled?: () => void;
}

/**
 * Standard "turn on fingerprint login" step for people who are already signed in:
 * confirm the account password, then confirm with a fingerprint / face scan, and only then
 * save to the keystore. The password is held in memory for this dialog only.
 */
export function BiometricEnrollDialog({ open, onOpenChange, role, onEnabled }: BiometricEnrollDialogProps) {
  const { language } = useLanguage();
  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setPassword('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  const email = auth.currentUser?.email ?? '';

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !email) {
      setError(t('Please sign in first.', 'Sila log masuk dahulu.'));
      return;
    }
    if (!password) {
      setError(t('Enter your password.', 'Masukkan kata laluan anda.'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password));
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === 'auth/too-many-requests'
          ? t('Too many attempts. Try again later.', 'Terlalu banyak percubaan. Cuba lagi nanti.')
          : t('Incorrect password.', 'Kata laluan tidak betul.')
      );
      setBusy(false);
      return;
    }

    const saved =
      role === 'admin'
        ? await storeAdminBiometricCredentials(email, password)
        : await storeCustomerBiometricCredentials(email, password);

    setBusy(false);
    if (saved) {
      onEnabled?.();
      onOpenChange(false);
    } else {
      setError(
        t(
          'Fingerprint / Face ID was not confirmed, so nothing was saved.',
          'Cap jari / Face ID tidak disahkan, jadi tiada apa disimpan.'
        )
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleConfirm} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t('Enable Fingerprint / Face ID', 'Aktifkan Cap Jari / Face ID')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'Confirm your password once, then scan your fingerprint or face to turn it on.',
                'Sahkan kata laluan anda sekali, kemudian imbas cap jari atau wajah untuk mengaktifkannya.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="biometric-enroll-password">{t('Password', 'Kata Laluan')}</Label>
            <Input
              id="biometric-enroll-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              aria-invalid={Boolean(error)}
              disabled={busy}
            />
            {error && (
              <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t('Cancel', 'Batal')}
            </Button>
            <Button type="submit" isLoading={busy}>
              {t('Continue', 'Teruskan')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default BiometricEnrollDialog;
