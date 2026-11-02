import * as React from 'react';
import { cn } from '@/lib/utils';
import { playClickSound } from '@/lib/haptics';
import './presentation.css';

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
          'app-segmented inline-flex max-w-full flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border border-[rgba(223,113,15,0.20)] dark:border-white/10 bg-[rgba(255,246,228,0.7)] dark:bg-[rgba(25,22,18,0.7)] backdrop-blur-md select-none shadow-sm',
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
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        context.size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-xs sm:text-sm',
        isSelected
          ? 'card-happening bg-white dark:bg-[#221c17] text-[var(--color-sunshine-cta)] dark:text-sunshine shadow-xs font-bold'
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
