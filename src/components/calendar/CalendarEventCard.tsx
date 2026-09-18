import { Clock, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLongPress } from '@/hooks/useLongPress';
import { triggerLightImpact } from '@/lib/haptics';
import { cn } from '@/lib/utils';
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
      <div className="flex items-center justify-between pointer-events-none">
        <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
          #{order.invoiceNo || order.id?.slice(0, 8).toUpperCase()}
        </span>
        <span
          className={cn(
            'text-xs font-extrabold px-2.5 py-0.5 rounded-full capitalize',
            order.status === 'approved' && 'bg-emerald-500 text-white',
            order.status === 'pending' && 'bg-amber-500 text-white',
            order.status === 'billed' && 'bg-blue-600 text-white',
            (order.status as string) === 'completed' && 'bg-stone-600 text-white'
          )}
        >
          {order.status}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2 pointer-events-none">
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

      <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 pointer-events-none">
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
        className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-stone-400 font-medium">
          {tl('Hold for quick actions', 'Tekan lama untuk menu pantas')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await triggerLightImpact();
            onOpenDetails(order);
          }}
          className="text-xs font-bold text-crisp-carrot hover:underline gap-1 p-0 h-auto cursor-pointer"
        >
          {tl('View Details', 'Lihat Butiran')}
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
