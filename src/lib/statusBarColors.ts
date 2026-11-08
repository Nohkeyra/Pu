/** Status-bar colours always belong to the four-colour Wawasan palette of the active mode. */
export type StatusBarPaletteMode = 'light' | 'dark';

const PALETTES: Record<StatusBarPaletteMode, readonly string[]> = {
  light: ['#FF6B00', '#FFC247', '#268A38', '#FFF8EC'],
  dark: ['#E83D20', '#FFB02E', '#186B45', '#211A19'],
};

function activeMode(): StatusBarPaletteMode {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('light')
    ? 'light'
    : 'dark';
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
}

/** Migrates an existing/legacy hex colour to the corresponding role in the current palette. */
export function normalizeStatusBarColor(color: string, mode: StatusBarPaletteMode = activeMode()): string {
  const target = PALETTES[mode];
  const normalized = color?.trim().toUpperCase() || '';
  if (target.includes(normalized)) return normalized;
  if (!/^#[0-9A-F]{6}$/.test(normalized)) return target[3];

  const chosen = rgb(normalized);
  const all = [...PALETTES.light, ...PALETTES.dark];
  const closest = all.reduce((best, candidate, index) => {
    const channels = rgb(candidate);
    const score = channels.reduce((sum, value, channel) => sum + (value - chosen[channel]) ** 2, 0);
    return score < best.score ? { index, score } : best;
  }, { index: 3, score: Infinity });
  return target[closest.index % 4];
}

/** Choose contrasting system-icon colour for the *normalized* status bar background. */
export function needsDarkStatusBarIcons(color: string, mode?: StatusBarPaletteMode): boolean {
  const hex = normalizeStatusBarColor(color, mode).slice(1);
  const channels = [0, 2, 4].map(offset => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179;
}
