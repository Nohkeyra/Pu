import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton, DishCardSkeleton } from '@/components/ui/Skeleton';
import { FormError } from '@/components/ui/FormError';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, getAssetUrl } from '@/lib/utils';

interface OrderState {
  mealTypes: ('sarapan' | 'tengahari' | 'hitea')[];
  guests: number;
  dishes: any[];
  veggies: any[];
  customMenu: string;
}

interface Step2DishSelectionProps {
  orderState: OrderState;
  setOrderState: React.Dispatch<React.SetStateAction<any>>;
  menuLoading: boolean;
  dynamicMenu: any[];
  handleToggleDish: (dish: any) => Promise<void> | void;
  handleStepNext: (step: number) => Promise<void> | void;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  triggerLightImpact: () => Promise<void> | void;
  tText: (en: string, bm: string) => string;
  t: (key: string) => string;
}

export function Step2DishSelection({
  orderState,
  setOrderState,
  menuLoading,
  dynamicMenu,
  handleToggleDish,
  handleStepNext,
  setCurrentStep,
  triggerLightImpact,
  tText,
  t,
}: Step2DishSelectionProps) {
  const [fieldError, setFieldError] = useState<string | null>(null);
  const visibleMenu = React.useMemo(() => {
    return dynamicMenu.filter(item => item.available !== false);
  }, [dynamicMenu]);

  const validateAndNext = async () => {
    const dishCount = (orderState.dishes?.length || 0) + (orderState.veggies?.length || 0);
    const hasCustom = Boolean(orderState.customMenu?.trim());
    if (dishCount === 0 && !hasCustom) {
      setFieldError(
        tText(
          'Select at least one dish, or add a custom menu note.',
          'Pilih sekurang-kurangnya satu hidangan, atau isi nota menu khas.'
        )
      );
      return;
    }
    setFieldError(null);
    await handleStepNext(2);
  };

  const resolveDishImage = (item: any): string => {
    if (item?.image && typeof item.image === 'string' && item.image.trim()) {
      return item.image;
    }
    const id = (item?.id || '').toLowerCase();
    const name = `${item?.nameEn || ''} ${item?.nameBm || ''}`.toLowerCase();

    if (id.includes('nasi_lemak') || name.includes('nasi lemak')) {
      return '/assets/images/nasi_lemak_drawn_1786678078469.jpg';
    }
    if (id.includes('briyani') || id.includes('biryani') || name.includes('briyani') || name.includes('biryani')) {
      return '/assets/images/nasi_briyani_drawn_1786969169870.jpg';
    }
    if (id.includes('asam_laksa') || name.includes('asam laksa')) {
      return '/assets/images/asam_laksa_drawn_1786969613303.jpg';
    }
    if (id.includes('laksa') || name.includes('laksa')) {
      return '/assets/images/laksa_johor_drawn_1786969106862.jpg';
    }
    if (id.includes('mee_kari') || id.includes('curry_mee') || name.includes('mee kari') || name.includes('curry mee')) {
      return '/assets/images/mee_kari_drawn_1786969128509.jpg';
    }
    if (id.includes('asam_pedas') || name.includes('asam pedas') || name.includes('pari')) {
      return '/assets/images/asam_pedas_drawn_1786678089136.jpg';
    }
    if (id.includes('soto') || name.includes('soto') || id.includes('sup') || name.includes('sup')) {
      return '/assets/images/soto_ayam_drawn_1786678098460.jpg';
    }
    if (id.includes('lontong') || name.includes('lontong') || id.includes('lodeh')) {
      return '/assets/images/lontong_drawn_1786678109750.jpg';
    }
    if (id.includes('keli') || name.includes('keli') || id.includes('ikan') || name.includes('ikan')) {
      return '/assets/images/ikan_keli_drawn_1786969559146.jpg';
    }
    if (id.includes('udang') || name.includes('udang') || id.includes('sambal_udang')) {
      return '/assets/images/sambal_udang_drawn_1786969546168.jpg';
    }
    if (id.includes('lemak') || name.includes('masak lemak') || name.includes('lemak cili')) {
      return '/assets/images/masak_lemak_drawn_1786969572016.jpg';
    }
    if (id.includes('roti') || id.includes('canai') || name.includes('roti canai') || name.includes('murtabak')) {
      return '/assets/images/roti_canai_drawn_1786969584576.jpg';
    }
    if (id.includes('pisang') || name.includes('pisang') || id.includes('gorengan')) {
      return '/assets/images/pisang_goreng_drawn_1786969603197.jpg';
    }
    if (id.includes('rojak') || name.includes('rojak')) {
      return '/assets/images/rojak_singapore_drawn_1786969151162.jpg';
    }
    if (id.includes('kambing') || name.includes('kambing')) {
      return '/assets/images/kari_kambing_drawn_1786969139262.jpg';
    }
    if (id.includes('rendang') || id.includes('daging') || name.includes('rendang') || name.includes('daging')) {
      return '/assets/images/rendang_daging_drawn_1786678134956.jpg';
    }
    if (id.includes('ayam') || id.includes('percik') || name.includes('ayam')) {
      return '/assets/images/ayam_berempah_drawn_1786678122149.jpg';
    }
    if (id.includes('kuih') || id.includes('currypuff') || id.includes('karipap') || id.includes('samosa') || name.includes('kuih') || name.includes('karipap')) {
      return '/assets/images/kuih_muih_drawn_1786678145689.jpg';
    }
    if (id.includes('teh') || name.includes('teh')) {
      return '/assets/images/teh_tarik_drawn_1786678155597.jpg';
    }
    if (id.includes('kopi') || id.includes('nescafe') || id.includes('milo') || name.includes('kopi') || name.includes('nescafe') || name.includes('milo')) {
      return '/assets/images/kopi_kampung_drawn_1786678168694.jpg';
    }
    if (id.includes('sirap') || id.includes('drink') || id.includes('kordial') || id.includes('mineral') || item?.category === 'drink' || item?.category === 'drinks') {
      return '/assets/images/sirap_bandung_drawn_1786678177483.jpg';
    }
    return '/assets/nasi-campur.jpg';
  };

  const renderMenuItemCard = (item: any) => {
    const isSelected = orderState.dishes.some(x => x.id === item.id);
    const dishImg = resolveDishImage(item);

    return (
      <div
        key={item.id}
        onClick={() => { setFieldError(null); void handleToggleDish(item); }}
        className={cn(
          "p-2.5 sm:p-3 rounded-2xl border flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 select-none hover:scale-[1.01] active:scale-[0.99]",
          isSelected 
            ? "bg-crisp-carrot/10 dark:bg-crisp-carrot/15 border-crisp-carrot shadow-sm ring-1 ring-crisp-carrot/20" 
            : "bg-muted/60 hover:bg-muted border-stone/15 text-stone dark:bg-stone-800/40 dark:hover:bg-stone-800/70"
        )}
      >
        <div className={cn(
          "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors shadow-sm",
          isSelected ? "bg-crisp-carrot border-crisp-carrot text-white" : "border-stone/20 bg-card dark:bg-stone-800"
        )}>
          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
        
        {dishImg && (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 border border-amber-500/20 dark:border-white/10 shadow-sm relative">
            <img
              src={getAssetUrl(dishImg)}
              alt={tText(item.nameEn, item.nameBm)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getAssetUrl('/assets/nasi-campur.jpg');
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold block text-deep-forest dark:text-white truncate uppercase">
            {tText(item.nameEn, item.nameBm)}
          </span>
          {(item.descBm || item.descEn) && (
            <span className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 block truncate font-normal leading-tight mt-0.5">
              {tText(item.descEn, item.descBm)}
            </span>
          )}
        </div>

      </div>
    );
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 text-left"
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
            {tText('Select Menu Dishes', 'Pilih Hidangan Lauk-Pauk')}
          </h2>
          <p className="text-xs text-stone-300 font-light mt-1">
            {tText('Includes steam white rice, mineral cups and utensils automatically.', 'Nasi putih, air minuman cawan, dan set hidangan dimasukkan percuma.')}
          </p>
        </div>
      </div>

      {menuLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-stone-200/60 dark:border-stone-800">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DishCardSkeleton />
            <DishCardSkeleton />
            <DishCardSkeleton />
            <DishCardSkeleton />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Breakfast Section */}
          {orderState.mealTypes.includes('sarapan') && (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-stone/10 pb-1.5">
                <Label className="text-xs font-black text-amber-500 uppercase tracking-wider block">
                  {tText('🍳 Breakfast Selection', '🍳 Pilihan Sarapan')}
                </Label>
                <span className="microcopy-12-upper font-bold text-crisp-carrot bg-crisp-carrot/10 px-2 py-0.5 rounded-full">
                  {orderState.dishes.filter(d => d.category === 'breakfast').length} {tText('items', 'sajian')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
                {visibleMenu.filter(item => item.category === 'breakfast').map(renderMenuItemCard)}
              </div>
            </div>
          )}

          {/* Lunch Section */}
          {orderState.mealTypes.includes('tengahari') && (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-stone/10 pb-1.5">
                <Label className="text-xs font-black text-orange-500 uppercase tracking-wider block">
                  {tText('🍛 Lunch Selection', '🍛 Pilihan Tengahari')}
                </Label>
                <span className="microcopy-12-upper font-bold text-crisp-carrot bg-crisp-carrot/10 px-2 py-0.5 rounded-full">
                  {orderState.dishes.filter(d => d.category === 'lunch').length} {tText('items', 'sajian')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
                {visibleMenu.filter(item => item.category === 'lunch').map(renderMenuItemCard)}
              </div>
            </div>
          )}

          {/* Hi Tea Section */}
          {orderState.mealTypes.includes('hitea') && (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-stone/10 pb-1.5">
                <Label className="text-xs font-black text-pink-500 uppercase tracking-wider block">
                  {tText('🍰 Hi-Tea Selection', '🍰 Pilihan Hi-Tea')}
                </Label>
                <span className="microcopy-12-upper font-bold text-crisp-carrot bg-crisp-carrot/10 px-2 py-0.5 rounded-full">
                  {orderState.dishes.filter(d => d.category === 'hi tea').length} {tText('items', 'sajian')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
                {visibleMenu.filter(item => item.category === 'hi tea').map(renderMenuItemCard)}
              </div>
            </div>
          )}

          {/* Drinks Section */}
          {visibleMenu.some(item => item.category === 'drinks') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-stone/10 pb-1.5">
                <Label className="text-xs font-black text-blue-500 uppercase tracking-wider block">
                  {tText('🥤 Drinks Selection', '🥤 Pilihan Minuman')}
                </Label>
                <span className="microcopy-12-upper font-bold text-crisp-carrot bg-crisp-carrot/10 px-2 py-0.5 rounded-full">
                  {orderState.dishes.filter(d => d.category === 'drinks').length} {tText('items', 'sajian')}
                </span>
              </div>

              {/* Breakfast & Hi-Tea Drinks */}
              {(orderState.mealTypes.includes('sarapan') || orderState.mealTypes.includes('hitea') || !orderState.mealTypes.length) && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                    {tText('☕ Hot/Warm Drinks', '☕ Minuman Panas/Suam')}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {visibleMenu
                      .filter(item => item.category === 'drinks' && (item.suitability === 'breakfast_hitea' || !item.suitability))
                      .map(renderMenuItemCard)}
                  </div>
                </div>
              )}

              {/* Lunch Drinks */}
              {(orderState.mealTypes.includes('tengahari') || !orderState.mealTypes.length) && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">
                    {tText('🥤 Refreshing Box/Cordial/Mineral Drinks', '🥤 Minuman Kotak/Kordial/Mineral Segar')}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {visibleMenu
                      .filter(item => item.category === 'drinks' && item.suitability === 'lunch')
                      .map(renderMenuItemCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Menu Request */}
      <div className="pt-2 border-t border-stone/10">
        <div className="bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/80 dark:border-white/10 rounded-2xl p-4 md:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-crisp-carrot" />
            </div>
            <Label className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block leading-none">
              {tText('Other / Custom Menu Request (Optional)', 'Permintaan Menu Lain / Khas (Pilihan)')}
            </Label>
          </div>
          
          <p className="text-xs text-stone dark:text-stone-300 leading-relaxed font-normal">
            {tText(
              'Want custom dishes, signature drinks, or special culinary arrangements? Specify them here. If you skip this menu step completely, the app will auto-setup to our default "Set Box Makanan & Minuman".',
              'Sila nyatakan jika ada lauk, minuman, atau permintaan katering khas. Jika anda melangkau bahagian menu ini, tempahan akan ditetapkan secara automatik kepada "Set Box Makanan & Minuman" kami.'
            )}
          </p>
          
          <Textarea
            placeholder={tText(
              'e.g. Nasi Minyak dengan Ayam Masak Merah, Air Sirap Bandung, vegetarian options...',
              'cth. Nasi Minyak dengan Ayam Masak Merah, Air Sirap Bandung, menu vegetarian...'
            )}
            value={orderState.customMenu}
            onChange={(e) => setOrderState((prev: any) => ({ ...prev, customMenu: e.target.value }))}
            className="w-full min-h-[140px] border-stone-200 dark:border-stone-700 rounded-xl p-3.5 bg-card dark:bg-stone-900/60 text-sm text-deep-forest dark:text-white placeholder:text-stone-400/80 focus:border-crisp-carrot focus:ring-2 focus:ring-crisp-carrot/25 transition-all shadow-inner leading-relaxed"
          />
        </div>
      </div>

      {/* REALTIME SELECTION SUMMARY PANEL */}
      <div className="bg-charcoal text-white p-5 rounded-2xl shadow-lg border border-charcoal/85 relative overflow-hidden space-y-2.5">
        {/* Background Batik Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-center text-xs">
          <span className="text-stone-300 font-medium">{tText('Quantity:', 'Kuantiti:')}</span>
          <span className="font-bold text-white">{orderState.guests} {tText('pax', 'orang')}</span>
        </div>
        <div className="relative z-10 flex justify-between items-center text-xs">
          <span className="text-stone-300 font-medium">{tText('Dishes Selected:', 'Hidangan Dipilih:')}</span>
          <span className="font-bold text-white">
            {orderState.dishes.length + orderState.veggies.length} {tText('items', 'sajian')}
          </span>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-2.5 flex justify-between items-center">
          <span className="text-xs font-bold text-[var(--color-sunshine-cta)] uppercase tracking-wider">
            {tText('Price Estimation:', 'Anggaran Harga:')}
          </span>
          <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wide border border-white/15">
            {tText('Quotation Pending', 'Menunggu Sebut Harga')}
          </span>
        </div>
        <p className="relative z-10 text-[11px] text-stone-300 font-light pt-1 leading-relaxed">
          {tText(
            'Prices are hidden during selection and will be automatically calculated on submission.',
            'Harga disembunyikan semasa pemilihan dan akan dikira secara automatik selepas dihantar.'
          )}
        </p>
      </div>

      {fieldError && <FormError message={fieldError} />}

      {/* Buttons Navigation */}
      <ResponsiveButtonGroup stackOnMobile={false} className="pt-2">
        <Button
          onClick={async () => { await triggerLightImpact(); setCurrentStep(1); }}
          variant="outline"
          className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-stone cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('back')}
        </Button>
        <Button
          onClick={validateAndNext}
          className="flex-1 bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm shadow-crisp"
        >
          {tText('Next: Details', 'Seterusnya: Butiran')}
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </ResponsiveButtonGroup>
    </motion.div>
  );
}
