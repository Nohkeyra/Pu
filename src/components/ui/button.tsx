/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

import { triggerLightImpact } from "@/lib/haptics"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-sunshine/35 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:focus-visible:ring-offset-background touch-target",
  {
    variants: {
      variant: {
        default:
          "bg-sunshine text-white shadow-sm hover:bg-crisp-carrot hover:shadow-sunshine-glow",
        destructive:
          "bg-tomato-burst text-deep-forest hover:bg-tomato-burst/90 hover:shadow-tomato-glow",
        outline:
          "border border-deep-forest/12 bg-white/75 text-deep-forest shadow-sm hover:border-sunshine/30 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
        secondary:
          "bg-cream-dark text-deep-forest border border-deep-forest/10 hover:bg-cream dark:bg-card dark:text-white dark:hover:bg-white/10",
        ghost:
          "text-stone hover:bg-deep-forest/5 hover:text-deep-forest dark:hover:bg-white/5 dark:hover:text-white",
        link:
          "text-crisp-carrot underline-offset-4 hover:underline hover:text-sunshine",
        // Brand-specific variants.
        moss:
          "bg-moss text-deep-forest hover:bg-fern hover:shadow-kiwi-glow",
        sunshine:
          "bg-sunshine text-white hover:bg-crisp-carrot hover:shadow-sunshine-glow font-semibold",
        carrot:
          "bg-crisp-carrot text-white hover:bg-tomato-burst hover:shadow-carrot-glow font-semibold",
        kiwi:
          "bg-kiwi text-deep-forest hover:bg-[#8BA803] hover:shadow-kiwi-glow font-semibold",
        tomato:
          "bg-tomato-burst text-deep-forest hover:bg-tomato-burst/90 hover:shadow-tomato-glow",
        "sunshine-outline":
          "border border-sunshine/35 bg-sunshine/6 text-crisp-carrot hover:bg-sunshine/12 hover:border-sunshine/60 hover:shadow-sunshine-glow font-semibold",
        "kiwi-outline":
          "border border-kiwi/40 bg-kiwi/5 text-kiwi hover:bg-kiwi/15 hover:border-kiwi/70 hover:shadow-kiwi-glow font-semibold",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        sm: "h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-lg px-8 text-base has-[>svg]:px-6",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerLightImpact();
    if (onClick) {
      onClick(e);
    }
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick}
      {...props}
    />
  )
}

export { Button, buttonVariants }
