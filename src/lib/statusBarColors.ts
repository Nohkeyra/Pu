const DEFAULT_STATUS_BAR_COLOR = '#a3310e';

export function normalizeStatusBarColor(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_STATUS_BAR_COLOR;
}

/** Choose the higher-contrast icon color for a solid sRGB background. */
export function needsDarkStatusBarIcons(color: string): boolean {
  const hex = normalizeStatusBarColor(color).slice(1);
  const channels = [0, 2, 4].map(offset => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179;
}
