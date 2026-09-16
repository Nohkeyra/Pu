import * as React from 'react';
import { cn } from '@/lib/utils';
import { playClickSound } from '@/lib/haptics';

export interface ColorSwatchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  value: string;
  selected?: boolean;
  onSelect?: (colorHex: string) => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ColorSwatch = React.forwardRef<HTMLButtonElement, ColorSwatchProps>(
  (
    {
      value,
      selected = false,
      onSelect,
      title,
      size = 'md',
      className,
      onClick,
      style,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      playClickSound();
      onSelect?.(value);
      onClick?.(e);
    };

    const sizeClasses = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-7 h-7',
    }[size];

    return (
      <button
        ref={ref}
        type="button"
        title={title}
        aria-label={title || `Color ${value}`}
        onClick={handleClick}
        style={{ backgroundColor: value, ...style }}
        className={cn(
          'rounded-full transition-transform cursor-pointer select-none',
          sizeClasses,
          selected
            ? 'ring-2 ring-[var(--color-accent)] scale-110 shadow-2xs'
            : 'opacity-75 hover:opacity-100',
          className
        )}
        {...props}
      />
    );
  }
);

ColorSwatch.displayName = 'ColorSwatch';
