import React from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end' | 'between';
  stackOnMobile?: boolean;
  children: React.ReactNode;
}

/**
 * Responsive container wrapper for action buttons across views.
 * Ensures buttons stack neatly on mobile (col) and flow in flex rows on larger screens (sm+),
 * eliminating floating buttons, orphan controls, or squished touch targets.
 */
export const ResponsiveButtonGroup: React.FC<ResponsiveButtonGroupProps> = ({
  align = 'end',
  stackOnMobile = true,
  className,
  children,
  ...props
}) => {
  const alignClasses = {
    start: 'sm:justify-start',
    center: 'sm:justify-center',
    end: 'sm:justify-end',
    between: 'sm:justify-between',
  }[align];

  return (
    <div
      className={cn(
        'w-full flex gap-2.5 sm:gap-3 transition-all',
        stackOnMobile ? 'flex-col sm:flex-row items-stretch sm:items-center' : 'flex-row items-center flex-wrap',
        alignClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface ResponsiveToggleRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Responsive layout container for toggle switches and settings rows.
 * Guarantees vertical alignment of labels and switches across viewports.
 */
export const ResponsiveToggleRow: React.FC<ResponsiveToggleRowProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-between gap-4 py-3 px-4 rounded-2xl border border-border/60 bg-card/40 dark:bg-card/60 transition-colors hover:border-border/90 hover:bg-card/80 min-h-[56px]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface ResponsiveGridGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4;
  children: React.ReactNode;
}

/**
 * Grid-based responsive wrapper for button sets (e.g., language toggles, font-size selectors, view modes).
 */
export const ResponsiveGridGroup: React.FC<ResponsiveGridGroupProps> = ({
  columns = 2,
  className,
  children,
  ...props
}) => {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[columns];

  return (
    <div className={cn('grid gap-2.5 w-full', colClasses, className)} {...props}>
      {children}
    </div>
  );
};

export default ResponsiveButtonGroup;
