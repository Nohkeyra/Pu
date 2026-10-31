import { Star, Eye, Send, Trash2, CalendarDays, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLongPress } from '@/hooks/useLongPress';

import type { Order } from '@/types';

interface AdminOrderRowProps {
  style: React.CSSProperties;
  order: Order;
  language: string;
  isSelected: boolean;
  isStarred: boolean;
  formattedHeaderDate: string;
  relativeTime: string;
  clientName: string;
  totalAmount: string;
  stripColor: string;
  isSelectMode: boolean;
  getStatusBadge: (status?: string) => React.ReactNode;
  handleToggleOrderSelect: (id?: string) => void;
  setStarredOrderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  openOrderDetail: (order: Order) => void;
  openSendDialog: (order: Order) => void;
  handleDelete: (id: string) => void;
  setLongPressedOrder: (order: Order | null) => void;
}

export function AdminOrderRow({
  style, order, language, isSelected, isStarred, formattedHeaderDate, relativeTime,
  clientName, totalAmount, stripColor, isSelectMode, getStatusBadge,
  handleToggleOrderSelect, setStarredOrderIds, openOrderDetail, openSendDialog, handleDelete,
  setLongPressedOrder
}: AdminOrderRowProps) {
  
  const longPressProps = useLongPress(
    () => { setLongPressedOrder(order); },
    () => { openOrderDetail(order); },
    { delay: 400 }
  );

  return (
    <div style={style} className="px-2 sm:px-3 py-1.5">
      <div
        {...longPressProps}
        className={`relative flex h-full flex-col justify-between gap-2 overflow-hidden rounded-2xl border border-stone-200 bg-white px-4 py-3 pl-5 shadow-sm transition-colors hover:border-amber-400/60 dark:border-white/10 dark:bg-card ${isSelected ? 'ring-2 ring-sunshine-cta' : ''} ${order.status === 'cancel_requested' ? 'ring-2 ring-amber-400/60' : ''}`}
      >
        <div className={`absolute inset-y-0 left-0 w-1 ${stripColor}`} />
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{formattedHeaderDate}
            </span>
            {getStatusBadge(order.status)}
          </div>
          <div className="shrink-0" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            {isSelectMode ? (
              <input type="checkbox" checked={isSelected} onChange={() => handleToggleOrderSelect(order.id)}
                aria-label={`${language === 'bm' ? 'Pilih pesanan' : 'Select order'} ${clientName}`}
                className="h-5 w-5 cursor-pointer accent-[#f69913]" />
            ) : (
              <button type="button" onClick={() => {
                if (!order.id) return;
                setStarredOrderIds(prev => {
                  const next = new Set(prev);
                  if (next.has(order.id!)) next.delete(order.id!); else next.add(order.id!);
                  return next;
                });
              }} aria-label={language === 'bm' ? (isStarred ? 'Buang tanda penting' : 'Tanda penting') : (isStarred ? 'Remove star' : 'Star order')}
                aria-pressed={isStarred} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-amber-500/10">
                <Star className={`h-4 w-4 ${isStarred ? 'fill-amber-500 text-amber-500' : 'text-stone-400'}`} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold leading-snug text-deep-forest dark:text-stone-50">{clientName}</h3>
          {order.email && <p className="truncate text-xs text-stone-500 dark:text-stone-400">{order.email}</p>}
          <span className="sr-only">{relativeTime} {language === 'bm' ? 'yang lalu' : 'ago'}</span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />{order.quantity ?? '–'} {language === 'bm' ? 'orang' : 'pax'}
            </span>
            <span className="truncate text-xs font-bold text-deep-forest dark:text-emerald-400">{totalAmount}</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button size="sm" onClick={() => openOrderDetail(order)}
              className="min-h-[40px] rounded-xl bg-[#c94b16] px-2.5 text-xs font-bold text-white hover:bg-[#aa3d10]"
              aria-label={`${language === 'bm' ? 'Lihat butiran' : 'View details'} ${clientName}`}>
              <Eye className="mr-1 h-4 w-4" aria-hidden="true" /><span>{language === 'bm' ? 'Lihat' : 'View'}</span>
            </Button>
            <Button size="icon" variant="ghost" className="h-10 w-10 text-stone-600 dark:text-stone-300" onClick={() => openSendDialog(order)}
              aria-label={language === 'bm' ? 'Hantar invois' : 'Send invoice'} title={language === 'bm' ? 'Hantar invois' : 'Send invoice'}>
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="icon" variant="ghost" className="h-10 w-10 text-stone-500 hover:text-rose-600 dark:text-stone-400" onClick={() => order.id && handleDelete(order.id)}
              aria-label={language === 'bm' ? 'Padam tempahan' : 'Delete order'} title={language === 'bm' ? 'Padam tempahan' : 'Delete order'}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
