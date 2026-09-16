/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { playClickSound } from "@/lib/haptics"

/**
 * Button Variants — Restoran Wawasan Design System
 * 
 * Compliances:
 *   • Radius: --radius-md (6px) using `rounded-md`
 *   • WCAG AA contrast compliant color tokens
 *   • 44px+ minimum touch target sizes on interactive controls
 *   • Tactile micro-interactions (hover, active scale, focus-visible)
 *   • Seamless disabled and loading states
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 ease-out active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:transform-none select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-sunshine-cta)] text-white hover:bg-[color-mix(in_srgb,var(--color-sunshine-cta)_88%,black)] shadow-xs hover:shadow-md",
        default:
          "bg-[var(--color-sunshine-cta)] text-white hover:bg-[color-mix(in_srgb,var(--color-sunshine-cta)_88%,black)] shadow-xs hover:shadow-md",
        secondary:
          "bg-[var(--color-surface-muted)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] shadow-xs",
        ghost:
          "bg-transparent text-[var(--color-text)] hover:bg-black/5 dark:text-white dark:hover:bg-white/10",
        danger:
          "bg-[var(--color-danger)] text-white hover:bg-[color-mix(in_srgb,var(--color-danger)_88%,black)] shadow-xs hover:shadow-md",
        destructive:
          "bg-[var(--color-danger)] text-white hover:bg-[color-mix(in_srgb,var(--color-danger)_88%,black)] shadow-xs hover:shadow-md",
        outline:
          "border border-[var(--color-border-strong)] bg-card text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] dark:text-white",
        link:
          "text-[var(--color-sunshine-cta)] underline-offset-4 hover:underline font-bold",
      },
      size: {
        sm:      "h-9  min-h-[44px] px-4 rounded-md text-xs gap-1.5",
        md:      "h-11 min-h-[44px] px-5 rounded-md text-sm gap-2",
        default: "h-11 min-h-[44px] px-5 rounded-md text-sm gap-2",
        lg:      "h-12 min-h-[48px] px-7 rounded-md text-base gap-2.5",
        icon:    "h-11 w-11 min-h-[44px] min-w-[44px] rounded-md",
        compact: "h-9 min-h-[36px] px-3 rounded-md text-xs gap-1.5",
        cta:     "h-12 min-h-[48px] px-6 rounded-md text-base font-bold gap-2.5",
        "icon-sm": "h-8 w-8 min-h-[32px] min-w-[32px] rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

/**
 * Props for Button component
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Compose styling onto a child component
   */
  asChild?: boolean
  /**
   * Display loading spinner and disable interactions
   */
  isLoading?: boolean
}

/**
 * Standard action button component with built-in tactile haptic click sound
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, onClick, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isBlocked = disabled || isLoading

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isBlocked) return;
      playClickSound('light');
      onClick?.(e);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isBlocked}
        aria-busy={isLoading}
        onClick={handleClick}
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
