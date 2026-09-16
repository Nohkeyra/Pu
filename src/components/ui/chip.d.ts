import * as React from 'react';

/**
 * Props for the Chip component.
 */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Whether the chip is currently active / selected.
   * @default false
   */
  selected?: boolean;

  /**
   * Visual variant of the chip.
   * - `default`: Standard selectable tag pill.
   * - `outline`: Border-based chip with transparent background.
   * - `preset`: Lightweight clickable preset token.
   * @default 'default'
   */
  variant?: 'default' | 'outline' | 'preset';

  /**
   * Size density of the chip.
   * - `xs`: Ultra-compact (text-xs, min-h 24px) for micro note chips.
   * - `sm`: Compact tag (text-xs, min-h 28px).
   * - `md`: Standard filter chip (text-xs, min-h 32px).
   * @default 'xs'
   */
  size?: 'xs' | 'sm' | 'md';
}

/**
 * Chip component representing compact filter tags, preset inputs, or interactive token badges.
 */
export declare const Chip: React.ForwardRefExoticComponent<
  ChipProps & React.RefAttributes<HTMLButtonElement>
>;
