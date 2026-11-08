// Source-contract regression tests for shared visual layers (no app runtime needed).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const css = read('src/styles/wawasan-refinement-v5.css');
function tokenNumber(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(\\d+)\\s*;`));
  assert.ok(match, `CSS token --${name} must exist`);
  return Number(match[1]);
}

test('shared overlay elevation stays above mobile menu and header', () => {
  const backdrop = tokenNumber('rw-z-dialog-backdrop');
  const panel = tokenNumber('rw-z-dialog');
  const dropdown = tokenNumber('rw-z-popover');
  const tooltip = tokenNumber('rw-z-tooltip');
  assert.ok(backdrop > 1100, 'mobile menu currently uses z 1100');
  assert.ok(panel > backdrop && dropdown > panel && tooltip >= dropdown);
  assert.ok(tooltip < 2000, 'invoice overlays currently use z 2000');
  assert.match(read('src/components/ui/dialog.tsx'), /z-\[var\(--rw-z-dialog\)\]/);
  assert.match(read('src/components/ui/select.tsx'), /z-\[var\(--rw-z-popover\)\]/);
});

test('portal primitives expose stable semantic slots for visual QA', () => {
  assert.match(read('src/components/ui/select.tsx'), /data-slot="select-content"/);
  assert.match(read('src/components/ui/tooltip.tsx'), /data-slot="tooltip-content"/);
  assert.match(css, /\[data-slot='dialog-content'\] \{ z-index: var\(--rw-z-dialog\); \}/);
});

test('redesign preserves original branding and business boundaries', () => {
  assert.match(read('src/components/layout/CustomerPageHeader.tsx'), /font-artistic customer-brand-name/);
  assert.match(read('src/pages/CustomerDashboard.tsx'), /customer-dashboard-welcome/);
  assert.match(read('src/components/admin/AdminPanel.tsx'), /wawasan-admin-heading/);
  assert.match(read('src/main.tsx'), /wawasan-refinement-v5.css/);
  assert.match(css, /batik_vector_pattern\.jpg/);
});

test('responsive and reduced motion controls remain explicit', () => {
  assert.match(css, /max-width: 359px/);
  assert.match(css, /min-width: 1024px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /customer-dashboard-action:focus-visible/);
});
