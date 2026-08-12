import { cn } from "@/lib/utils"

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Neutral skeleton that works in both light and dark themes.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-stone/15 dark:bg-white/10 border border-stone/10 dark:border-white/5",
        className
      )}
      {...props}
    />
  )
}
