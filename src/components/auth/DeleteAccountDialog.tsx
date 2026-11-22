import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, WifiOff } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
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
import { RESTORAN_CONTACT } from '@/constants/contact';
import { triggerMediumImpact } from '@/lib/haptics';
import {
  AccountDeletionError,
  deleteCustomerAccountAndData,
  resolveReauthStrategy,
} from '@/services/accountDeletionService';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  providerIds?: string[];
  isAdminSession: boolean;
  onCleanupLocalCache?: () => Promise<void>;
  onDeleted?: () => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  userEmail,
  providerIds,
  isAdminSession,
  onCleanupLocalCache,
  onDeleted,
}: DeleteAccountDialogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  const strategy = resolveReauthStrategy(providerIds);
  const requiresPassword = strategy.kind === 'password';
  const usesGoogle = strategy.kind === 'google';
  const usesFederated = strategy.kind === 'federated';
  const isSupportedProvider = strategy.kind !== 'unsupported';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (open) {
      setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    } else {
      setPassword('');
      setError('');
      setBusy(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [open]);

  const mapErrorToMessage = (err: unknown): string => {
    if (err instanceof AccountDeletionError) {
      switch (err.code) {
        case 'PASSWORD_REQUIRED':
          return t('Please enter your password to confirm.', 'Sila masukkan kata laluan untuk pengesahan.');
        case 'INVALID_PASSWORD':
          return t('Incorrect password. Please try again.', 'Kata laluan tidak betul. Sila cuba lagi.');
        case 'TOO_MANY_REQUESTS':
          return t('Too many attempts. Please wait a moment and try again.', 'Terlalu banyak percubaan. Sila tunggu sebentar dan cuba lagi.');
        case 'NETWORK_ERROR':
          return t('Internet connection is required. Please reconnect and try again.', 'Sambungan internet diperlukan. Sila sambung semula dan cuba lagi.');
        case 'ADMIN_ACCOUNT_PROTECTED':
          return t('Administrator accounts cannot be deleted here.', 'Akaun pentadbir tidak boleh dipadam di sini.');
        case 'ACCOUNT_NOT_SIGNED_IN':
          return t('Your session has ended. Please sign in again.', 'Sesi anda telah tamat. Sila log masuk semula.');
        case 'MISSING_EMAIL':
          return t(
            `This account has no email attached. Please contact ${RESTORAN_CONTACT.email} for assistance.`,
            `Akaun ini tiada alamat emel berdaftar. Sila hubungi ${RESTORAN_CONTACT.email} untuk bantuan.`
          );
        case 'REAUTH_CANCELLED':
          return t('Verification was cancelled before deleting your account.', 'Pengesahan identiti dibatalkan sebelum akaun dipadam.');
        case 'REAUTH_MISMATCH':
          return t('Please sign in with the same account to confirm deletion.', 'Sila sahkan menggunakan akaun yang sama untuk memadam akaun ini.');
        case 'UNSUPPORTED_AUTH_PROVIDER':
          return t(
            `Automatic deletion is unavailable for this sign-in method. Contact ${RESTORAN_CONTACT.email}.`,
            `Pemadaman automatik tidak tersedia bagi kaedah log masuk ini. Hubungi ${RESTORAN_CONTACT.email}.`
          );
        default:
          return t('Could not complete account deletion. Please try again.', 'Gagal memadam akaun buat masa ini. Sila cuba lagi.');
      }
    }
    return t('Could not complete account deletion. Please try again.', 'Gagal memadam akaun buat masa ini. Sila cuba lagi.');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError(
        t(
          'Internet connection is required. Please reconnect and try again.',
          'Sambungan internet diperlukan. Sila sambung semula dan cuba lagi.'
        )
      );
      return;
    }
    if (requiresPassword && !password) {
      setError(t('Please enter your password to confirm.', 'Sila masukkan kata laluan untuk pengesahan.'));
      return;
    }

    await triggerMediumImpact();
    setBusy(true);
    setError('');

    try {
      await deleteCustomerAccountAndData({
        password,
        isAdminSession,
        onCleanupLocalCache,
      });

      toast({
        title: t('Account Deleted', 'Akaun Dipadamkan'),
        description: t(
          'Your account and personal data have been permanently removed.',
          'Akaun dan data peribadi anda telah dipadamkan secara kekal.'
        ),
        variant: 'success',
      });
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      setError(mapErrorToMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const isSubmitDisabled =
    busy || !isOnline || !isSupportedProvider || (requiresPassword && !password);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!busy) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleConfirmDelete} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--ui-danger)]">
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t('Delete Account & Data', 'Pemadaman Akaun & Data')}</span>
            </DialogTitle>
            <DialogDescription>
              {requiresPassword
                ? t(
                    'Confirm your password to permanently delete your Restoran Wawasan account and personal data.',
                    'Sahkan kata laluan anda untuk memadam akaun serta data peribadi Restoran Wawasan secara kekal.'
                  )
                : usesGoogle
                  ? t(
                      'Re-verify your Google account to permanently delete your Restoran Wawasan account and personal data.',
                      'Sahkan semula akaun Google anda untuk memadam akaun serta data peribadi Restoran Wawasan secara kekal.'
                    )
                  : usesFederated
                    ? t(
                        'Re-verify your sign-in account to permanently delete your Restoran Wawasan account and personal data.',
                        'Sahkan semula akaun log masuk anda untuk memadam akaun serta data peribadi Restoran Wawasan secara kekal.'
                      )
                    : t(
                        'Manage permanent deletion for your Restoran Wawasan account.',
                        'Urus pemadaman kekal bagi akaun Restoran Wawasan anda.'
                      )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs sm:text-sm">
            {userEmail && (
              <div className="rounded-xl bg-[var(--color-surface-muted)] border border-[var(--ui-border)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                <span className="text-[var(--ui-muted)] font-medium shrink-0">
                  {t('Account:', 'Akaun:')}
                </span>
                <span className="font-mono font-semibold text-[var(--ui-ink)] truncate">
                  {userEmail}
                </span>
              </div>
            )}

            {!isOnline && (
              <div
                role="status"
                className="rounded-xl bg-[var(--color-warning-soft)] border border-[var(--ui-danger)]/35 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-[var(--ui-ink)]"
              >
                <WifiOff className="w-4 h-4 text-[var(--ui-danger)] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {t(
                    'You appear to be offline. Connect to the internet to permanently delete your account and cloud data.',
                    'Anda kini di luar talian. Sambungkan ke internet untuk memadam akaun dan data awan secara kekal.'
                  )}
                </span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-[var(--color-danger-soft)] border border-[var(--ui-danger)]/25 text-[var(--ui-ink)] text-xs space-y-1.5 leading-relaxed">
              <p className="font-bold text-[var(--ui-danger)]">
                {t('This action is permanent:', 'Tindakan ini adalah kekal:')}
              </p>
              <p>
                {t(
                  'Your profile, saved addresses, personal calendar notes, device biometrics and login access will be permanently erased.',
                  'Profil, alamat tersimpan, nota kalendar peribadi, biometrik peranti dan akses log masuk anda akan dipadamkan secara kekal.'
                )}
              </p>
              <p className="text-[var(--ui-muted)] pt-1 border-t border-[var(--ui-danger)]/15">
                {t(
                  `Issued official order & invoice records remain archived for restaurant accounting. Contact ${RESTORAN_CONTACT.email} for archival inquiries.`,
                  `Rekod pesanan & invois rasmi yang telah dikeluarkan dikekalkan untuk arkib perakaunan restoran. Hubungi ${RESTORAN_CONTACT.email} untuk semakan lanjut.`
                )}
              </p>
            </div>

            {requiresPassword ? (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="delete-account-password">
                  {t('Confirm Password', 'Sahkan Kata Laluan')}
                </Label>
                <Input
                  id="delete-account-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('Enter your password', 'Masukkan kata laluan anda')}
                  value={password}
                  onChange={(ev) => {
                    setPassword(ev.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={Boolean(error)}
                  disabled={busy || !isOnline}
                />
              </div>
            ) : !isSupportedProvider ? (
              <p className="text-xs font-medium text-[var(--ui-danger)]">
                {t(
                  `Automatic deletion is unavailable for this sign-in method. Please email ${RESTORAN_CONTACT.email}.`,
                  `Pemadaman automatik tidak tersedia untuk kaedah log masuk ini. Sila emel ${RESTORAN_CONTACT.email}.`
                )}
              </p>
            ) : null}

            {error && (
              <p role="alert" className="text-xs font-medium text-[var(--ui-danger)] pt-0.5">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-xl text-xs font-semibold"
            >
              {t('Cancel', 'Batal')}
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={busy}
              disabled={isSubmitDisabled}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              {!busy && <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>
                {usesGoogle
                  ? t('Verify Google & Delete', 'Sahkan Google & Padam')
                  : usesFederated
                    ? t('Verify Account & Delete', 'Sahkan Akaun & Padam')
                    : t('Delete Permanently', 'Padam Akaun Kekal')}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteAccountDialog;
