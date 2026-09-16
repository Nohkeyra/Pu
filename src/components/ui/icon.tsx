/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import type { LucideIcon, LucideProps } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Standard semantic sizes supported by the design system
 */
export type IconSize = "sm" | "md" | "lg" | number

/**
 * Standard pixel dimensions:
 *   • sm: 16px
 *   • md: 20px (default)
 *   • lg: 24px
 */
export const ICON_SIZES: Record<"sm" | "md" | "lg", number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

/**
 * Props for the Icon wrapper component
 */
export interface IconProps extends Omit<LucideProps, "size"> {
  /**
   * The Lucide icon component to render
   */
  icon: LucideIcon
  /**
   * Semantic size: 'sm' (16px), 'md' (20px), 'lg' (24px), or a numeric pixel value
   * @default 'md'
   */
  size?: IconSize
  /**
   * Icon stroke width
   * @default 1.5
   */
  strokeWidth?: number
  /**
   * Optional accessible label. If omitted, the icon is automatically marked as decorative (`aria-hidden="true"`).
   */
  "aria-label"?: string
}

/**
 * Standardized icon wrapper enforcing consistent dimensions, 1.5px stroke width,
 * and automatic accessibility handling.
 */
export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = "md",
  strokeWidth = 1.5,
  className,
  "aria-label": ariaLabel,
  ...props
}) => {
  const pixelSize = typeof size === "number" ? size : (ICON_SIZES[size] ?? 20)
  const isDecorative = !ariaLabel

  return (
    <IconComponent
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={cn("shrink-0 select-none", className)}
      aria-hidden={isDecorative ? "true" : undefined}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      {...props}
    />
  )
}
