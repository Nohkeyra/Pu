import React from "react"
import { cn } from "@/lib/utils"

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Shimmer-enhanced skeleton that works seamlessly in light and dark themes.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-stone-200/60 dark:bg-stone-800/60",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.8s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/40 dark:after:via-white/10 after:to-transparent",
        className
      )}
      {...props}
    />
  )
}

/**
 * Geometric skeleton loader specifically designed to match Menu and Dish Selection cards.
 */
export function DishCardSkeleton() {
  return (
    <div className="p-3 rounded-2xl border border-stone-200/60 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/40 flex items-center gap-3">
      <Skeleton className="w-5 h-5 rounded-lg shrink-0" />
      <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4 rounded-md" />
        <Skeleton className="h-2.5 w-1/2 rounded-md" />
      </div>
    </div>
  )
}

/**
 * Geometric skeleton loader matching Admin Order Cards.
 */
export function OrderCardSkeleton() {
  return (
    <div className="p-4 rounded-[22px] bg-white dark:bg-card border border-stone-200/60 dark:border-stone-800 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-12 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-12 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

