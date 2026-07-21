import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-white/10 placeholder:text-stone/50 selection:bg-sunshine/30 selection:text-deep-forest",
        "bg-white/5 text-deep-forest",
        "flex field-sizing-content min-h-20 w-full rounded-lg border px-4 py-3 text-sm",
        "shadow-sm transition-all duration-300 outline-none",
        "focus-visible:border-sunshine/50 focus-visible:bg-white/10 focus-visible:shadow-[0_0_0_3px_rgba(232,144,37,0.15)]",
        "aria-invalid:border-tomato-burst aria-invalid:shadow-[0_0_0_3px_rgba(212,37,24,0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
