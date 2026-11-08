'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = p => fs.readFileSync(path.join(root, p), 'utf8');

function luminance(hex) {
  const rgb = hex.match(/.{2}/g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function rgbHex(r, g, b) {
  return [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

test('four approved base hues and unchanged brand font token ownership', () => {
  const color = src('tokens/colors.css');
  const typography = src('tokens/typography.css');
  for (const token of ['--ui-orange: #FF6B00;', '--ui-yellow: #FFC247;', '--ui-green: #268A38;', '--ui-canvas: #FFF8EC;', '--ui-orange: #E83D20;', '--ui-yellow: #FFB02E;', '--ui-green: #186B45;', '--ui-canvas: #211A19;']) {
    assert.ok(color.includes(token), `Missing preserved brand palette value: ${token}`);
  }
  assert.ok(typography.includes('Uncial Antiqua') || src('src/index.css').includes('Uncial Antiqua'));
});

test('selected light yellow accent has >= 4.5:1 token-level normal-text contrast', () => {
  const theme = src('src/styles/wawasan-four-colour-theme.css');
  assert.match(theme, /data-wawasan-accent='yellow'\]\s*\{\s*--ui-action: rgb\(from var\(--ui-yellow\) calc\(r \* \.54\)/);
  const yellowAccent = rgbHex(255 * .54, 194 * .54, 71 * .54);
  assert.ok(contrast(yellowAccent, 'FFF8EC') >= 4.5);
  assert.ok(contrast('FFB02E', '211A19') >= 4.5);
});

test('marketing/customer surface text and CTAs inherit semantic ink instead of bright decorative hues', () => {
  const customer = src('src/components/customer-pages.css');
  const landing = src('src/pages/living-canvas-v31.css');
  const editorial = src('src/styles/wawasan-editorial-v2.css');
  assert.match(customer, /--customer-muted: var\(--ui-muted\)/);
  assert.match(customer, /--customer-ink: var\(--ui-ink\)/);
  assert.match(customer, /\.customer-next-button\s*\{[^}]*background: var\(--ui-action\);[^}]*color: var\(--ui-on-action\)/s);
  assert.match(landing, /--landing-muted: var\(--ui-muted\)/);
  assert.match(editorial, /\.landing-menu-categories button\[aria-pressed='true'\] \{ background:var\(--ui-action\); color:var\(--ui-on-action\)/);
  assert.match(editorial, /\.customer-page \.customer-next-button \{ background: var\(--ui-action\); color: var\(--ui-on-action\)/);
});

test('order and operator actions are semantically legible in both themes', () => {
  for (const name of ['src/components/order/Step1EventMeal.tsx', 'src/components/order/Step3ContactDetails.tsx', 'src/components/order/Step5OrderSuccess.tsx', 'src/components/admin/AdminOrdersTab.tsx', 'src/components/admin/AdminOrderRow.tsx']) {
    const content = src(name);
    assert.match(content, /text-\[var\(--ui-on-action\)\]/, `${name} missing on-action text for filled action`);
  }
  assert.doesNotMatch(src('src/components/admin/AdminOrdersTab.tsx'), /bg-\[var\(--ui-yellow\)\] text-white/);
  assert.match(src('src/components/system/InAppUpdateBanner.tsx'), /min-h-\[48px\]/);
});

test('small-screen settings tabs, native safe-area dialogs and reduced-motion controls have grounded guards', () => {
  const customer = src('src/components/customer-pages.css');
  assert.match(customer, /@media\(max-width:359px\)\s*\{\s*\.customer-settings-tabs\s*\{grid-template-columns: repeat\(2/);
  assert.match(src('src/components/ui/presentation.css'), /max-height:calc\(100dvh - 2rem - var\(--sat, 0px\) - var\(--sab, 0px\)\)/);
  assert.match(src('src/components/ui/dialog.tsx'), /motion-reduce:animate-none/);
  assert.match(src('src/components/layout/CustomerPageHeader.tsx'), /typeof ResizeObserver === 'undefined'/);
  assert.match(src('src/components/app/AppContent.tsx'), /reduceMotion \? \{ duration: 0 \} : undefined/);
});

test('all active page routes and customer-facing screen shells remain present', () => {
  const routes = src('src/components/app/AppContent.tsx');
  for (const p of ['/', '/app', '/order', '/profile', '/calendar', '/settings', '/admin', '/login']) {
    assert.ok(routes.includes(`path="${p}"`), `Missing route ${p}`);
  }
  for (const p of ['OrderPage.tsx', 'CalendarPage.tsx', 'ProfilePage.tsx', 'SettingsPage.tsx']) {
    assert.match(src(`src/pages/${p}`), /CustomerPageHeader/);
    assert.match(src(`src/pages/${p}`), /CustomerPageLayout/);
  }
});
