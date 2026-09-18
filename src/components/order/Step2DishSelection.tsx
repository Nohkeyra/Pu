import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles,
  CupSoda,
  Coffee,
  Utensils,
  CakeSlice,
  ArrowLeft, 
  ArrowRight,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton, DishCardSkeleton } from '@/components/ui/Skeleton';
import { FormError } from '@/components/ui/FormError';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAssetUrl } from '@/lib/utils';
import { repairDishImage } from '@/lib/imageRepair';
import { MenuItemCard } from '@/components/order/MenuItemCard';

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

  const totalSelectedDishes = (orderState.dishes?.length || 0) + (orderState.veggies?.length || 0);

  const validateAndNext = async () => {
    const dishCount = (orderState.dishes?.length || 0) + (orderState.veggies?.length || 0);
    const hasCustom = Boolean(orderState.customMenu?.trim());
    if (dishCount === 0 && !hasCustom) {
      setOrderState((prev: any) => ({
        ...prev,
        customMenu: "Set Box Makanan dan Minuman"
      }));
    }
    setFieldError(null);
    await handleStepNext(2);
  };

  const renderSection = (title: string, icon: React.ReactNode, category: string, colorClass: string, isFirstSection: boolean = false) => {
    const categoryDishes = visibleMenu.filter(item => item.category === category);
    if (!categoryDishes.length) return null;

    const selectedCount = orderState.dishes.filter(d => d.category === category).length;
    const isVeggie = category === 'veggies' || category === 'veggie' || category === 'vegetables';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone-200/80 dark:border-stone-800 pb-2.5 sticky top-[72px] z-30 bg-cream/95 dark:bg-stone-950/95 backdrop-blur-md -mx-2 px-2 py-1">
          <Label className={`text-xs font-black ${colorClass} uppercase tracking-wider block shrink-0`}>
            <span className="inline-flex items-center gap-1.5">{icon}<span>{title}</span></span>
          </Label>
          {selectedCount > 0 && (
            <span className="microcopy-12-upper font-bold px-3 py-1 rounded-full transition-colors text-white bg-amber-600 shadow-xs shrink-0 whitespace-nowrap">
              {selectedCount} / {categoryDishes.length} {tText('Selected', 'Dipilih')}
            </span>
          )}
        </div>
        <div 
          className="grid grid-cols-2 gap-2.5 pb-2"
          data-tour={isVeggie ? "step2-veggie-list" : "step2-dish-list"}
        >
          {categoryDishes.map((item, index) => {
            const isFirstDish = isFirstSection && index === 0;
            const selected = orderState.dishes.some(x => x.id === item.id);
            const onToggle = () => {
              setFieldError(null);
              void handleToggleDish(item);
            };

            return (
              <MenuItemCard
                key={item.id}
                item={item}
                isSelected={selected}
                onToggle={onToggle}
                tText={tText}
                dataTour={isFirstDish ? 'step2-dish-1' : undefined}
              />
            );
          })}
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
          {orderState.mealTypes.includes('sarapan') && renderSection(tText('Breakfast Selection', 'Pilihan Sarapan'), <Utensils className="w-4 h-4" aria-hidden="true" />, 'breakfast', 'text-amber-500', true)}
          {orderState.mealTypes.includes('tengahari') && renderSection(tText('Lunch Selection', 'Pilihan Tengahari'), <Utensils className="w-4 h-4" aria-hidden="true" />, 'lunch', 'text-orange-500', !orderState.mealTypes.includes('sarapan'))}
          {orderState.mealTypes.includes('hitea') && renderSection(tText('Hi-Tea Selection', 'Pilihan Hi-Tea'), <CakeSlice className="w-4 h-4" aria-hidden="true" />, 'hi tea', 'text-pink-500', !orderState.mealTypes.includes('sarapan') && !orderState.mealTypes.includes('tengahari'))}
          {!orderState.mealTypes.length && renderSection(tText('Menu Selection', 'Pilihan Menu'), <Utensils className="w-4 h-4" aria-hidden="true" />, 'lunch', 'text-orange-500', true)}

          {visibleMenu.some(item => item.category === 'drinks') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone/10 pb-2 sticky top-[88px] z-30 bg-cream/95 dark:bg-background/95 backdrop-blur-sm -mx-1 px-1">
                <Label className="text-xs font-black text-blue-500 uppercase tracking-wider block shrink-0">
                  <span className="inline-flex items-center gap-1.5"><CupSoda className="w-4 h-4" aria-hidden="true" />{tText('Drinks Selection', 'Pilihan Minuman')}</span>
                </Label>
                {orderState.dishes.filter(d => d.category === 'drinks').length > 0 && (
                  <span className="microcopy-12-upper font-bold px-2.5 py-0.5 rounded-full transition-colors text-white bg-crisp-carrot shadow-sm shrink-0 whitespace-nowrap">
                    {orderState.dishes.filter(d => d.category === 'drinks').length} / {visibleMenu.filter(item => item.category === 'drinks').length} {tText('Selected', 'Dipilih')}
                  </span>
                )}
              </div>

              {(orderState.mealTypes.includes('sarapan') || orderState.mealTypes.includes('hitea') || !orderState.mealTypes.length) && (
                <div className="space-y-3">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block opacity-80">
                    <span className="inline-flex items-center gap-1.5"><Coffee className="w-4 h-4" aria-hidden="true" />{tText('Hot/Warm Drinks', 'Minuman Panas/Suam')}</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 pb-2">
                    {visibleMenu
                      .filter(item => item.category === 'drinks' && (item.suitability === 'breakfast_hitea' || !item.suitability))
                      .map(item => {
                        const selected = orderState.dishes.some(x => x.id === item.id);
                        const onToggle = () => {
                          setFieldError(null);
                          void handleToggleDish(item);
                        };
                        const dishName = tText(item.nameEn, item.nameBm) || item.name;
                        const dishImg = repairDishImage(item, { useProxyForExternal: true }) || item.image;
                        return (
                          <div
                            key={item.id}
                            className={`relative flex items-center gap-2.5 p-2.5 rounded-2xl
                                        border border-white/10 bg-stone-900/40
                                        hover:bg-stone-900/60 transition-colors
                                        cursor-pointer min-h-[72px]
                                        ${selected ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''}`}
                            onClick={onToggle}
                          >
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-stone-800">
                              {dishImg
                                ? <img src={getAssetUrl(dishImg)} alt={dishName}
                                       className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center
                                                   justify-center text-xl">🍽</div>}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0 pr-5">
                              <span className="text-sm font-semibold leading-tight
                                               line-clamp-2 block text-stone-900 dark:text-stone-100">
                                {dishName}
                              </span>
                            </div>

                            {/* Checkbox */}
                            <div className="absolute top-2 right-2">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 shadow-inner ${
                                selected ? "bg-amber-600 border-amber-600 text-white scale-110" : "border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {(orderState.mealTypes.includes('tengahari') || !orderState.mealTypes.length) && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block opacity-80">
                    <span className="inline-flex items-center gap-1.5"><CupSoda className="w-4 h-4" aria-hidden="true" />{tText('Refreshing Box/Cordial/Mineral Drinks', 'Minuman Kotak/Kordial/Mineral Segar')}</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 pb-2">
                    {visibleMenu
                      .filter(item => item.category === 'drinks' && item.suitability === 'lunch')
                      .map(item => {
                        const selected = orderState.dishes.some(x => x.id === item.id);
                        const onToggle = () => {
                          setFieldError(null);
                          void handleToggleDish(item);
                        };
                        const dishName = tText(item.nameEn, item.nameBm) || item.name;
                        const dishImg = repairDishImage(item, { useProxyForExternal: true }) || item.image;
                        return (
                          <div
                            key={item.id}
                            className={`relative flex items-center gap-2.5 p-2.5 rounded-2xl
                                        border border-white/10 bg-stone-900/40
                                        hover:bg-stone-900/60 transition-colors
                                        cursor-pointer min-h-[72px]
                                        ${selected ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''}`}
                            onClick={onToggle}
                          >
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-stone-800">
                              {dishImg
                                ? <img src={getAssetUrl(dishImg)} alt={dishName}
                                       className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center
                                                   justify-center text-xl">🍽</div>}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0 pr-5">
                              <span className="text-sm font-semibold leading-tight
                                               line-clamp-2 block text-stone-900 dark:text-stone-100">
                                {dishName}
                              </span>
                            </div>

                            {/* Checkbox */}
                            <div className="absolute top-2 right-2">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 shadow-inner ${
                                selected ? "bg-amber-600 border-amber-600 text-white scale-110" : "border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
          className="flex-1 border-stone-300 dark:border-stone-700 min-h-[48px] rounded-2xl font-bold text-sm text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('back')}
        </Button>
        <Button
          onClick={validateAndNext}
          data-tour="step2-next"
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white min-h-[48px] rounded-2xl font-bold text-sm shadow-md"
        >
          {tText('Next: Details', 'Seterusnya: Butiran')}
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </ResponsiveButtonGroup>

      {/* Floating Bottom Quick Action Bar for Mobile Ergonomics */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 md:hidden flex items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider leading-none">
            {tText('Selection', 'Pilihan')}
          </span>
          <span className="text-sm font-black text-stone-900 dark:text-white leading-tight mt-0.5">
            {totalSelectedDishes} {tText('dishes', 'lauk')} ({orderState.guests} pax)
          </span>
        </div>
        <Button
          onClick={validateAndNext}
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] px-5 rounded-xl font-bold text-xs shadow-md shrink-0 flex items-center gap-1.5"
        >
          <span>{tText('Next', 'Seterusnya')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
