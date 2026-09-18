import { Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';

export function AdminMenuItemRow({
  item, tText, badge, displayName, altName, showAltName, isVisible,
  handleToggleAvailable, handleOpenEditModal, handleDeleteItem, setLongPressedItem
}: any) {
  
  const longPressProps = useLongPress(
    () => { setLongPressedItem(item); },
    () => { handleOpenEditModal(item); },
    { delay: 400 }
  );

  return (
    <div 
      {...longPressProps}
      className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-150 select-none cursor-pointer ${
        isVisible 
          ? 'bg-white dark:bg-card border-stone-200/80 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-amber-500/30 hover:shadow-xs' 
          : 'bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/50 dark:border-white/5 opacity-70 hover:opacity-100'
      }`}
    >
      {/* Left: Category Icon & Item Name & Price */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 pointer-events-none">
        {/* Category Accent Indicator */}
        <div 
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-xs font-bold ${badge.colorClass}`}
          title={`${badge.num} - ${badge.name}`}
        >
          {badge.icon}
        </div>

        {/* Name and Price */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <h4 className="text-xs sm:text-[13px] font-bold text-deep-forest dark:text-stone-100 truncate leading-tight">
              {displayName}
            </h4>
            {showAltName && (
              <span className="text-xs text-stone-400 dark:text-stone-500 hidden md:inline truncate max-w-[120px]">
                ({altName})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
              RM {item.price.toFixed(2)}
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">
              • {badge.shortName}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quick Show/Hide Toggle & Action Icons */}
      <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        {/* Show / Hide Toggle Button */}
        <button
          type="button"
          onClick={() => handleToggleAvailable(item)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            isVisible
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-stone-200/60 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-300/60 dark:border-stone-700 hover:bg-stone-200'
          }`}
          title={isVisible ? tText('Click to hide from customer order form', 'Klik untuk sembunyikan daripada pelanggan') : tText('Click to show to customers', 'Klik untuk paparkan kepada pelanggan')}
        >
          {isVisible ? (
            <>
              <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs">{tText('Shown', 'Papar')}</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3 text-stone-500 dark:text-stone-400" />
              <span className="text-xs">{tText('Hidden', 'Sorot')}</span>
            </>
          )}
        </button>

        {/* Edit & Delete Action Buttons */}
        <div className="flex items-center">
          <button
            onClick={() => handleOpenEditModal(item)}
            className="p-1.5 text-stone-400 hover:text-deep-forest dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title={tText('Edit Item', 'Kemas kini Hidangan')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteItem(item.id, displayName)}
            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
            title={tText('Delete Item', 'Padam Hidangan')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
