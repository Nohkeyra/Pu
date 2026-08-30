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
        onClick={onToggle}
        className={cn(
          "p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all duration-200 select-none hover:shadow-md active:scale-[0.98]",
          isSelected 
            ? "bg-crisp-carrot/10 dark:bg-crisp-carrot/15 border-crisp-carrot shadow-sm ring-1 ring-crisp-carrot/20" 
            : "bg-white dark:bg-stone-900/40 hover:bg-stone-50 dark:hover:bg-stone-800/60 border-stone/10 dark:border-white/5 shadow-sm"
        )}
      >
        <div className={cn(
          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 shadow-inner",
          isSelected ? "bg-crisp-carrot border-crisp-carrot text-white scale-110" : "border-stone/20 bg-stone-50 dark:bg-stone-800"
        )}>
          {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
        </div>
        
        <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 border-2 border-white dark:border-stone-700 shadow-md relative group-hover:border-crisp-carrot/30 transition-colors">
          <img
            src={getAssetUrl(dishImg || '/assets/dishes/vector/nasi_lemak.jpg')}
            alt={tText(item.nameEn, item.nameBm)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getAssetUrl('/assets/dishes/vector/nasi_lemak.jpg');
            }}
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-full" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-black block text-charcoal dark:text-white truncate uppercase tracking-tight leading-tight">
            {tText(item.nameEn, item.nameBm)}
          </span>
          {(item.descBm || item.descEn) && (
            <span className="text-[10px] text-stone-600 dark:text-stone-400 block line-clamp-2 font-medium leading-tight mt-0.5">
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

