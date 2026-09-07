import React from 'react';
import { Check } from 'lucide-react';
import { cn, getAssetUrl } from '@/lib/utils';
import { repairDishImage } from '@/lib/imageRepair';

interface MenuItemCardProps {
  item: any;
  isSelected: boolean;
  onToggle: () => void;
  tText: (en: string, bm: string) => string;
}

export const MenuItemCard = React.memo(
  function MenuItemCard({ item, isSelected, onToggle, tText }: MenuItemCardProps) {
    const dishImg = repairDishImage(item, { useProxyForExternal: true });

    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`${tText(item.nameEn, item.nameBm)}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          "p-3.5 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all duration-200 select-none min-h-[68px] hover:shadow-md active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500",
          isSelected 
            ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 shadow-sm ring-1 ring-amber-500/30" 
            : "bg-white dark:bg-stone-900/60 hover:bg-stone-50/80 dark:hover:bg-stone-800/80 border-stone-200/90 dark:border-stone-800 shadow-xs"
        )}
      >
        <div className={cn(
          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 shadow-inner",
          isSelected ? "bg-amber-600 border-amber-600 text-white scale-110" : "border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
        )}>
          {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
        </div>
        
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-950 shrink-0 border border-stone-200/80 dark:border-stone-700/80 shadow-sm relative group-hover:border-amber-400/50 transition-colors">
          <img
            src={getAssetUrl(dishImg || '/assets/dishes/vector/nasi_lemak.jpg')}
            alt={tText(item.nameEn, item.nameBm)}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getAssetUrl('/assets/dishes/vector/nasi_lemak.jpg');
            }}
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-xl" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-black block text-stone-900 dark:text-stone-100 truncate uppercase tracking-tight leading-tight">
            {tText(item.nameEn, item.nameBm)}
          </span>
          {(item.descBm || item.descEn) && (
            <span className="text-[11px] text-stone-600 dark:text-stone-300 block line-clamp-2 font-normal leading-relaxed mt-0.5">
              {tText(item.descEn, item.descBm)}
            </span>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.item.id === next.item.id &&
      prev.item.available === next.item.available
    );
  }
);

