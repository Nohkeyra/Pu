/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

import { triggerLightImpact } from "@/lib/haptics"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-kiwi/50 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-forest touch-target",
  {
    variants: {
      variant: {
        default:
          "bg-moss text-deep-forest hover:bg-fern hover:shadow-moss-glow",
        destructive:
          "bg-tomato-burst text-deep-forest hover:bg-tomato-burst/90 hover:shadow-tomato-glow",
        outline:
          "border border-deep-forest/15 bg-transparent text-deep-forest hover:bg-deep-forest/5 hover:border-kiwi/40 hover:text-kiwi",
        secondary:
          "bg-forest-green text-deep-forest border border-deep-forest/10 hover:bg-light-forest hover:border-deep-forest/15",
        ghost:
          "text-stone hover:text-kiwi hover:bg-deep-forest/5",
        link:
          "text-kiwi underline-offset-4 hover:underline hover:text-sunshine",
        // Brand-specific variants.
        moss:
          "bg-moss text-deep-forest hover:bg-fern hover:shadow-moss-glow",
        sunshine:
          "bg-sunshine text-deep-forest hover:bg-honey hover:shadow-sunshine-glow font-semibold",
        carrot:
          "bg-crisp-carrot text-deep-forest hover:bg-crisp-carrot/90 hover:shadow-carrot-glow font-semibold",
        kiwi:
          "bg-kiwi text-deep-forest hover:bg-[#8BA803] hover:shadow-kiwi-glow font-semibold",
        tomato:
          "bg-tomato-burst text-deep-forest hover:bg-tomato-burst/90 hover:shadow-tomato-glow",
        "sunshine-outline":
          "border border-sunshine/40 bg-sunshine/5 text-sunshine hover:bg-sunshine/15 hover:border-sunshine/70 hover:shadow-sunshine-glow font-semibold",
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
