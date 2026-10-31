import { describe, expect, it } from 'vitest';
import { normalizeStatusBarColor, needsDarkStatusBarIcons } from './statusBarColors';

describe('status bar colors', () => {
  it('chooses contrasting icon styles for the available presets', () => {
    expect(needsDarkStatusBarIcons('#a3310e')).toBe(false);
    expect(needsDarkStatusBarIcons('#121212')).toBe(false);
    expect(needsDarkStatusBarIcons('#0c453c')).toBe(false);
    expect(needsDarkStatusBarIcons('#f69913')).toBe(true);
  });

  it('falls back safely for an invalid stored color', () => {
    expect(normalizeStatusBarColor('invalid')).toBe('#a3310e');
    expect(needsDarkStatusBarIcons('invalid')).toBe(false);
  });
});
