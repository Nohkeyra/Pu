import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-deep-forest placeholder:text-stone/80 dark:placeholder:text-stone-300/70 selection:bg-[var(--color-sunshine-cta)]/30 selection:text-deep-forest",
        "h-11 w-full min-w-0 rounded-2xl border border-deep-forest/20 bg-white/95 px-4 py-2 text-sm text-deep-forest font-medium shadow-sm transition-all duration-300 dark:border-white/15 dark:bg-[#1a2420] dark:text-[#ede5d8]",
        "outline-none",
        "focus-visible:border-[var(--color-sunshine-cta)]/40 focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(224,63,20,0.15)] dark:focus-visible:bg-white/10",
        "aria-invalid:border-tomato-burst aria-invalid:shadow-[0_0_0_3px_rgba(224,63,20,0.18)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "touch-target",
        className
      )}
      {...props}
    />
  )
}

export { Input }
