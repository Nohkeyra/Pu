const DEFAULT_ACCENT = '#a3310e';

export function normalizeAccent(value: string): string {
  const color = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(color)) return color;
  if (/^#[0-9a-f]{3}$/.test(color)) return '#' + color.slice(1).split('').map(channel => channel + channel).join('');
  return DEFAULT_ACCENT;
}

function channels(value: string) {
  const color = normalizeAccent(value);
  return [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255);
}

function luminance(value: string) {
  const [r, g, b] = channels(value).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

/** HSL channel values for consumers that use hsl(var(--ring)), rather than a HEX value. */
export function hexToHslChannels(value: string) {
  const [r, g, b] = channels(value);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return `${Number(hue.toFixed(2))} ${Number((saturation * 100).toFixed(2))}% ${Number((lightness * 100).toFixed(2))}%`;
}

export function getAccentTokens(value: string): Record<string, string> {
  const background = normalizeAccent(value);
  const foreground = contrastRatio(background, '#ffffff') >= contrastRatio(background, '#000000') ? '#ffffff' : '#000000';
  return {
    '--color-sunshine-cta': background,
    '--color-sunshine-cta-bg': background,
    '--color-sunshine-cta-fg': foreground,
    '--color-sunshine-cta-hover': `color-mix(in srgb, ${background} 88%, ${foreground === '#ffffff' ? 'black' : 'white'})`,
    '--color-sunshine-cta-press': `color-mix(in srgb, ${background} 82%, ${foreground === '#ffffff' ? 'black' : 'white'})`,
    '--primary': hexToHslChannels(background),
    '--primary-foreground': hexToHslChannels(foreground),
    '--ring': hexToHslChannels(background),
  };
}
