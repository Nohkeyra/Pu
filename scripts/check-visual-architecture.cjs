/**
 * Static guardrails for visual ownership. Run: node scripts/check-visual-architecture.cjs
 * This is NOT a pixel/screenshot regression test.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const index = read('src/index.css');
const customer = read('src/components/customer-pages.css');
const background = read('src/wawasan-page-backgrounds.css');
const tokenFiles = ['tokens/colors.css', 'tokens/radius.css', 'tokens/shadows.css'].map(read);
const theme = index.split('/* Tailwind v4: shadcn')[0];
const mappings = [...theme.matchAll(/(--(?:color|radius|shadow)-[\w-]+):\s*var\((--wawasan-source-[\w-]+)\);/g)];
assert.ok(mappings.length >= 30, 'Expected canonical Tailwind token mappings');
for (const [, exposed, source] of mappings) {
  assert.notEqual(exposed, source, `Circular theme alias: ${exposed}`);
  assert.ok([index, ...tokenFiles].some((content) => new RegExp(`${source}:\\s*[^;]+;`).test(content)), `Missing independent token source: ${source}`);
  assert.doesNotMatch(theme, new RegExp(`${exposed}:\\s*var\\(${exposed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`), `Self-referential token: ${exposed}`);
}
assert.doesNotMatch(customer, /\.customer-page::before\s*\{/, 'Customer page canvas must be owned by src/wawasan-page-backgrounds.css');
assert.match(background, /\.customer-page::before\s*\{/, 'Missing central customer canvas');
assert.match(customer, /\.customer-order-page \.customer-botanical-decoration/, 'Missing order ornament container');
assert.match(customer, /\.customer-order-page \.wawasan-order-footer-flower/, 'Missing footer ornament');
console.log(`PASS: ${mappings.length} independent Tailwind tokens; one customer ambient canvas owner; Order decorations preserved.`);
