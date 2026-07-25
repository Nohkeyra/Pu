import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-deep-forest placeholder:text-stone/55 selection:bg-sunshine/30 selection:text-deep-forest",
        "h-11 w-full min-w-0 rounded-2xl border border-deep-forest/10 bg-white/88 px-4 py-2 text-sm text-deep-forest shadow-sm transition-all duration-300 dark:border-white/10 dark:bg-white/6 dark:text-white",
        "outline-none",
        "focus-visible:border-sunshine/40 focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(253,94,2,0.12)] dark:focus-visible:bg-white/10",
        "aria-invalid:border-tomato-burst aria-invalid:shadow-[0_0_0_3px_rgba(212,37,24,0.12)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "touch-target",
        className
      )}
      {...props}
    />
  )
}

export { Input }
