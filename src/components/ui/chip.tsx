import * as React from 'react';
import { cn } from '@/lib/utils';
import { playClickSound } from '@/lib/haptics';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  variant?: 'default' | 'outline' | 'preset';
  size?: 'xs' | 'sm' | 'md';
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      selected = false,
      variant = 'default',
      size = 'xs',
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      playClickSound();
      onClick?.(e);
    };

    const sizeClasses = {
      xs: 'text-xs px-2 py-0.5 min-h-[24px]',
      sm: 'text-xs px-2.5 py-1 min-h-[28px]',
      md: 'text-xs px-3 py-1.5 min-h-[32px]',
    }[size];

    const variantClasses = {
      default: selected
        ? 'bg-[var(--color-accent)] text-white shadow-xs font-bold'
        : 'bg-[var(--color-surface-muted)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-medium',
      preset:
        'bg-[var(--color-surface-muted)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-medium active:scale-95',
      outline: selected
        ? 'border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold'
        : 'border border-[var(--color-border)] bg-transparent text-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)]',
    }[variant];

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50',
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Chip.displayName = 'Chip';
