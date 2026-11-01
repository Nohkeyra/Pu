import { describe, expect, it } from 'vitest';
import { contrastRatio, getAccentTokens, hexToHslChannels, normalizeAccent } from './uiColors';

describe('custom accent colors', () => {
  it.each(['#a3310e', '#f69913', '#0c453c', '#e96212', '#e03f14', '#777777', '#ffffff', '#000000'])('keeps primary text legible on %s', background => {
    const tokens = getAccentTokens(background);
    expect(contrastRatio(background, tokens['--color-sunshine-cta-fg'])).toBeGreaterThanOrEqual(4.5);
    expect(tokens['--ring']).toMatch(/^\d+(?:\.\d+)? \d+(?:\.\d+)?% \d+(?:\.\d+)?%$/);
    expect(tokens['--ring']).not.toContain('#');
  });

  it('converts achromatic and primary colors without invalid channels', () => {
    expect(hexToHslChannels('#fff')).toBe('0 0% 100%');
    expect(hexToHslChannels('#000')).toBe('0 0% 0%');
    expect(hexToHslChannels('#ff0000')).toBe('0 100% 50%');
  });

  it('normalizes short hex and rejects malformed persisted values', () => {
    expect(normalizeAccent(' #AbC ')).toBe('#aabbcc');
    expect(normalizeAccent('#not-a-color')).toBe('#a3310e');
    expect(normalizeAccent('red; display:none')).toBe('#a3310e');
  });
});
