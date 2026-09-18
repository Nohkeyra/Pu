import { Star, Eye, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLongPress } from '@/hooks/useLongPress';

export function AdminOrderRow({
  style, order, language, isSelected, isStarred, formattedHeaderDate, relativeTime,
  clientName, totalAmount, stripColor, isSelectMode, getStatusBadge,
  handleToggleOrderSelect, setStarredOrderIds, openOrderDetail, openSendDialog, handleDelete,
  setLongPressedOrder
}: any) {
  
  const longPressProps = useLongPress(
    () => { setLongPressedOrder(order); },
    () => { openOrderDetail(order); },
    { delay: 400 }
  );

  return (
    <div style={style} className="px-2 sm:px-3 py-1">
      <div
        {...longPressProps}
        className={`
          relative flex flex-col justify-between gap-1.5 p-2.5 sm:p-3 rounded-lg bg-white dark:bg-card border border-[var(--color-light-forest)] dark:border-stone-800
          cursor-pointer transition-all duration-150
          hover:shadow-xs hover:-translate-y-0.5 select-none
          ${isSelected ? 'ring-1.5 ring-sunshine-cta shadow-xs' : ''}
          ${order.status === 'cancel_requested' ? 'ring-1.5 ring-amber-400/60' : ''}
        `}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${stripColor}`} />

        <div className="flex items-start justify-between gap-1.5 pl-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap pointer-events-none">
              <span className="font-bold text-xs sm:text-[13px] text-[#0c453c] dark:text-emerald-400 leading-tight">
                {formattedHeaderDate}
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">· {relativeTime} ago</span>
              {getStatusBadge(order.status)}
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-[#0c453c] dark:text-stone-100 truncate mt-0.5 leading-snug pointer-events-none">
              {clientName}
            </h3>
            {order.email && (
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0 pointer-events-none">{order.email}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            {isSelectMode ? (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleOrderSelect(order.id)}
                className="w-4 h-4 accent-[#f69913] rounded cursor-pointer"
              />
            ) : (
              <button
                onClick={() => {
                  if (!order.id) return;
                  setStarredOrderIds((prev: Set<string>) => {
                    const next = new Set(prev);
                    if (next.has(order.id!)) {
                      next.delete(order.id!);
                    } else {
                      next.add(order.id!);
                    }
                    return next;
                  });
                }}
                className="p-1 rounded-full hover:bg-[#f69913]/15 dark:hover:bg-stone-800 transition-colors"
              >
                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-[#f69913] text-[#f69913]' : 'text-stone-300 dark:text-stone-600'}`} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pl-1.5">
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="flex flex-col items-center justify-center min-w-[40px] h-8 rounded-lg bg-sunshine/15 dark:bg-sunshine/20 border border-sunshine/30 px-1.5">
              <span className="font-bold text-xs sm:text-sm text-deep-forest dark:text-amber-300 leading-none">{order.quantity ?? '–'}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-deep-forest/70 dark:text-amber-300/80 mt-0.5">pax</span>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider leading-none mb-0.5">Total</p>
              <p className="font-bold text-deep-forest dark:text-emerald-400 text-xs font-sans leading-none">{totalAmount}</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg hover:bg-sunshine/20 dark:hover:bg-stone-800 text-deep-forest dark:text-stone-200"
              onClick={() => openOrderDetail(order)}
              title="View Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg hover:bg-crisp-carrot/20 dark:hover:bg-stone-800 text-deep-forest dark:text-stone-200"
              onClick={() => openSendDialog(order)}
              title="Send Invoice"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg hover:bg-rose-500/15 dark:hover:bg-stone-800 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400"
              onClick={() => order.id && handleDelete(order.id)}
              title={language === 'bm' ? 'Padam Tempahan' : 'Delete Order'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
