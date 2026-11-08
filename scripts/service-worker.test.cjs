const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const swPath = path.resolve(__dirname, '../public/sw.js');

test('public/sw.js exists and is valid JavaScript syntax', () => {
  assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');
  const content = fs.readFileSync(swPath, 'utf8');
  assert.ok(content.length > 0, 'public/sw.js must not be empty');

  // Verify syntax by compiling the script in a simulated ServiceWorker sandbox context
  assert.doesNotThrow(() => {
    new vm.Script(content, { filename: 'sw.js' });
  }, 'public/sw.js should have valid JavaScript syntax');
});

test('public/sw.js bypasses unsupported HTTP methods (only GET requests are handled)', () => {
  const content = fs.readFileSync(swPath, 'utf8');

  // Ensure non-GET methods (POST, PUT, DELETE, PATCH, etc.) are skipped immediately
  assert.match(
    content,
    /event\.request\.method\s*!==\s*['"]GET['"]/,
    'Service worker fetch handler must guard against non-GET HTTP methods'
  );
});

test('public/sw.js bypasses external and cross-origin requests', () => {
  const content = fs.readFileSync(swPath, 'utf8');

  // Ensure requests not matching self.location.origin or non-http protocols are skipped
  assert.match(
    content,
    /url\.origin\s*!==\s*self\.location\.origin/,
    'Service worker must guard against cross-origin requests'
  );
  assert.match(
    content,
    /url\.protocol\s*!==\s*['"]http:['"]\s*&&\s*url\.protocol\s*!==\s*['"]https:['"]/,
    'Service worker must only intercept HTTP/HTTPS web requests'
  );
});

test('public/sw.js bypasses API endpoints, Firebase, and dev server sockets', () => {
  const content = fs.readFileSync(swPath, 'utf8');

  assert.match(
    content,
    /url\.pathname\.startsWith\(['"]\/api['"]\)/,
    'Service worker must skip /api routes'
  );
  assert.match(
    content,
    /url\.hostname\.includes\(['"]firestore['"]\)/,
    'Service worker must skip Firestore endpoints'
  );
  assert.match(
    content,
    /url\.hostname\.includes\(['"]firebase['"]\)/,
    'Service worker must skip Firebase endpoints'
  );
});

test('public/sw.js background sync does not auto-submit catering orders', () => {
  const content = fs.readFileSync(swPath, 'utf8');

  // The background sync must only check health and notify windows, never POST orders
  assert.ok(
    !content.includes('/api/orders'),
    'Service worker background sync must not automatically submit orders to /api/orders'
  );
  assert.match(
    content,
    /BACKGROUND_SYNC_COMPLETE/,
    'Service worker background sync notifies UI clients via postMessage'
  );
});

test('public/sw.js contains proper lifecycle and notification event listeners', () => {
  const content = fs.readFileSync(swPath, 'utf8');

  assert.match(content, /addEventListener\(['"]install['"]/, 'Missing install listener');
  assert.match(content, /addEventListener\(['"]activate['"]/, 'Missing activate listener');
  assert.match(content, /addEventListener\(['"]fetch['"]/, 'Missing fetch listener');
  assert.match(content, /addEventListener\(['"]sync['"]/, 'Missing sync listener');
  assert.match(content, /addEventListener\(['"]push['"]/, 'Missing push listener');
  assert.match(content, /addEventListener\(['"]notificationclick['"]/, 'Missing notificationclick listener');
});
