import * as React from 'react';

/**
 * Props for the SegmentedControl wrapper.
 */
export interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Currently active value.
   */
  value?: string;

  /**
   * Callback invoked when an item is selected.
   */
  onValueChange?: (value: string) => void;

  /**
   * Size density.
   * - `sm`: Compact size (padding px-2.5 py-1, text-xs).
   * - `md`: Standard size (padding px-3 py-1.5, text-xs).
   * @default 'md'
   */
  size?: 'sm' | 'md';
}

/**
 * Props for each SegmentedControlItem.
 */
export interface SegmentedControlItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /**
   * Unique identifier value for this segmented option.
   */
  value: string;

  /**
   * Explicit active state override if not governed by context.
   */
  active?: boolean;
}

/**
 * SegmentedControl container component providing pill track and selection context.
 */
export declare function SegmentedControl(
  props: SegmentedControlProps
): React.ReactElement;

/**
 * SegmentedControl item button representing one mutual-exclusive option.
 */
export declare const SegmentedControlItem: React.ForwardRefExoticComponent<
  SegmentedControlItemProps & React.RefAttributes<HTMLButtonElement>
>;
