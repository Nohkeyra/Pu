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
          "group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none",
          isSelected 
            ? "bg-[#fbf0df] dark:bg-[#272522] border-orange-600 shadow-sm ring-1 ring-orange-600"
            : "bg-[#fbf4e9] dark:bg-[#272522] hover:bg-[#f8ead5] dark:hover:bg-stone-800 border-[#eadbc7] dark:border-stone-700 shadow-sm"
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f2e5d2] dark:bg-stone-800">
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
            isSelected ? "border-orange-600 bg-orange-600 text-white" : "border-white/80 bg-white/90 text-stone-700")}>
            {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : <span className="text-lg leading-none" aria-hidden="true">+</span>}
          </div>
        </div>
        <div className="flex min-h-[70px] w-full flex-col items-start justify-center gap-1.5 px-3.5 py-3">
          <span className="block break-words font-serif text-base font-bold leading-snug text-stone-900 dark:text-stone-100">{tText(item.nameEn, item.nameBm) || item.name}</span>
          {isSelected && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-100"><Check className="h-3 w-3" aria-hidden="true" />{tText('Selected', 'Dipilih')}</span>}
        </div>
      </button>
    );
  }
);


