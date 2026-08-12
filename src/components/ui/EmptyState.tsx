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
 * Keeps spacing, typography and hierarchy the same everywhere.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-6 bg-stone/5 dark:bg-white/5 rounded-2xl border border-dashed border-stone/20 dark:border-white/10",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 text-stone-400 dark:text-stone-500">
        {icon ?? <Inbox className="w-10 h-10 opacity-70" aria-hidden />}
      </div>
      <h3 className="text-base font-display font-bold text-deep-forest dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
