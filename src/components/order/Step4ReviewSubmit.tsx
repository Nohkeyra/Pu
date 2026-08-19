import React from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Loader2, 
  ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import { getAssetUrl } from '@/lib/utils';

interface Dish {
  id: string;
  nameEn: string;
  nameBm: string;
}

interface OrderState {
  eventType: 'pejabat' | 'lain' | '';
  preparationType: 'buffet' | 'meal_box';
  guests: number;
  date: string;
  time: string;
  delivery: 'delivery' | 'pickup' | '';
  companyName: string;
  customCompany: string;
  name: string;
  contact: string;
  email: string;
  location: string;
  dishes: Dish[];
  veggies: Dish[];
  customMenu: string;
}

interface Step4ReviewSubmitProps {
  orderState: OrderState;
  getMealTypesLabel: () => string;
  isSubmitting: boolean;
  handleOrderSubmission: () => Promise<void> | void;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  triggerLightImpact: () => Promise<void> | void;
  tText: (en: string, bm: string) => string;
  t: (key: string) => string;
}

export function Step4ReviewSubmit({
  orderState,
  getMealTypesLabel,
  isSubmitting,
  handleOrderSubmission,
  setCurrentStep,
  triggerLightImpact,
  tText,
  t,
}: Step4ReviewSubmitProps) {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 text-left"
    >
      <div className="bg-charcoal text-white p-5 rounded-2xl border border-charcoal/80 relative overflow-hidden shadow-md">
        {/* Background Batik Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.22] pointer-events-none"
          style={{
            backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 pattern-dots opacity-15 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-base sm:text-lg font-bold tracking-wide font-display text-white">
            {tText('Review & Confirm Inquiry', 'Semak & Sahkan')}
          </h2>
          <p className="text-xs text-stone-300 font-light mt-1">
            {tText('Double check all information below before submitting.', 'Sila semak butiran tempahan anda sebelum menghantar.')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* Event & Serve Summary */}
        <div className="bg-muted border border-stone/10 p-4 rounded-2xl space-y-2">
          <span className="microcopy-12-upper font-black text-deep-forest uppercase tracking-wider block mb-1">
            {tText('Event Summary', 'Maklumat Majlis')}
          </span>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('Event Type', 'Jenis Majlis')}</span>
            <span className="font-bold text-deep-forest">
              {orderState.eventType === 'pejabat' ? tText('Corporate Feast', 'Jamuan Pejabat') : tText('Private Event', 'Lain-lain')}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('Catering Block', 'Hidangan Untuk')}</span>
            <span className="font-bold text-deep-forest">
              {getMealTypesLabel()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('Serving Style', 'Gaya Hidangan')}</span>
            <span className="font-bold text-deep-forest">
              {orderState.preparationType === 'meal_box' ? tText('Pre-Pack Box', 'Set Box / Bungkus') : tText('Buffet Style', 'Hidangan Bufet')}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('Quantity', 'Kuantiti')}</span>
            <span className="font-bold text-deep-forest">{orderState.guests} {tText('pax', 'orang')}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('Date & Time', 'Tarikh & Masa')}</span>
            <span className="font-bold text-deep-forest">{orderState.date} @ {orderState.time}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('Method', 'Kaedah')}</span>
            <span className="font-bold text-deep-forest">
              {orderState.delivery === 'delivery' ? tText('Delivery to Location', 'Hantar ke Lokasi') : tText('Collect at Restaurant', 'Ambil di Restoran')}
            </span>
          </div>
        </div>

        {/* Customer Billing Summary */}
        <div className="bg-muted border border-stone/10 p-4 rounded-2xl space-y-2">
          <span className="microcopy-12-upper font-black text-deep-forest uppercase tracking-wider block mb-1">
            {tText('Customer & Billing Info', 'Maklumat Pembayar')}
          </span>
          {orderState.eventType === 'pejabat' && (
            <div className="flex justify-between items-start text-xs gap-4">
              <span className="text-stone shrink-0">{tText('Organization', 'Syarikat/Jabatan')}</span>
              <span className="font-bold text-deep-forest text-right">
                {orderState.companyName === 'other' ? orderState.customCompany : orderState.companyName}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('PIC Name', 'Nama')}</span>
            <span className="font-bold text-deep-forest">{orderState.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('PIC Phone', 'Telefon')}</span>
            <span className="font-bold text-deep-forest">{orderState.contact}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone">{tText('PIC Email', 'E-mel')}</span>
            <span className="font-bold text-deep-forest break-all text-right">{orderState.email}</span>
          </div>
          <div className="flex justify-between items-start text-xs gap-4">
            <span className="text-stone shrink-0">{tText('Venue Location', 'Lokasi')}</span>
            <span className="font-bold text-deep-forest text-right">{orderState.location}</span>
          </div>
        </div>

        {/* Selected Menu Dishes Summary */}
        <div className="bg-charcoal text-white p-5 rounded-2xl shadow-lg border border-charcoal/85 relative overflow-hidden space-y-3">
          {/* Background Batik Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.25] pointer-events-none"
            style={{
              backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />

          <span className="relative z-10 microcopy-12-upper font-black text-[var(--color-sunshine-cta)] uppercase tracking-wider block mb-1">
            {tText('Selected Dishes Menu', 'Senarai Hidangan')}
          </span>
          <div className="relative z-10 text-xs text-white space-y-2 font-semibold">
            {orderState.dishes.length > 0 && (
              <>
                <p className="text-stone-300 microcopy-12 uppercase">{tText('Main Dishes & Drinks:', 'Hidangan & Minuman:')}</p>
                <div className="space-y-1 pl-1">
                  {orderState.dishes.map((d: any) => (
                    <div key={d.id} className="flex justify-between items-center bg-white/10 border border-white/5 px-2.5 py-1 rounded text-xs">
                      <span className="text-white font-medium">{tText(d.nameEn, d.nameBm)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {orderState.veggies.length > 0 && (
              <>
                <p className="text-stone-300 microcopy-12 uppercase pt-1">{tText('Vegetables & Add-ons:', 'Sayur & Tambahan:')}</p>
                <div className="space-y-1 pl-1">
                  {orderState.veggies.map((v: any) => (
                    <div key={v.id} className="flex justify-between items-center bg-white/10 border border-white/5 px-2.5 py-1 rounded text-xs">
                      <span className="text-white font-medium">{tText(v.nameEn, v.nameBm)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {orderState.customMenu && (
              <>
                <p className="text-stone-300 microcopy-12 uppercase pt-1">{tText('Custom Menu / Request:', 'Menu Khas / Permintaan:')}</p>
                <p className="pl-2 microcopy-12 font-normal text-white italic whitespace-pre-wrap bg-white/10 p-2 rounded-lg border border-white/5 mt-0.5">
                  "{orderState.customMenu}"
                </p>
              </>
            )}

            {orderState.dishes.length === 0 && orderState.veggies.length === 0 && !orderState.customMenu && (
              <div className="bg-[var(--color-sunshine-cta)]/15 border border-[var(--color-sunshine-cta)]/30 p-2.5 rounded-lg text-center mt-2 relative z-10">
                <p className="text-xs font-bold text-[var(--color-sunshine-cta)]">
                  {tText('Set Box Makanan & Minuman (Default)', 'Set Box Makanan & Minuman (Lalai)')}
                </p>
                <p className="microcopy-12-upper text-stone-300 font-light mt-0.5 leading-tight">
                  {tText('You have skipped individual dish selection. Standard boxed meal set will be served.', 'Anda melangkau pilihan lauk. Set hidangan kotak standard akan disediakan.')}
                </p>
              </div>
            )}
          </div>

          <div className="relative z-10 border-t border-white/10 pt-2.5 mt-2 flex justify-between items-center">
            <span className="text-xs font-bold text-[var(--color-sunshine-cta)] uppercase tracking-wider">
              {tText('Catering Price:', 'Harga Katering:')}
            </span>
            <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wide border border-white/15">
              {tText('Quotation Pending', 'Menunggu Sebut Harga')}
            </span>
          </div>
        </div>

        <p className="microcopy-12-upper text-stone leading-tight italic text-center px-4">
          {tText(
            '* Note: The restaurant admin will review your booking details and provide a finalized quote via WhatsApp or Email within 24 hours.',
            '* Nota: Admin restoran akan menyemak butiran tempahan dan memberikan sebut harga muktamad melalui WhatsApp atau E-mel dalam masa 24 jam.'
          )}
        </p>

      </div>

      {isSubmitting && (
        <p className="text-center text-sm font-semibold text-stone-600 dark:text-stone-300" role="status" aria-live="polite">
          {tText(
            'Please wait — do not close this screen while your order is being sent.',
            'Sila tunggu — jangan tutup skrin ini semasa tempahan dihantar.'
          )}
        </p>
      )}

      {/* Submitting Actions */}
      <ResponsiveButtonGroup stackOnMobile={false} className="pt-2">
        <Button
          onClick={async () => { await triggerLightImpact(); setCurrentStep(3); }}
          disabled={isSubmitting}
          variant="outline"
          className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-stone cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('back')}
        </Button>
        <Button
          onClick={handleOrderSubmission}
          disabled={isSubmitting}
          className="flex-1 bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm shadow-crisp"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden />
              <span>{tText('Sending order…', 'Menghantar tempahan…')}</span>
            </>
          ) : (
            <>
              <span>{tText('Submit Order', 'Hantar Tempahan')}</span>
              <Check className="w-4 h-4 ml-1.5" aria-hidden />
            </>
          )}
        </Button>
      </ResponsiveButtonGroup>
    </motion.div>
  );
}
