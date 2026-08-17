import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitives.Root> {
  size?: "default" | "sm" | "lg"
}

function Switch({
  className,
  size = "default",
  ...props
}: SwitchProps) {
  const sizeClasses = {
    sm: "h-4 w-7",
    default: "h-5 w-9",
    lg: "h-6 w-11",
  }
  const thumbClasses = {
    sm: "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5",
    default: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
    lg: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
  }

  return (
    <SwitchPrimitives.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-all duration-200 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none data-[state=checked]:bg-[var(--color-sunshine-cta)] data-[state=unchecked]:bg-stone-300 dark:data-[state=unchecked]:bg-stone-700 hover:brightness-105",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out",
          thumbClasses[size]
        )}
      />
    </SwitchPrimitives.Root>
  )
}

export { Switch }
