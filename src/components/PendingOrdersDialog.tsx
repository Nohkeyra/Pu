import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Trash2, AlertTriangle, WifiOff } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { getApiUrl } from '@/lib/api';
import { safeJsonStringify, cn } from '@/lib/utils';
import { triggerNotification, NotificationType } from '@/lib/haptics';
import {
  getPendingOrders,
  removePendingOrder,
  type PendingOrder,
} from '@/lib/pendingOrdersQueue';

// F-OFFLINE (audit 2026-08-11): shown when connectivity returns and the
// queue (src/lib/pendingOrdersQueue.ts) is non-empty. Deliberately NOT
// auto-flushed — an order queued while offline may now be for a date/time
// that has already passed, so the customer reviews and confirms each one
// individually rather than the app silently re-submitting stale bookings.
interface PendingOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ItemStatus = 'idle' | 'sending' | 'sent' | 'failed';

function isEventInPast(orderPayload: Record<string, unknown>): boolean {
  const dateTime = orderPayload?.dateTime;
  if (typeof dateTime !== 'string') return false;
  const eventDate = new Date(dateTime);
  if (isNaN(eventDate.getTime())) return false;
  return eventDate.getTime() < Date.now();
}

export function PendingOrdersDialog({ open, onOpenChange }: PendingOrdersDialogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const [items, setItems] = useState<PendingOrder[]>([]);
  const [statusByKey, setStatusByKey] = useState<Record<string, ItemStatus>>({});

  // Refresh the list every time the dialog is opened — the queue can only
  // change via this dialog or a fresh submit failure, so re-reading on open
  // is enough; no need for a live subscription.
  useEffect(() => {
    if (open) {
      setItems(getPendingOrders());
      setStatusByKey({});
    }
  }, [open]);

  const handleSend = async (item: PendingOrder) => {
    setStatusByKey((prev) => ({ ...prev, [item.idempotencyKey]: 'sending' }));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      let response: Response;
      try {
        response = await fetch(getApiUrl('/api/orders'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify(item.orderPayload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`Submission failed with status: ${response.status}`);
      }

      // Success — the server's idempotencyKey handling means this is safe
      // even if an earlier attempt had actually landed.
      removePendingOrder(item.idempotencyKey);
      setItems((prev) => prev.filter((i) => i.idempotencyKey !== item.idempotencyKey));
      setStatusByKey((prev) => ({ ...prev, [item.idempotencyKey]: 'sent' }));
      triggerNotification(NotificationType.Success);
      toast({
        title: tText('Order Sent', 'Tempahan Dihantar'),
        description: tText(
          `Booking for ${String(item.orderPayload.to || '')} has been sent.`,
          `Tempahan untuk ${String(item.orderPayload.to || '')} telah dihantar.`
        ),
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to send queued order:', err);
      setStatusByKey((prev) => ({ ...prev, [item.idempotencyKey]: 'failed' }));
      triggerNotification(NotificationType.Error);
      toast({
        title: tText('Still Couldn\'t Send', 'Masih Gagal Dihantar'),
        description: tText(
          'Connection may still be unstable. It will stay saved — try again shortly.',
          'Sambungan mungkin masih tidak stabil. Ia akan kekal disimpan — cuba lagi sebentar lagi.'
        ),
        variant: 'error',
      });
    }
  };

  const handleDiscard = (item: PendingOrder) => {
    removePendingOrder(item.idempotencyKey);
    setItems((prev) => prev.filter((i) => i.idempotencyKey !== item.idempotencyKey));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-crisp-carrot" />
            {tText('Orders Waiting to Send', 'Tempahan Menunggu Dihantar')}
          </DialogTitle>
          <DialogDescription>
            {tText(
              'These orders couldn\'t be sent while you were offline. Review each one and choose to send or discard it.',
              'Tempahan ini tidak dapat dihantar semasa anda offline. Semak setiap satu dan pilih untuk hantar atau buang.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-stone text-center py-4">
              {tText('Nothing pending.', 'Tiada tempahan tertangguh.')}
            </p>
          )}

          {items.map((item) => {
            const status = statusByKey[item.idempotencyKey] || 'idle';
            const stale = isEventInPast(item.orderPayload);
            const company = String(item.orderPayload.to || '');
            const eventDate = String(item.orderPayload.date || '');
            const eventTime = String(item.orderPayload.time || '');
            const guests = item.orderPayload.quantity;

            return (
              <div
                key={item.idempotencyKey}
                className="border border-stone/15 dark:border-white/10 rounded-2xl p-4 bg-muted/50 space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-deep-forest dark:text-white truncate">{company || tText('Private Event', 'Majlis Persendirian')}</p>
                    <p className="text-xs text-stone">
                      {eventDate} @ {eventTime} · {String(guests ?? '')} {tText('pax', 'orang')}
                    </p>
                  </div>
                  {stale && (
                    <span className="inline-flex items-center gap-1 microcopy-12 font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                      {tText('Date passed', 'Tarikh telah lepas')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleSend(item)}
                    disabled={status === 'sending' || status === 'sent'}
                    className={cn(
                      'flex-1 h-10 rounded-xl text-xs font-bold',
                      stale ? 'bg-stone/40 hover:bg-stone/50 text-white' : 'bg-crisp-carrot hover:bg-crisp-carrot/90 text-white'
                    )}
                  >
                    {status === 'sending' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        <span>{tText('Send Now', 'Hantar Sekarang')}</span>
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDiscard(item)}
                    disabled={status === 'sending'}
                    variant="outline"
                    className="h-10 rounded-xl text-xs font-bold border-stone/20 text-stone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {tText('Close', 'Tutup')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PendingOrdersDialog;
