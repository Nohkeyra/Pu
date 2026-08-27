import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import { getAssetUrl, resolveDishImage } from '@/lib/utils';

export interface Step4ReviewSubmitProps {
  orderState: any;
  getMealTypesLabel: () => string;
  isSubmitting: boolean;
  handleOrderSubmission: () => void;
  setCurrentStep: (step: number) => void;
  triggerLightImpact: () => Promise<void>;
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
            backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern.jpg')})`,
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
          <span className="microcopy-12-upper font-black text-deep-forest dark:text-[#ede5d8] uppercase tracking-wider block mb-1">
            {tText('Event Summary', 'Maklumat Majlis')}
          </span>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('Event Type', 'Jenis Majlis')}</span>
            <span className="font-bold text-deep-forest dark:text-white">
              {orderState.eventType === 'pejabat' ? tText('Corporate Feast', 'Jamuan Pejabat') : tText('Private Event', 'Lain-lain')}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('Catering Block', 'Hidangan Untuk')}</span>
            <span className="font-bold text-deep-forest dark:text-white">
              {getMealTypesLabel()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('Serving Style', 'Gaya Hidangan')}</span>
            <span className="font-bold text-deep-forest dark:text-white">
              {orderState.preparationType === 'meal_box' ? tText('Pre-Pack Box', 'Set Box / Bungkus') : tText('Buffet Style', 'Hidangan Bufet')}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('Quantity', 'Kuantiti')}</span>
            <span className="font-bold text-deep-forest dark:text-white">{orderState.guests} {tText('pax', 'orang')}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('Date & Time', 'Tarikh & Masa')}</span>
            <span className="font-bold text-deep-forest dark:text-white">{orderState.date} @ {orderState.time}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('Method', 'Kaedah')}</span>
            <span className="font-bold text-deep-forest dark:text-white">
              {orderState.delivery === 'delivery' ? tText('Delivery to Location', 'Hantar ke Lokasi') : tText('Collect at Restaurant', 'Ambil di Restoran')}
            </span>
          </div>
        </div>

        {/* Customer Billing Summary */}
        <div className="bg-muted border border-stone/10 p-4 rounded-2xl space-y-2">
          <span className="microcopy-12-upper font-black text-deep-forest dark:text-[#ede5d8] uppercase tracking-wider block mb-1">
            {tText('Customer & Billing Info', 'Maklumat Pembayar')}
          </span>
          {orderState.eventType === 'pejabat' && (
            <div className="flex justify-between items-start text-xs gap-4">
              <span className="text-stone-700 dark:text-stone-300 font-medium shrink-0">{tText('Organization', 'Syarikat/Jabatan')}</span>
              <span className="font-bold text-deep-forest dark:text-white text-right">
                {orderState.companyName === 'other' ? orderState.customCompany : orderState.companyName}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('PIC Name', 'Nama')}</span>
            <span className="font-bold text-deep-forest dark:text-white">{orderState.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('PIC Phone', 'Telefon')}</span>
            <span className="font-bold text-deep-forest dark:text-white">{orderState.contact}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-stone-700 dark:text-stone-300 font-medium">{tText('PIC Email', 'E-mel')}</span>
            <span className="font-bold text-deep-forest dark:text-white break-all text-right">{orderState.email}</span>
          </div>
          <div className="flex justify-between items-start text-xs gap-4">
            <span className="text-stone-700 dark:text-stone-300 font-medium shrink-0">{tText('Venue Location', 'Lokasi')}</span>
            <span className="font-bold text-deep-forest dark:text-white text-right">{orderState.location}</span>
          </div>
        </div>

        {/* Selected Menu Dishes Summary */}
        <div className="bg-charcoal text-white p-5 rounded-2xl shadow-lg border border-charcoal/85 relative overflow-hidden space-y-3">
          {/* Background Batik Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.25] pointer-events-none"
            style={{
              backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern.jpg')})`,
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
                  {orderState.dishes.map((d: any) => {
                    const dishImg = resolveDishImage(d);
                    return (
                      <div key={d.id} className="flex items-center gap-2.5 bg-white/10 border border-white/5 p-1.5 pr-2.5 rounded-lg text-xs">
                        {dishImg && (
                          <div className="w-8 h-8 rounded overflow-hidden bg-white/5 border border-white/10 shrink-0 relative">
                            <img src={getAssetUrl(dishImg)} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-white font-medium flex-1 leading-tight">{tText(d.nameEn, d.nameBm)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            {orderState.veggies.length > 0 && (
              <>
                <p className="text-stone-300 microcopy-12 uppercase pt-1">{tText('Vegetables & Add-ons:', 'Sayur & Tambahan:')}</p>
                <div className="space-y-1 pl-1">
                  {orderState.veggies.map((v: any) => {
                    const dishImg = resolveDishImage(v);
                    return (
                      <div key={v.id} className="flex items-center gap-2.5 bg-white/10 border border-white/5 p-1.5 pr-2.5 rounded-lg text-xs">
                        {dishImg && (
                          <div className="w-8 h-8 rounded overflow-hidden bg-white/5 border border-white/10 shrink-0 relative">
                            <img src={getAssetUrl(dishImg)} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-white font-medium flex-1 leading-tight">{tText(v.nameEn, v.nameBm)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-white dark:bg-card border border-[var(--color-light-forest)] dark:border-stone-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-stone-600 dark:text-stone-400 font-medium">{tText('Subtotal', 'Jumlah Kecil')}</span>
            <span className="font-bold text-deep-forest dark:text-white">RM {(orderState.guests * (orderState.preparationType === 'meal_box' ? 12 : 15)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-stone-600 dark:text-stone-400 font-medium">{tText('Delivery Fee', 'Caj Penghantaran')}</span>
            <span className="font-bold text-deep-forest dark:text-white">{orderState.delivery === 'delivery' ? 'RM 15.00' : 'RM 0.00'}</span>
          </div>
          <div className="pt-4 border-t border-[var(--color-light-forest)] dark:border-stone-800 flex justify-between items-center">
            <span className="text-sm font-bold text-deep-forest dark:text-white uppercase tracking-wider">{tText('Total Estimate', 'Anggaran Penuh')}</span>
            <span className="text-xl font-black text-[var(--color-sunshine-cta)]">
              RM {((orderState.guests * (orderState.preparationType === 'meal_box' ? 12 : 15)) + (orderState.delivery === 'delivery' ? 15 : 0)).toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-stone-500 text-right leading-tight">
            * {tText('Final price may vary based on custom requirements.', 'Harga akhir mungkin berbeza mengikut keperluan tambahan.')}
          </p>
        </div>

      </div>

      <ResponsiveButtonGroup stackOnMobile={false} className="pt-2">
        <Button 
          variant="outline" 
          onClick={async () => { await triggerLightImpact(); setCurrentStep(3); }}
          className="flex-1 h-12 rounded-xl font-bold border-stone/20 text-stone hover:bg-stone/5 dark:hover:bg-white/5"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
        <Button 
          onClick={handleOrderSubmission} 
          disabled={isSubmitting}
          className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold text-sm shadow-md"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {tText('Submitting...', 'Menghantar...')}
            </span>
          ) : (
            tText('Submit Order', 'Hantar Tempahan')
          )}
        </Button>
      </ResponsiveButtonGroup>
    </motion.div>
  );
}
