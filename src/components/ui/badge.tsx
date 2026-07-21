/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-moss text-deep-forest [a&]:hover:bg-fern",
        secondary:
          "border-transparent bg-forest-green text-deep-forest border border-deep-forest/10 [a&]:hover:bg-light-forest",
        destructive:
          "border-transparent bg-tomato-burst text-deep-forest [a&]:hover:bg-tomato-burst/90",
        outline:
          "text-deep-forest border-deep-forest/20 [a&]:hover:bg-deep-forest/5 [a&]:hover:text-kiwi",
        // Brand-specific variants.
        honey:
          "border-transparent bg-honey/15 text-honey border border-honey/20 [a&]:hover:bg-honey/25",
        sage:
          "border-transparent bg-sage/15 text-sage border border-sage/20 [a&]:hover:bg-sage/25",
        sunshine:
          "border-transparent bg-sunshine/15 text-sunshine border border-sunshine/30 [a&]:hover:bg-sunshine/25",
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

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
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
