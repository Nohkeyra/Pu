/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Card Variants based on Restoran Wawasan Design System
 * Uses:
 *  - Border radius: --radius-lg (8px)
 *  - Shadows: --shadow-xs, --shadow-sm, --shadow-md
 *  - Colors: --color-surface, --color-bg, --color-border, --color-border-strong
 */
const cardVariants = cva(
  "rounded-lg transition-all duration-200 text-[var(--color-text)] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-xs)]",
        outlined:
          "bg-[var(--color-bg)] border border-[var(--color-border-strong)] shadow-none",
        elevated:
          "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)]",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-4 sm:p-5",
        lg: "p-6 sm:p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
)

/**
 * Props for Card component
 */
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Render as a Slot component to compose with custom elements
   */
  asChild?: boolean
}

/**
 * Card container component conforming to Restoran Wawasan UI specifications
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        ref={ref}
        data-slot="card"
        className={cn(cardVariants({ variant, padding }), className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

/**
 * Props for CardHeader component
 */
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Header section of a Card, providing top padding and divider
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn("flex flex-col space-y-1.5 pb-3 border-b border-[var(--color-border)]/50", className)}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

/**
 * Props for CardTitle component
 */
export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>

/**
 * Standard title inside CardHeader
 */
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="card-title"
      className={cn("font-semibold text-lg leading-tight tracking-tight text-[var(--color-text)]", className)}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

/**
 * Props for CardDescription component
 */
export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

/**
 * Subtitle or secondary description text inside CardHeader
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn("text-sm text-[var(--color-text-soft)]", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

/**
 * Props for CardBody component
 */
export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Main content body section of a Card
 */
const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-body"
      className={cn("pt-3 flex-1", className)}
      {...props}
    />
  )
)
CardBody.displayName = "CardBody"

/**
 * CardContent alias for CardBody for backwards compatibility
 */
const CardContent = CardBody
CardContent.displayName = "CardContent"

/**
 * Props for CardFooter component
 */
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Footer section of a Card, positioned at the bottom with border divider
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn("flex items-center pt-3 mt-auto border-t border-[var(--color-border)]/50", className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardBody, CardContent, CardFooter, cardVariants }
