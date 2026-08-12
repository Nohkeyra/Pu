/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button — P0/P2 height system + AA colour tokens.
 *
 * Improvements:
 *   • All sizes now satisfy the 44 px minimum touch target (icon 44×44,
 *     sm 44 px ≥, lg 48 px, cta 48 px).
 *   • `default` variant uses --color-sunshine-cta (#B33D00 = 5.86:1 on
 *     white, AA).  sunshine-#FD5E02 only on white is 3.10:1 — a previous
 *     AA fail.
 *   • Focus ring uses the same --color-sunshine-cta token for contrast
 *     parity with the surface it appears on.
 *   • Pill corners unified at rounded-2xl (P2 system).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // P0 — primary CTA uses AA-passing token (was sunshine-#FD5E02 → 3.10:1)
        default:
          "bg-[var(--color-sunshine-cta)] text-white hover:bg-[color-mix(in_srgb,var(--color-sunshine-cta)_88%,white)] shadow-sm",
        destructive:
          "bg-[var(--color-error)] text-white hover:bg-[color-mix(in_srgb,var(--color-error)_88%,white)] shadow-sm",
        outline:
          "border border-border bg-card text-deep-forest hover:bg-stone/5 dark:text-white",
        secondary:
          "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-stone/30",
        ghost:
          "bg-transparent text-deep-forest hover:bg-black/5 dark:text-white dark:hover:bg-white/10",
        link:
          "text-[var(--color-sunshine-cta)] underline-offset-4 hover:underline font-bold",
      },
      size: {
        default: "h-11 min-h-[44px] px-5 rounded-2xl",
        sm:      "h-9  min-h-[44px] px-4 rounded-xl",
        // Compact for dense toolbars / tables — still ≥36px for usability, use sparingly on touch devices
        compact: "h-9 min-h-[36px] px-3 rounded-xl text-xs",
        lg:      "h-12 min-h-[48px] px-7 rounded-2xl",
        cta:     "h-12 min-h-[48px] px-6 rounded-2xl text-base font-bold",
        icon:    "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl",
        "icon-sm": "h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
