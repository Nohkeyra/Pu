import React from 'react';
import { Check, Coffee, UtensilsCrossed } from 'lucide-react';
import { cn, getAssetUrl } from '@/lib/utils';
import { repairDishImage } from '@/lib/imageRepair';

interface MenuItemCardProps {
  item: any;
  isSelected: boolean;
  onToggle: () => void;
  tText: (en: string, bm: string) => string;
  dataTour?: string;
}

export const MenuItemCard = React.memo(
  function MenuItemCard({ item, isSelected, onToggle, tText, dataTour }: MenuItemCardProps) {
    const [failedImage, setFailedImage] = React.useState<string | null>(null);
    const dishImg = typeof item.image === 'string' && item.image.trim()
      ? repairDishImage(item, { useProxyForExternal: true, noFallback: true })
      : '';
    const imageUrl = dishImg ? getAssetUrl(dishImg) : '';
    const isDrink = String(item.category || '').toLowerCase() === 'drinks';

    return (
      <button
        type="button"
        data-tour={dataTour}
        aria-pressed={isSelected}
        aria-label={tText(item.nameEn, item.nameBm) || item.name}
        onClick={onToggle}
        className={cn(
          "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
          isSelected 
            ? "bg-amber-50 dark:bg-stone-900 border-amber-500 shadow-sm ring-2 ring-amber-500/60"
            : "bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-xs"
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
          {imageUrl && failedImage !== imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              width={640}
              height={480}
              className={cn(
                "h-full w-full transition-transform duration-500",
                item.id === 'nasi_campur' ? "bg-stone-950 object-contain" : "object-cover group-hover:scale-105"
              )}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailedImage(imageUrl)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400" aria-hidden="true">
              {isDrink ? <Coffee className="h-5 w-5" /> : <UtensilsCrossed className="h-5 w-5" />}
            </span>
          )}
          <div className={cn("absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm",
            isSelected ? "border-amber-600 bg-amber-600 text-white" : "border-white/80 bg-white/90 text-stone-600")}>
            {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : <span className="text-lg leading-none" aria-hidden="true">+</span>}
          </div>
        </div>
        <div className="flex min-h-[58px] w-full items-center px-3 py-2.5">
          <span className="block break-words text-sm font-bold leading-snug text-stone-900 dark:text-stone-100">
            {tText(item.nameEn, item.nameBm) || item.name}
          </span>
        </div>
      </button>
    );
  }
);


