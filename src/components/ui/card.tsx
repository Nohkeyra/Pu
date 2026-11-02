/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Card Variants based on Restoran Wawasan Design System
 * Implements:
 *  - .card-happening for vibrant golden hover glow and organic 24px/28px radii
 *  - .panel-surface for rich custard/espresso backdrop-blur panels
 *  - Responsive padding and splashscreen typography hierarchy
 */
const cardVariants = cva(
  "rounded-2xl sm:rounded-3xl transition-all duration-300 text-[var(--color-text)] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "card-happening",
        happening:
          "card-happening",
        panel:
          "panel-surface",
        outlined:
          "bg-card border border-[rgba(223,113,15,0.22)] dark:border-white/10 shadow-none",
        elevated:
          "card-happening shadow-xl",
      },
      padding: {
        none: "p-0",
        sm: "p-3 sm:p-4",
        md: "p-5 sm:p-6",
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
      className={cn("flex flex-col space-y-1.5 pb-4 border-b border-[rgba(223,113,15,0.14)] dark:border-white/10", className)}
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
      className={cn("font-display font-bold text-lg sm:text-xl leading-tight tracking-tight text-[var(--color-text)] dark:text-[#ede5d8]", className)}
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
      className={cn("text-sm text-[var(--color-text-soft)] dark:text-stone-300/80 leading-relaxed", className)}
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
      className={cn("pt-4 flex-1", className)}
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
      className={cn("flex items-center pt-4 mt-auto border-t border-[rgba(223,113,15,0.14)] dark:border-white/10", className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardBody, CardContent, CardFooter, cardVariants }
