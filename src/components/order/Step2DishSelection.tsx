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
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton, DishCardSkeleton } from '@/components/ui/Skeleton';
import { FormError } from '@/components/ui/FormError';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAssetUrl } from '@/lib/utils';
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
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  
  const visibleMenu = React.useMemo(() => {
    return dynamicMenu.filter(item => item.available !== false);
  }, [dynamicMenu]);

  const searchableMenu = React.useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return visibleMenu.filter(item => (category === 'all' || item.category === category) && (!term || [item.name, item.nameEn, item.nameBm]
      .some(name => typeof name === 'string' && name.toLocaleLowerCase().includes(term))));
  }, [category, search, visibleMenu]);

  const categoryOptions = [
    { id: 'all', label: tText('All', 'Semua'), show: true },
    { id: 'breakfast', label: tText('Breakfast', 'Sarapan'), show: orderState.mealTypes.includes('sarapan') },
    { id: 'lunch', label: tText('Lunch', 'Tengah hari'), show: orderState.mealTypes.includes('tengahari') || !orderState.mealTypes.length },
    { id: 'hi tea', label: 'Hi-Tea', show: orderState.mealTypes.includes('hitea') },
    { id: 'drinks', label: tText('Drinks', 'Minuman'), show: visibleMenu.some(item => item.category === 'drinks') },
  ].filter(option => option.show);

  const matchingAvailable = searchableMenu.some(item => {
    if (item.category === 'breakfast') return orderState.mealTypes.includes('sarapan');
    if (item.category === 'lunch') return orderState.mealTypes.includes('tengahari') || !orderState.mealTypes.length;
    if (item.category === 'hi tea') return orderState.mealTypes.includes('hitea');
    if (item.category !== 'drinks') return false;
    return ((!item.suitability || item.suitability === 'breakfast_hitea') && (orderState.mealTypes.includes('sarapan') || orderState.mealTypes.includes('hitea') || !orderState.mealTypes.length))
      || (item.suitability === 'lunch' && (orderState.mealTypes.includes('tengahari') || !orderState.mealTypes.length));
  });
  const showHotDrinks = (orderState.mealTypes.includes('sarapan') || orderState.mealTypes.includes('hitea') || !orderState.mealTypes.length)
    && searchableMenu.some(item => item.category === 'drinks' && (item.suitability === 'breakfast_hitea' || !item.suitability));
  const showColdDrinks = (orderState.mealTypes.includes('tengahari') || !orderState.mealTypes.length)
    && searchableMenu.some(item => item.category === 'drinks' && item.suitability === 'lunch');

  const validateAndNext = async () => {
    setFieldError(null);
    await handleStepNext(2);
  };

  const renderSection = (title: string, icon: React.ReactNode, category: string, colorClass: string, isFirstSection: boolean = false) => {
    const categoryDishes = searchableMenu.filter(item => item.category === category);
    if (!categoryDishes.length) return null;

    const selectedCount = orderState.dishes.filter(d => d.category === category).length;
    const isVeggie = category === 'veggies' || category === 'veggie' || category === 'vegetables';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone-200/80 dark:border-stone-800 pb-2.5">
          <Label className={`text-xs font-black ${colorClass} uppercase tracking-wider block shrink-0`}>
            <span className="inline-flex items-center gap-1.5">{icon}<span>{title}</span></span>
          </Label>
          {selectedCount > 0 && (
            <span className="microcopy-12-upper font-bold px-3 py-1 rounded-full transition-colors text-white bg-amber-600 shadow-xs shrink-0 whitespace-nowrap">
              {selectedCount} {tText('Selected', 'Dipilih')}
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
      <div className="bg-[#fbf1df] dark:bg-[#242321] p-5 sm:p-6 rounded-3xl border border-[#eadbc7] dark:border-white/10 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern.jpg')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <img src={getAssetUrl('/assets/brand/wawasan_logo_badge.png')} alt="Restoran Wawasan" className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" width={80} height={80} />
          <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
            {tText('Choose your dishes', 'Pilih hidangan')}
          </h2>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed mt-1.5">
            {tText('Choose a menu for your event.', 'Pilih menu untuk majlis anda.')}
          </p>
          </div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{tText('Includes steam white rice, mineral cups and utensils automatically.', 'Nasi putih, air minuman cawan, dan set hidangan dimasukkan percuma.')}</p>

      {!menuLoading && (
        <div className="space-y-2">
          <label htmlFor="dish-search" className="text-sm font-semibold text-stone-700 dark:text-stone-200">{tText('Find a dish or drink', 'Cari hidangan atau minuman')}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500 dark:text-stone-400" aria-hidden="true" />
            <input id="dish-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={tText('Search the menu...', 'Cari dalam menu...')} className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white py-3 pl-12 pr-12 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-white dark:placeholder:text-stone-400" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label={tText('Clear search', 'Padam carian')} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 dark:text-stone-300 dark:hover:bg-stone-800"><X className="h-4 w-4" aria-hidden="true" /></button>}
          </div>
          {search.trim() && <p role="status" className="text-xs text-stone-600 dark:text-stone-300">{matchingAvailable ? tText('Showing matching items. Your selections are kept.', 'Memaparkan padanan. Pilihan anda dikekalkan.') : tText('No matching items in this category. Try another search or category.', 'Tiada padanan dalam kategori ini. Cuba carian atau kategori lain.')}</p>}
          <div role="group" aria-label={tText('Menu categories', 'Kategori menu')} className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:thin]">
            {categoryOptions.map(option => <button key={option.id} type="button" aria-pressed={category === option.id} onClick={() => setCategory(option.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 ${category === option.id ? 'border-orange-600 bg-orange-600 text-white' : 'border-[#e8dac8] bg-[#f7edde] text-stone-700 hover:bg-[#efdfca] dark:border-stone-700 dark:bg-[#272522] dark:text-stone-200 dark:hover:bg-stone-700'}`}>{option.label}</button>)}
          </div>
          {!search.trim() && !matchingAvailable && <p role="status" className="text-xs text-stone-600 dark:text-stone-300">{tText('No items available in this category.', 'Tiada hidangan tersedia dalam kategori ini.')}</p>}
        </div>
      )}

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

          {(showHotDrinks || showColdDrinks) && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-stone/10 pb-2">
                <Label className="text-xs font-black text-blue-500 uppercase tracking-wider block shrink-0">
                  <span className="inline-flex items-center gap-1.5"><CupSoda className="w-4 h-4" aria-hidden="true" />{tText('Drinks Selection', 'Pilihan Minuman')}</span>
                </Label>
                {orderState.dishes.filter(d => d.category === 'drinks').length > 0 && (
                  <span className="microcopy-12-upper font-bold px-2.5 py-0.5 rounded-full transition-colors text-white bg-crisp-carrot shadow-sm shrink-0 whitespace-nowrap">
                    {orderState.dishes.filter(d => d.category === 'drinks').length} / {visibleMenu.filter(item => item.category === 'drinks').length} {tText('Selected', 'Dipilih')}
                  </span>
                )}
              </div>

              {showHotDrinks && (
                <div className="space-y-3">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block opacity-80">
                    <span className="inline-flex items-center gap-1.5"><Coffee className="w-4 h-4" aria-hidden="true" />{tText('Hot/Warm Drinks', 'Minuman Panas/Suam')}</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 pb-2">
                    {searchableMenu
                      .filter(item => item.category === 'drinks' && (item.suitability === 'breakfast_hitea' || !item.suitability))
                      .map(item => {
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
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {showColdDrinks && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block opacity-80">
                    <span className="inline-flex items-center gap-1.5"><CupSoda className="w-4 h-4" aria-hidden="true" />{tText('Refreshing Box/Cordial/Mineral Drinks', 'Minuman Kotak/Kordial/Mineral Segar')}</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 pb-2">
                    {searchableMenu
                      .filter(item => item.category === 'drinks' && item.suitability === 'lunch')
                      .map(item => {
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
                          />
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
          <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
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

    </motion.div>
  );
}

