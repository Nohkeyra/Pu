import React from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Briefcase, 
  Smile, 
  Coffee, 
  Sun, 
  Utensils, 
  UtensilsCrossed, 
  Package, 
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn, getAssetUrl } from '@/lib/utils';

interface OrderState {
  eventType: 'pejabat' | 'lain' | '';
  mealTypes: ('sarapan' | 'tengahari' | 'hitea')[];
  preparationType: 'buffet' | 'meal_box';
  guests: number;
}

interface Step1EventMealProps {
  orderState: OrderState;
  setOrderState: React.Dispatch<React.SetStateAction<any>>;
  handleToggleMeal: (id: 'sarapan' | 'tengahari' | 'hitea') => Promise<void> | void;
  adjustGuests: (delta: number) => Promise<void> | void;
  handleStepNext: (step: number) => Promise<void> | void;
  tText: (en: string, bm: string) => string;
}

export function Step1EventMeal({
  orderState,
  setOrderState,
  handleToggleMeal,
  adjustGuests,
  handleStepNext,
  tText,
}: Step1EventMealProps) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
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
            {tText('Select Event Type', 'Pilih Jenis Majlis')}
          </h2>
          <p className="text-xs text-stone-300 font-light mt-1">
            {tText('Choose your catering hosting style.', 'Sila tentukan jenis majlis catering anda.')}
          </p>
        </div>
      </div>

      {/* Event Type option cards */}
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tText('Event type', 'Jenis Majlis')}>
        <button
          type="button"
          role="radio"
          aria-checked={orderState.eventType === 'pejabat'}
          onClick={() => setOrderState((prev: any) => ({ ...prev, eventType: 'pejabat' }))}
          className={cn(
            "p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center gap-2 cursor-pointer relative select-none hover:scale-[1.01] active:scale-[0.99]",
            orderState.eventType === 'pejabat' 
              ? "bg-crisp-carrot/10 border-crisp-carrot text-crisp-carrot shadow-md ring-1 ring-crisp-carrot/30" 
              : "bg-muted/70 hover:bg-muted border-stone/15 text-stone dark:bg-stone-800/50"
          )}
        >
          {orderState.eventType === 'pejabat' && (
            <div className="absolute top-2.5 right-2.5 bg-crisp-carrot text-white rounded-full p-1 shadow-sm">
              <Check className="w-3 h-3" />
            </div>
          )}
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm",
            orderState.eventType === 'pejabat' ? "bg-crisp-carrot text-white scale-105" : "bg-card border border-stone/10 text-stone dark:bg-stone-800"
          )}>
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold block text-deep-forest dark:text-white">{tText('Office Feast', 'Jamuan Pejabat')}</span>
          <span className="microcopy-12 text-stone/80 leading-tight font-normal">{tText('Meetings, workshops & corporate.', 'Urusan rasmi, mesyuarat, kursus.')}</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={orderState.eventType === 'lain'}
          onClick={() => setOrderState((prev: any) => ({ ...prev, eventType: 'lain' }))}
          className={cn(
            "p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center gap-2 cursor-pointer relative select-none hover:scale-[1.01] active:scale-[0.99]",
            orderState.eventType === 'lain' 
              ? "bg-crisp-carrot/10 border-crisp-carrot text-crisp-carrot shadow-md ring-1 ring-crisp-carrot/30" 
              : "bg-muted/70 hover:bg-muted border-stone/15 text-stone dark:bg-stone-800/50"
          )}
        >
          {orderState.eventType === 'lain' && (
            <div className="absolute top-2.5 right-2.5 bg-crisp-carrot text-white rounded-full p-1 shadow-sm">
              <Check className="w-3 h-3" />
            </div>
          )}
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm",
            orderState.eventType === 'lain' ? "bg-crisp-carrot text-white scale-105" : "bg-card border border-stone/10 text-stone dark:bg-stone-800"
          )}>
            <Smile className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold block text-deep-forest dark:text-white">{tText('Private Events', 'Lain-lain')}</span>
          <span className="microcopy-12 text-stone/80 leading-tight font-normal">{tText('Birthday, reunion, gatherings.', 'Sambutan hari jadi, tahlil, reuni.')}</span>
        </button>
      </div>

      {/* Meal Type selection */}
      <div className="space-y-2 pt-2">
        <Label className="text-xs font-bold text-stone dark:text-stone-300 uppercase tracking-wider block">
          {tText('Meals For / Hidangan Untuk', 'Hidangan Untuk *')}
        </Label>
        
        <div className="grid grid-cols-3 gap-2.5" role="group" aria-label={tText('Meal type', 'Hidangan')}>
          {[
            { id: 'sarapan', label: () => tText('Breakfast', 'Sarapan'), time: '7AM - 10AM', icon: Coffee },
            { id: 'tengahari', label: () => tText('Lunch', 'Makan Tengah Hari'), time: '12PM - 3PM', icon: Sun },
            { id: 'hitea', label: () => tText('Hi-Tea', 'Hi-Tea'), time: '3PM - 6PM', icon: Utensils }
          ].map(m => {
            const Icon = m.icon;
            const mealId = m.id as 'sarapan' | 'tengahari' | 'hitea';
            const isSelected = orderState.mealTypes.includes(mealId);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleToggleMeal(mealId)}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center gap-1.5 cursor-pointer relative select-none hover:scale-[1.01] active:scale-[0.99]",
                  isSelected 
                    ? "bg-crisp-carrot/12 border-crisp-carrot text-crisp-carrot shadow-sm ring-1 ring-crisp-carrot/20" 
                    : "bg-muted/70 border-stone/15 text-stone dark:bg-stone-800/50"
                )}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 bg-crisp-carrot text-white rounded-full p-0.5 shadow-sm">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                  isSelected ? "bg-crisp-carrot text-white" : "bg-card border border-stone/10 text-stone dark:bg-stone-800"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold block leading-none text-deep-forest dark:text-white mt-0.5">{m.label()}</span>
                <span className="microcopy-12 text-stone/80 leading-none font-normal">{m.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Serving Style / Preparation Type */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-deep-forest dark:text-white block">
          {tText('Serving Style / Preparation', 'Gaya Hidangan / Penyediaan')}
        </Label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tText('Serving style', 'Gaya Hidangan')}>
          <button
            type="button"
            role="radio"
            aria-checked={orderState.preparationType === 'buffet'}
            onClick={() => setOrderState((prev: any) => ({ ...prev, preparationType: 'buffet' }))}
            className={cn(
              "p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3 text-left cursor-pointer relative select-none hover:scale-[1.01] active:scale-[0.99]",
              orderState.preparationType === 'buffet'
                ? "bg-crisp-carrot/12 border-crisp-carrot text-crisp-carrot shadow-sm ring-1 ring-crisp-carrot/20"
                : "bg-muted/70 hover:bg-muted border-stone/15 text-stone dark:bg-stone-800/50"
            )}
          >
            {orderState.preparationType === 'buffet' && (
              <div className="absolute top-2.5 right-2.5 bg-crisp-carrot text-white rounded-full p-0.5 shadow-sm">
                <Check className="w-2.5 h-2.5" />
              </div>
            )}
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
              orderState.preparationType === 'buffet' ? "bg-crisp-carrot text-white" : "bg-card border border-stone/10 text-stone dark:bg-stone-800"
            )}>
              <UtensilsCrossed className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-sm font-bold block leading-tight text-deep-forest dark:text-white">{tText('Buffet Style', 'Hidangan Bufet')}</span>
              <span className="microcopy-12 text-stone/80 font-normal block mt-0.5">{tText('Tray / buffet setup', 'Dulang & meja bufet')}</span>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={orderState.preparationType === 'meal_box'}
            onClick={() => setOrderState((prev: any) => ({ ...prev, preparationType: 'meal_box' }))}
            className={cn(
              "p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3 text-left cursor-pointer relative select-none hover:scale-[1.01] active:scale-[0.99]",
              orderState.preparationType === 'meal_box'
                ? "bg-crisp-carrot/12 border-crisp-carrot text-crisp-carrot shadow-sm ring-1 ring-crisp-carrot/20"
                : "bg-muted/70 hover:bg-muted border-stone/15 text-stone dark:bg-stone-800/50"
            )}
          >
            {orderState.preparationType === 'meal_box' && (
              <div className="absolute top-2.5 right-2.5 bg-crisp-carrot text-white rounded-full p-0.5 shadow-sm">
                <Check className="w-2.5 h-2.5" />
              </div>
            )}
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
              orderState.preparationType === 'meal_box' ? "bg-crisp-carrot text-white" : "bg-card border border-stone/10 text-stone dark:bg-stone-800"
            )}>
              <Package className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-sm font-bold block leading-tight text-deep-forest dark:text-white">{tText('Pre-Pack Box', 'Set Box / Bungkus')}</span>
              <span className="microcopy-12 text-stone/80 font-normal block mt-0.5">{tText('Packed meal boxes', 'Kotak makanan individu')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Quantity Counter */}
      <div className="bg-muted/70 border border-stone/15 dark:border-white/10 p-4 rounded-2xl space-y-3 dark:bg-stone-800/40">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <Label htmlFor="guests-input" className="text-sm font-bold text-deep-forest dark:text-white">
              {tText('Quantity', 'Kuantiti')}
            </Label>
            <span className="microcopy-12 text-stone font-normal block leading-none mt-1">
              {tText('Minimum order: 1 pax.', 'Minima tempahan katering: 1 orang.')}
            </span>
          </div>

          <div className="flex items-center gap-2.5" role="group" aria-label={tText('Quantity', 'Kuantiti')}>
            <button
              type="button"
              aria-label={tText('Decrease quantity', 'Kurangkan kuantiti')}
              onClick={() => adjustGuests(-1)}
              className="w-11 h-11 rounded-xl bg-card dark:bg-stone-800 border border-stone/15 dark:border-white/10 flex items-center justify-center font-bold text-xl hover:border-crisp-carrot hover:text-crisp-carrot cursor-pointer transition-colors shadow-sm select-none active:scale-95 text-deep-forest dark:text-white"
            >
              –
            </button>
            <input
              id="guests-input"
              type="number"
              min="1"
              max="5000"
              inputMode="numeric"
              value={orderState.guests || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setOrderState((prev: any) => ({
                  ...prev,
                  guests: isNaN(val) ? 0 : val
                }));
              }}
              onBlur={() => {
                setOrderState((prev: any) => ({
                  ...prev,
                  guests: prev.guests < 1 ? 1 : prev.guests
                }));
              }}
              aria-label={tText('Number of guests', 'Bilangan tetamu')}
              className="text-lg font-bold text-deep-forest dark:text-white w-20 text-center bg-card dark:bg-stone-800 border border-stone/15 dark:border-white/10 rounded-xl h-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:border-crisp-carrot focus:ring-1 focus:ring-crisp-carrot"
            />
            <button
              type="button"
              aria-label={tText('Increase quantity', 'Tambah kuantiti')}
              onClick={() => adjustGuests(1)}
              className="w-11 h-11 rounded-xl bg-card dark:bg-stone-800 border border-stone/15 dark:border-white/10 flex items-center justify-center font-bold text-xl hover:border-crisp-carrot hover:text-crisp-carrot cursor-pointer transition-colors shadow-sm select-none active:scale-95 text-deep-forest dark:text-white"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <Button
        onClick={() => handleStepNext(1)}
        className="w-full bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm tracking-wide shadow-crisp cursor-pointer transition-all active:scale-[0.99]"
      >
        {tText('Next: Choose Menu', 'Seterusnya: Pilih Menu')}
        <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </motion.div>
  );
}
