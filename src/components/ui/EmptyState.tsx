import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Inbox } from "lucide-react"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Consistent empty state used across admin lists, profile orders, calendar, etc.
 * Keeps spacing, typography and hierarchy refined and responsive everywhere.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 bg-stone-50/70 dark:bg-stone-900/40 rounded-3xl border border-dashed border-stone-300/70 dark:border-stone-700/60 shadow-inner relative overflow-hidden",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
        {icon ?? <Inbox className="w-7 h-7 opacity-85" aria-hidden />}
      </div>
      <h3 className="text-base sm:text-lg font-display font-bold text-deep-forest dark:text-stone-100 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex items-center justify-center gap-3">{action}</div>}
    </div>
  )
}

