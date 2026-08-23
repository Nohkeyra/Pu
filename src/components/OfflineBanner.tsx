import { useEffect, useState } from "react"
import { WifiOff, Send } from "lucide-react"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { getPendingOrdersCount } from "@/lib/pendingOrdersQueue"
import { cn } from "@/lib/utils"

/**
 * Persistent offline indicator + pending-order count.
 * Toasts are easy to miss — this stays visible until online again.
 * When there are queued orders, a short hint points users to review/send them.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const refresh = () => setPendingCount(getPendingOrdersCount())
    refresh()
    // Re-check when tab becomes visible or storage may have changed
    const onVis = () => refresh()
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("focus", refresh)
    const id = window.setInterval(refresh, 4000)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("focus", refresh)
      window.clearInterval(id)
    }
  }, [isOnline])

  // Online but still has pending orders — soft reminder
  if (isOnline && pendingCount > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "sticky top-0 z-[200] w-full bg-sky-600 text-white px-4 pt-[calc(var(--sat)+10px)] pb-2.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm",
          className
        )}
      >
        <Send className="w-4 h-4 shrink-0" aria-hidden />
        <span>
          {pendingCount} pending order{pendingCount > 1 ? "s" : ""} ready to send
          <span className="hidden sm:inline"> · {pendingCount} pesanan menunggu hantar</span>
        </span>
      </div>
    )
  }

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        "sticky top-0 z-[200] w-full bg-amber-500 text-amber-950 px-4 pt-[calc(var(--sat)+10px)] pb-2.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm",
        className
      )}
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
      <span>
        You’re offline — orders will be saved for later
        {pendingCount > 0 ? ` (${pendingCount} queued)` : ""}
        <span className="hidden sm:inline"> · Anda luar talian</span>
      </span>
    </div>
  )
}
