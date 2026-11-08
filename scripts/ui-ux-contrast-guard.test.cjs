'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const actionSurfaces = [
  'src/components/layout/MobileMenu.tsx',
  'src/components/layout/Header.tsx',
  'src/components/layout/Footer.tsx',
  'src/components/layout/PageShell.tsx',
  'src/components/admin/AdminPanel.tsx',
  'src/components/admin/AdminPdfShareModal.tsx',
  'src/components/profile/UserProfileDashboard.tsx',
  'src/pages/AdminPage.tsx',
];

test('primary-action labels use semantic on-action ink in both Wawasan themes', () => {
  const palette = read('tokens/colors.css');
  assert.match(palette, /--ui-on-action:\s*var\(--ui-canvas\)/);
  assert.match(palette, /\.dark\s*\{/);
  for (const file of actionSurfaces) {
    const text = read(file);
    const actionLines = text.split('\n').filter(line => line.includes('bg-[var(--color-sunshine-cta)]'));
    assert.ok(actionLines.length, `${file}: action surface missing`);
    for (const line of actionLines) {
      if (line.includes('hover:bg-[var(--color-sunshine-cta)]')) {
        assert.match(line, /hover:text-\[var\(--ui-on-action\)\]/,
          `${file}: hover action needs a matching high-contrast hover ink`);
      } else {
        assert.doesNotMatch(line, /(?<!hover:)text-white\b|(?<!hover:)text-\[var\(--ui-legacy-white\)\]/,
          `${file}: hard-coded white/legacy text can disappear on a dark-mode yellow action`);
      }
    }
  }
});

test('toast stack stays inside small mobile viewport and accounts for native bottom inset', () => {
  const text = read('src/components/ui/Toast.tsx');
  assert.match(text, /left-3 right-3/);
  assert.match(text, /sm:left-auto sm:right-5/);
  assert.match(text, /--safe-area-inset-bottom/);
});

test('scroll-to-top is accessible on touch, focus, reduced motion and native safe areas', () => {
  const text = read('src/components/layout/ScrollToTopButton.tsx');
  assert.match(text, /min-h-\[48px\] min-w-\[48px\]/);
  assert.match(text, /useReducedMotion/);
  assert.match(text, /reduceMotion \? 'auto' : 'smooth'/);
  assert.match(text, /focus-visible:outline-/);
  assert.match(text, /--safe-area-inset-bottom/);
});


test('theme and toast transitions honor reduced-motion without changing palette ownership', () => {
  const theme = read('src/context/ThemeContext.tsx');
  const toast = read('src/components/ui/Toast.tsx');
  assert.match(theme, /matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(theme, /setTheme\(nextTheme\)/);
  assert.match(toast, /useReducedMotion/);
  assert.match(toast, /transition=\{reduceMotion \? \{ duration: 0 \}/);
});
