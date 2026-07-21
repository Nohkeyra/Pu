import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-deep-forest placeholder:text-stone/50 selection:bg-sunshine/30 selection:text-deep-forest",
        "bg-white/5 border-white/10 text-deep-forest",
        "h-11 w-full min-w-0 rounded-lg border px-4 py-2 text-sm",
        "shadow-sm transition-all duration-300",
        "outline-none",
        "focus-visible:border-sunshine/50 focus-visible:bg-white/10 focus-visible:shadow-[0_0_0_3px_rgba(232,144,37,0.15)]",
        "aria-invalid:border-tomato-burst aria-invalid:shadow-[0_0_0_3px_rgba(212,37,24,0.1)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "touch-target",
        className
      )}
      {...props}
    />
  )
}

export { Input }
