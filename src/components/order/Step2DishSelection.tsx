import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
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
import { getAssetUrl } from '@/lib/utils';
import { MenuItemCard } from './MenuItemCard';

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

  const renderSection = (title: string, icon: string, category: string, colorClass: string) => {
    const categoryDishes = visibleMenu.filter(item => item.category === category);
    if (!categoryDishes.length) return null;

    const selectedCount = orderState.dishes.filter(d => d.category === category).length;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone/10 pb-2 sticky top-[88px] z-30 bg-cream/95 dark:bg-background/95 backdrop-blur-sm -mx-1 px-1">
          <Label className={`text-xs font-black ${colorClass} uppercase tracking-wider block shrink-0`}>
            {icon} {title}
          </Label>
          {selectedCount > 0 && (
            <span className="microcopy-12-upper font-bold px-2.5 py-0.5 rounded-full transition-colors text-white bg-crisp-carrot shadow-sm shrink-0 whitespace-nowrap">
              {selectedCount} / {categoryDishes.length} {tText('Selected', 'Dipilih')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
          {categoryDishes.map(item => (
            <MenuItemCard
              key={item.id}
              item={item}
              isSelected={orderState.dishes.some(x => x.id === item.id)}
              onToggle={() => { setFieldError(null); void handleToggleDish(item); }}
              tText={tText}
            />
          ))}
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
          {orderState.mealTypes.includes('sarapan') && renderSection(tText('Breakfast Selection', 'Pilihan Sarapan'), '🍳', 'breakfast', 'text-amber-500')}
          {orderState.mealTypes.includes('tengahari') && renderSection(tText('Lunch Selection', 'Pilihan Tengahari'), '🍛', 'lunch', 'text-orange-500')}
          {orderState.mealTypes.includes('hitea') && renderSection(tText('Hi-Tea Selection', 'Pilihan Hi-Tea'), '🍰', 'hi tea', 'text-pink-500')}

          {visibleMenu.some(item => item.category === 'drinks') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone/10 pb-2 sticky top-[88px] z-30 bg-cream/95 dark:bg-background/95 backdrop-blur-sm -mx-1 px-1">
                <Label className="text-xs font-black text-blue-500 uppercase tracking-wider block shrink-0">
                  🥤 {tText('Drinks Selection', 'Pilihan Minuman')}
                </Label>
                {orderState.dishes.filter(d => d.category === 'drinks').length > 0 && (
                  <span className="microcopy-12-upper font-bold px-2.5 py-0.5 rounded-full transition-colors text-white bg-crisp-carrot shadow-sm shrink-0 whitespace-nowrap">
                    {orderState.dishes.filter(d => d.category === 'drinks').length} / {visibleMenu.filter(item => item.category === 'drinks').length} {tText('Selected', 'Dipilih')}
                  </span>
                )}
              </div>

              {(orderState.mealTypes.includes('sarapan') || orderState.mealTypes.includes('hitea') || !orderState.mealTypes.length) && (
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block opacity-80">
                    {tText('☕ Hot/Warm Drinks', '☕ Minuman Panas/Suam')}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                    {visibleMenu
                      .filter(item => item.category === 'drinks' && (item.suitability === 'breakfast_hitea' || !item.suitability))
                      .map(item => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          isSelected={orderState.dishes.some(x => x.id === item.id)}
                          onToggle={() => { setFieldError(null); void handleToggleDish(item); }}
                          tText={tText}
                        />
                      ))}
                  </div>
                </div>
              )}

              {(orderState.mealTypes.includes('tengahari') || !orderState.mealTypes.length) && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block opacity-80">
                    {tText('🥤 Refreshing Box/Cordial/Mineral Drinks', '🥤 Minuman Kotak/Kordial/Mineral Segar')}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                    {visibleMenu
                      .filter(item => item.category === 'drinks' && item.suitability === 'lunch')
                      .map(item => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          isSelected={orderState.dishes.some(x => x.id === item.id)}
                          onToggle={() => { setFieldError(null); void handleToggleDish(item); }}
                          tText={tText}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
              'Want custom dishes, signature drinks, or special culinary arrangements? Specify them here.',
              'Sila nyatakan jika ada lauk, minuman, atau permintaan katering khas.'
            )}
          </p>
          <Textarea
            placeholder={tText(
              'e.g. Nasi Minyak dengan Ayam Masak Merah...',
              'cth. Nasi Minyak dengan Ayam Masak Merah...'
            )}
            value={orderState.customMenu}
            onChange={(e) => setOrderState((prev: any) => ({ ...prev, customMenu: e.target.value }))}
            className="w-full min-h-[140px] border-stone-200 dark:border-stone-700 rounded-xl p-3.5 bg-card dark:bg-stone-900/60 text-sm text-deep-forest dark:text-white placeholder:text-stone-400/80 focus:border-crisp-carrot focus:ring-2 focus:ring-crisp-carrot/25 transition-all shadow-inner leading-relaxed"
          />
        </div>
      </div>

      <div className="bg-charcoal text-white p-5 rounded-2xl shadow-lg border border-charcoal/85 relative overflow-hidden space-y-2.5">
        <div 
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern.jpg')})`,
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
      </div>

      {fieldError && <FormError message={fieldError} />}

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
