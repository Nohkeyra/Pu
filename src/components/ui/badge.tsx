/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge Variants adhering to Restoran Wawasan Semantic Color Tokens
 * Supports standard semantic variants: default, secondary, success, warning, danger, outline
 * as well as legacy brand-palette tokens.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow,background-color] overflow-hidden",
  {
    variants: {
      variant: {
        // Standard semantic variants
        default:
          "border-transparent bg-[var(--color-accent)] text-white [a&]:hover:bg-[var(--color-accent-deep)]",
        secondary:
          "border-transparent bg-[var(--color-surface-muted)] text-[var(--color-text)] border border-[var(--color-border)] [a&]:hover:bg-[var(--color-surface)]",
        success:
          "border-transparent bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]/20 [a&]:hover:bg-[var(--color-success-soft)]/80",
        warning:
          "border-transparent bg-[var(--color-warning-soft)] text-[var(--color-accent-deep)] border border-[var(--color-warning)]/30 [a&]:hover:bg-[var(--color-warning-soft)]/80",
        danger:
          "border-transparent bg-[var(--color-error-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 [a&]:hover:bg-[var(--color-error-soft)]/80",
        destructive:
          "border-transparent bg-[var(--color-error-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 [a&]:hover:bg-[var(--color-error-soft)]/80",
        outline:
          "bg-transparent text-[var(--color-text)] border border-[var(--color-border)] [a&]:hover:bg-[var(--color-surface-muted)]",
        
        // Brand-specific variants
        honey:
          "border-transparent bg-honey/15 text-honey border border-honey/20 [a&]:hover:bg-honey/25",
        sage:
          "border-transparent bg-forest-green/15 text-forest-green border border-forest-green/20 [a&]:hover:bg-forest-green/25",
        sunshine:
          "border-transparent bg-[var(--color-sunshine-cta)]/15 text-[var(--color-sunshine-cta)] border border-[var(--color-sunshine-cta)]/30 [a&]:hover:bg-[var(--color-sunshine-cta)]/25",
        kiwi:
          "border-transparent bg-kiwi/15 text-kiwi border border-kiwi/30 [a&]:hover:bg-kiwi/25",
        carrot:
          "border-transparent bg-crisp-carrot/15 text-crisp-carrot border border-crisp-carrot/30 [a&]:hover:bg-crisp-carrot/25",
        tomato:
          "border-transparent bg-tomato-burst/15 text-tomato-burst border border-tomato-burst/30 [a&]:hover:bg-tomato-burst/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Props for Badge component
 */
export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /**
   * Render as child slot component
   */
  asChild?: boolean
}

/**
 * Badge tag/indicator component for status and categorization
 */
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
