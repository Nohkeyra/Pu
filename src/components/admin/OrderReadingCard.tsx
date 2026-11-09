import { MapPin, Users, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDateTimeDisplay } from '@/lib/utils';
import type { Order } from '@/types';
export function OrderReadingCard({
  order,
  language,
  onClose,
}: {
  order: Order | null;
  language: string;
  onClose: () => void;
}) {
  const bm = language === 'bm';
  return (
    <Dialog
      open={Boolean(order)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto bg-background text-foreground p-6 sm:p-10">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold uppercase tracking-wider">
            {bm ? 'Kad Bacaan Besar' : 'Large Reading Card'}
          </DialogTitle>
          <DialogDescription>
            {bm
              ? 'Ringkasan pesanan untuk dibaca dengan jelas.'
              : 'A clear, enlarged order summary.'}
          </DialogDescription>
        </DialogHeader>
        {order && (
          <div className="space-y-7 py-4 break-words">
            <div>
              <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
                {order.name || order.attn || order.to}
              </h2>
              {order.to && order.to !== order.name && (
                <p className="mt-3 text-xl sm:text-2xl opacity-80">{order.to}</p>
              )}
            </div>
            <p className="flex items-center gap-4 text-4xl sm:text-6xl font-bold">
              <Users className="h-9 w-9 shrink-0" aria-hidden="true" />
              {order.quantity ?? order.guests ?? 0}
              <span className="text-xl sm:text-2xl font-medium">{bm ? 'orang' : 'pax'}</span>
            </p>
            <div className="flex items-start gap-3 text-xl sm:text-2xl">
              <MapPin className="h-7 w-7 shrink-0" aria-hidden="true" />
              <p>{order.location || (bm ? 'Lokasi belum diisi' : 'Location not provided')}</p>
            </div>
            <div className="flex items-start gap-3 text-lg sm:text-xl">
              <CalendarDays className="h-6 w-6 shrink-0" aria-hidden="true" />
              <p>{formatDateTimeDisplay(order.dateTime || order.eventDate || order.date)}</p>
            </div>
            {order.menu && (
              <div className="border-t border-border pt-5">
                <h3 className="mb-2 text-sm uppercase tracking-wider opacity-70">Menu</h3>
                <p className="text-xl sm:text-2xl leading-relaxed">{order.menu}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
