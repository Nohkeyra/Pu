import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  action?: ReactNode
}

/**
 * Consistent error state with optional retry — used for failed fetches / API errors.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Retry",
  className,
  action,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200/60 dark:border-rose-900/40",
        className
      )}
      role="alert"
    >
      <AlertTriangle className="w-9 h-9 text-rose-500 mb-3" aria-hidden />
      <h3 className="text-base font-display font-bold text-deep-forest dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {(onRetry || action) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {onRetry && (
            <Button
              variant="outline"
              size="default"
              onClick={onRetry}
              className="gap-2 min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  )
}
