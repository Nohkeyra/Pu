import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Ban } from 'lucide-react';

interface ProfilePreferencesTabProps {
  notifyOrderStatus: boolean;
  setNotifyOrderStatus: (val: boolean) => void;
  notifyBilledUpdates: boolean;
  setNotifyBilledUpdates: (val: boolean) => void;
  notifyCancelApproval: boolean;
  setNotifyCancelApproval: (val: boolean) => void;
  handleSavePreferences: () => void;
  isSaving?: boolean;
  t: (en: string, bm: string) => string;
}

export function ProfilePreferencesTab({
  notifyOrderStatus,
  setNotifyOrderStatus,
  notifyBilledUpdates,
  setNotifyBilledUpdates,
  notifyCancelApproval,
  setNotifyCancelApproval,
  handleSavePreferences,
  t,
}: ProfilePreferencesTabProps) {
  return (
    <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="pb-4 border-b border-stone-200/80 dark:border-white/10 font-sans">
        <h3 className="text-base sm:text-lg font-bold text-deep-forest dark:text-white">
          {t('Notification & Communication Preferences', 'Tetapan Notifikasi & Komunikasi')}
        </h3>
        <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5">
          {t('Manage how you receive order status alerts, invoice emails, and cancellation updates.', 'Urus saluran notifikasi pesanan dan invois anda.')}
        </p>
      </div>

      <div className="space-y-4 font-sans">
        {/* Order Status Notification */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50/50 dark:bg-stone-900/30 border border-stone-200/80 dark:border-white/10">
          <div className="space-y-0.5 pr-4">
            <Label className="text-sm font-bold text-deep-forest dark:text-white flex items-center gap-2 cursor-pointer">
              <Bell className="w-4 h-4 text-crisp-carrot shrink-0" />
              <span>{t('Order Status Alerts', 'Notifikasi Status Tempahan')}</span>
            </Label>
            <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-relaxed">
              {t('Receive push alerts or emails when your catering order is Approved, In Preparation, or Delivered.', 'Terima notifikasi apabila status tempahan diluluskan, disediakan, atau dihantar.')}
            </p>
          </div>
          <Switch
            checked={notifyOrderStatus}
            onCheckedChange={(checked) => {
              setNotifyOrderStatus(checked);
              setTimeout(() => handleSavePreferences(), 100);
            }}
          />
        </div>

        {/* Invoice Email Updates */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50/50 dark:bg-stone-900/30 border border-stone-200/80 dark:border-white/10">
          <div className="space-y-0.5 pr-4">
            <Label className="text-sm font-bold text-deep-forest dark:text-white flex items-center gap-2 cursor-pointer">
              <Mail className="w-4 h-4 text-crisp-carrot shrink-0" />
              <span>{t('Automated Invoice Email Dispatch', 'Pemberitahuan Emel Invois')}</span>
            </Label>
            <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-relaxed">
              {t('Automatically send a PDF tax invoice copy to your email once order is approved by management.', 'Hantar salinan invois PDF ke emel sebaik sahaja tempahan diluluskan.')}
            </p>
          </div>
          <Switch
            checked={notifyBilledUpdates}
            onCheckedChange={(checked) => {
              setNotifyBilledUpdates(checked);
              setTimeout(() => handleSavePreferences(), 100);
            }}
          />
        </div>

        {/* Cancel Approval Alerts */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50/50 dark:bg-stone-900/30 border border-stone-200/80 dark:border-white/10">
          <div className="space-y-0.5 pr-4">
            <Label className="text-sm font-bold text-deep-forest dark:text-white flex items-center gap-2 cursor-pointer">
              <Ban className="w-4 h-4 text-crisp-carrot shrink-0" />
              <span>{t('Cancellation Request Outcome Alerts', 'Notifikasi Keputusan Pembatalan')}</span>
            </Label>
            <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-relaxed">
              {t('Get notified when restaurant admin accepts or declines a submitted cancellation request.', 'Notifikasi jika permohonan pembatalan anda diluluskan atau ditolak oleh admin.')}
            </p>
          </div>
          <Switch
            checked={notifyCancelApproval}
            onCheckedChange={(checked) => {
              setNotifyCancelApproval(checked);
              setTimeout(() => handleSavePreferences(), 100);
            }}
          />
        </div>
      </div>
    </div>
  );
}
