import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Coffee, Plus, UtensilsCrossed } from 'lucide-react';
import { cn, getAssetUrl } from '@/lib/utils';
import { repairDishImage } from '@/lib/imageRepair';
import { isMenuCutoutImage } from '@/constants/menuImages';

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
    const reduceMotion = useReducedMotion();
    const dishImg = typeof item.image === 'string' && item.image.trim()
      ? repairDishImage(item, { useProxyForExternal: true, noFallback: true })
      : '';
    const imageUrl = dishImg ? getAssetUrl(dishImg) : '';
    const isCutout = isMenuCutoutImage(dishImg);
    const isDrink = String(item.category || '').toLowerCase() === 'drinks';

    return (
      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.972 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 540, damping: 38 }}
        data-tour={dataTour}
        aria-pressed={isSelected}
        aria-label={tText(item.nameEn, item.nameBm) || item.name}
        onClick={onToggle}
        className="customer-menu-card"
      >
        <div className="customer-menu-card-art">
          {imageUrl && failedImage !== imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              width={640}
              height={480}
              className={cn(
                "h-full w-full",
                isCutout ? "object-contain p-1" : item.id === 'nasi_campur' ? "bg-stone-950 object-contain" : "object-cover"
              )}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailedImage(imageUrl)}
            />
          ) : (
            <span className="customer-menu-card-placeholder" aria-hidden="true">
              {isDrink ? <Coffee className="h-5 w-5" /> : <UtensilsCrossed className="h-5 w-5" />}
            </span>
          )}
          <motion.span
            className="customer-menu-card-mark"
            aria-hidden="true"
            initial={false}
            animate={reduceMotion ? { scale: 1, rotate: 0 } : isSelected
              ? { scale: [1, 1.2, 1], rotate: [-9, 5, 0] }
              : { scale: 1, rotate: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {isSelected ? <Check size={16} /> : <Plus size={16} />}
          </motion.span>
        </div>
        <span className="customer-menu-card-name">{tText(item.nameEn, item.nameBm) || item.name}</span>
      </motion.button>
    );
  }
);


