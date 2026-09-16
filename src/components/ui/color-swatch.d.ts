import * as React from 'react';

/**
 * Props for the ColorSwatch component.
 */
export interface ColorSwatchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  /**
   * Hex color value (e.g. `#C2932D`).
   */
  value: string;

  /**
   * Whether this swatch is currently selected.
   * @default false
   */
  selected?: boolean;

  /**
   * Callback fired when this swatch is clicked.
   */
  onSelect?: (colorHex: string) => void;

  /**
   * Accessible tooltip / title label for the swatch.
   */
  title?: string;

  /**
   * Size token for the swatch circle.
   * - `sm`: w-5 h-5 (20px).
   * - `md`: w-6 h-6 (24px).
   * - `lg`: w-7 h-7 (28px).
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ColorSwatch circle button for theme and accent palette selection.
 */
export declare const ColorSwatch: React.ForwardRefExoticComponent<
  ColorSwatchProps & React.RefAttributes<HTMLButtonElement>
>;
