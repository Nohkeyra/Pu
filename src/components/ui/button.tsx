/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Button — P0/P2 height system + AA colour tokens.
 *
 * Improvements:
 *   • All sizes satisfy touch target guidelines.
 *   • Active scale feedback (active:scale-[0.98]) for tactile response.
 *   • Built-in `isLoading` support with automatic spinner.
 *   • Focus ring uses --color-sunshine-cta token.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:transform-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-sunshine-cta)] text-white hover:bg-[color-mix(in_srgb,var(--color-sunshine-cta)_88%,white)] shadow-xs hover:shadow-md",
        destructive:
          "bg-[var(--color-error)] text-white hover:bg-[color-mix(in_srgb,var(--color-error)_88%,white)] shadow-xs",
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
        default: "h-11 min-h-[44px] px-5 rounded-2xl gap-2",
        sm:      "h-9  min-h-[44px] px-4 rounded-xl gap-1.5",
        compact: "h-9 min-h-[36px] px-3 rounded-xl text-xs gap-1.5",
        lg:      "h-12 min-h-[48px] px-7 rounded-2xl gap-2.5",
        cta:     "h-12 min-h-[48px] px-6 rounded-2xl text-base font-bold gap-2.5",
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
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isBlocked = disabled || isLoading

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isBlocked}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-1.5 text-current" aria-hidden="true" />
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
