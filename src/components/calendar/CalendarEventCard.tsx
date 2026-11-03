import { Clock, MapPin, ArrowRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLongPress } from '@/hooks/useLongPress';
import { triggerLightImpact } from '@/lib/haptics';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import type { Order } from '@/types';

interface CalendarEventCardProps {
  order: Order;
  isAdmin: boolean;
  language: 'en' | 'bm';
  tl: (en: string, bm: string) => string;
  totalPax: number;
  eventTime: string;
  onOpenDetails: (order: Order) => void;
  onLongPress: (order: Order) => void;
}

export function CalendarEventCard({
  order,
  isAdmin,
  language,
  tl,
  totalPax,
  eventTime,
  onOpenDetails,
  onLongPress
}: CalendarEventCardProps) {
  const longPressProps = useLongPress(
    () => {
      onLongPress(order);
    },
    async () => {
      await triggerLightImpact();
      onOpenDetails(order);
    },
    { delay: 400 }
  );

  return (
    <div
      {...longPressProps}
      className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/60 hover:border-crisp-carrot/50 transition-all space-y-2.5 shadow-2xs select-none cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
          #{order.invoiceNo || order.id?.slice(0, 8).toUpperCase()}
        </span>
        <OrderStatusBadge status={order.status} language={language} />
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h5 className="font-bold text-sm text-stone-900 dark:text-stone-100">
            {isAdmin ? (order.to || order.name) : tl('Corporate Catering Session', 'Sesi Katering Korporat')}
          </h5>
          {order.company && order.company !== order.to && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{order.company}</p>
          )}
        </div>

        <span className="text-xs font-black text-stone-900 dark:text-stone-100 tabular-nums shrink-0 px-2.5 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
          {totalPax} {tl('Pax', 'Orang')}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>{eventTime}</span>
        </div>
        {order.location && (
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{order.location}</span>
          </div>
        )}
      </div>

      <div
        className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap justify-between items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
          {tl('Hold for quick actions', 'Tekan lama untuk menu pantas')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              await triggerLightImpact();
              onLongPress(order);
            }}
            className="min-h-11 px-2 text-xs font-semibold text-stone-700 dark:text-stone-200"
            aria-label={tl('Open quick actions', 'Buka tindakan pantas')}
          >
            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>{tl('Actions', 'Tindakan')}</span>
          </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await triggerLightImpact();
            onOpenDetails(order);
          }}
          className="text-xs font-bold text-crisp-carrot hover:underline gap-1 px-2 min-h-11 cursor-pointer"
        >
          {tl('View Details', 'Lihat Butiran')}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
        </div>
      </div>
    </div>
  );
}
