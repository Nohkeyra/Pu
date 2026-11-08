import { describe, expect, it } from 'vitest';
import { normalizeStatusBarColor, needsDarkStatusBarIcons } from './statusBarColors';

describe('status bar colors', () => {
  it('only returns the four approved colours of the active mode', () => {
    expect(normalizeStatusBarColor('#FF6B00', 'light')).toBe('#FF6B00');
    expect(normalizeStatusBarColor('#E83D20', 'dark')).toBe('#E83D20');
    expect(normalizeStatusBarColor('#f69913', 'light')).toBe('#FFC247');
    expect(normalizeStatusBarColor('#a3310e', 'dark')).toBe('#E83D20');
    expect(normalizeStatusBarColor('#FFF8EC', 'dark')).toBe('#211A19');
  });

  it('uses contrasting system icon styles for both palettes', () => {
    expect(needsDarkStatusBarIcons('#a3310e', 'dark')).toBe(true);
    expect(needsDarkStatusBarIcons('#0c453c', 'dark')).toBe(false);
    expect(needsDarkStatusBarIcons('#f69913', 'dark')).toBe(true);
    expect(needsDarkStatusBarIcons('#FFF8EC', 'light')).toBe(true);
  });

  it('falls back safely without introducing an unsupported colour', () => {
    expect(normalizeStatusBarColor('invalid', 'dark')).toBe('#211A19');
    expect(normalizeStatusBarColor('invalid', 'light')).toBe('#FFF8EC');
  });
});
