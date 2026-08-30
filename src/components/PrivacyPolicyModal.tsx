import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, CheckCircle2, Lock, FileText, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import { getAssetUrl } from '@/lib/utils';
import { TransparentLogo } from '@/components/TransparentLogo';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onUnderstood: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onUnderstood }: PrivacyPolicyModalProps) {
  const { language, setLanguage } = useLanguage();
  const [hasScrolledBottom, setHasScrolledBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 40;
    if (isAtBottom && !hasScrolledBottom) {
      setHasScrolledBottom(true);
    }
  };

  const handleUnderstoodClick = async () => {
    await triggerMediumImpact();
    try {
      localStorage.setItem('wawasan_privacy_acknowledged', 'true');
      localStorage.setItem('wawasan_privacy_timestamp', new Date().toISOString());
    } catch (err) {
      console.warn('Failed to save privacy acknowledgment:', err);
    }
    onUnderstood();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="relative z-10 w-full max-w-lg bg-cream dark:bg-[#121a17] border border-amber-500/30 dark:border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0c453c] via-[#0e5449] to-[#0c453c] text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
            {/* Ambient pattern overlay */}
            <div className="absolute inset-0 opacity-10 pattern-dots pointer-events-none" />
            
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 p-1.5 shrink-0 flex items-center justify-center shadow-md">
                  <TransparentLogo
                    src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                    alt="Restoran Wawasan Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
                    <h2 className="font-display font-bold text-lg text-white leading-tight">
                      {language === 'bm' ? 'Dasar Privasi & Terma' : 'Privacy Policy & Terms'}
                    </h2>
                  </div>
                  <p className="text-[11px] font-medium text-white/80 mt-0.5">
                    Restoran Wawasan Pak Usop (Est. 1986)
                  </p>
                </div>
              </div>

              {/* Language Switcher Pill */}
              <button
                type="button"
                onClick={async () => {
                  await triggerLightImpact();
                  setLanguage(language === 'bm' ? 'en' : 'bm');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors shrink-0 touch-target"
                aria-label="Tukar bahasa"
              >
                <Globe className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)]" />
                <span>{language === 'bm' ? 'EN' : 'BM'}</span>
              </button>
            </div>
          </div>

          {/* Policy Scrollable Body */}
          <div
            onScroll={handleScroll}
            className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-deep-forest dark:text-stone-200 leading-relaxed flex-grow"
          >
            {/* Intro Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs font-medium">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p>
                {language === 'bm'
                  ? 'Privasi anda keutamaan kami. Aplikasi Restoran Wawasan mematuhi Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia untuk memastikan data anda dilindungi sepenuhnya.'
                  : 'Your privacy is paramount. Restoran Wawasan app complies with Malaysia Personal Data Protection Act 2010 (PDPA) to ensure your data remains fully secured.'}
              </p>
            </div>

            {/* Section 1 */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-deep-forest dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0c453c] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                {language === 'bm' ? 'Maklumat Yang Dikumpul' : 'Information We Collect'}
              </h3>
              <p className="pl-7 text-deep-forest/80 dark:text-stone-300">
                {language === 'bm'
                  ? 'Kami mengumpul nama, nombor telefon WhatsApp, alamat penghantaran/lokasi majlis, dan perincian tempahan katering untuk memproses pesanan serta pengeluaran invois rasmi.'
                  : 'We collect your name, WhatsApp phone number, delivery/event venue address, and catering order details strictly to process orders and generate official invoices.'}
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-deep-forest dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0c453c] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                {language === 'bm' ? 'Penggunaan & Keselamatan Data' : 'Data Usage & Protection'}
              </h3>
              <p className="pl-7 text-deep-forest/80 dark:text-stone-300">
                {language === 'bm'
                  ? 'Data anda digunakan secara eksklusif untuk penyediaan sebut harga, pengesahan tempahan, dan makluman pesanan. Data disimpan selamat melalui infrastruktur awan disulitkan (Firebase & SSL/TLS).'
                  : 'Your data is strictly used for quote generation, booking confirmation, and order updates. Data is securely stored using encrypted cloud infrastructure (Firebase & SSL/TLS).'}
              </p>
            </div>

            {/* Section 3 */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-deep-forest dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0c453c] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                {language === 'bm' ? 'Jaminan Tiada Penjualan Data' : 'No Data Selling Guarantee'}
              </h3>
              <p className="pl-7 text-deep-forest/80 dark:text-stone-300">
                {language === 'bm'
                  ? 'Kami TIDAK PERNAH menjual, menyewa, atau berkongsi maklumat peribadi anda kepada pihak ketiga bagi sebarang tujuan pemasaran luar.'
                  : 'We NEVER sell, rent, or distribute your personal information to third parties for external marketing purposes.'}
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-deep-forest dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0c453c] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                {language === 'bm' ? 'Hak & Akses Pengguna' : 'Your Control & Rights'}
              </h3>
              <p className="pl-7 text-deep-forest/80 dark:text-stone-300">
                {language === 'bm'
                  ? 'Anda boleh menyemak, mengemas kini profil, atau meminta pemadaman data peribadi anda pada bila-bila masa melalui menu Tetapan aplikasi.'
                  : 'You may review, update your profile, or request complete data erasure at any time via the app Settings menu.'}
              </p>
            </div>

            {/* Document badge footer */}
            <div className="pt-2 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1 font-mono">
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                PDPA-2010-MY-V1.3
              </span>
              <span>Putrajaya, Malaysia</span>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="p-4 sm:p-5 bg-stone-100/80 dark:bg-[#0c100e] border-t border-stone-200 dark:border-white/10 shrink-0">
            <button
              id="privacy-policy-understood-btn"
              type="button"
              onClick={handleUnderstoodClick}
              className="btn-cta w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm min-h-[48px] shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {language === 'bm' ? 'Saya Fahami & Teruskan' : 'I Understand & Continue'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
