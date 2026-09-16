import * as React from 'react';
import { cn } from '@/lib/utils';
import { playClickSound } from '@/lib/haptics';

interface SegmentedControlContextValue {
  value?: string;
  onValueChange?: (val: string) => void;
  size?: 'sm' | 'md';
}

const SegmentedControlContext = React.createContext<SegmentedControlContextValue>({});

export interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: 'sm' | 'md';
}

export function SegmentedControl({
  value,
  onValueChange,
  size = 'md',
  className,
  children,
  ...props
}: SegmentedControlProps) {
  return (
    <SegmentedControlContext.Provider value={{ value, onValueChange, size }}>
      <div
        role="tablist"
        className={cn(
          'inline-flex items-center p-1 rounded-xl bg-[var(--color-surface-muted)] select-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  );
}

export interface SegmentedControlItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  active?: boolean;
}

export const SegmentedControlItem = React.forwardRef<
  HTMLButtonElement,
  SegmentedControlItemProps
>(({ value, active, className, onClick, children, ...props }, ref) => {
  const context = React.useContext(SegmentedControlContext);
  const isSelected = active !== undefined ? active : context.value === value;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClickSound();
    if (context.onValueChange) {
      context.onValueChange(value);
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-bold transition-all duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-50',
        context.size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
        isSelected
          ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-2xs font-bold'
          : 'text-[var(--color-text-soft)] hover:text-[var(--color-text)] font-medium',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

SegmentedControlItem.displayName = 'SegmentedControlItem';
