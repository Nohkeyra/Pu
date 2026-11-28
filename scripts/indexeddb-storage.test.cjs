const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storageFile = path.resolve(__dirname, '../src/lib/indexedDbStorage.ts');
const hookFile = path.resolve(__dirname, '../src/hooks/native/useBackgroundSync.ts');
const listenersFile = path.resolve(__dirname, '../src/components/system/NativeAppListeners.tsx');

test('storage and sync files exist and contain required exports', () => {
  assert.ok(fs.existsSync(storageFile), 'src/lib/indexedDbStorage.ts must exist');
  assert.ok(fs.existsSync(hookFile), 'src/hooks/native/useBackgroundSync.ts must exist');
  assert.ok(fs.existsSync(listenersFile), 'src/components/system/NativeAppListeners.tsx must exist');

  const storageContent = fs.readFileSync(storageFile, 'utf8');
  assert.match(storageContent, /export async function processBackgroundSyncQueue/);
  assert.match(storageContent, /export async function enqueueBackgroundSync/);
  assert.doesNotMatch(storageContent, /export async function (?:cacheMenuItemsInIndexedDb|getOrderDraftFromIndexedDb|saveOrderDraftToIndexedDb)/);

  const hookContent = fs.readFileSync(hookFile, 'utf8');
  assert.match(hookContent, /export function useBackgroundSync/);
});

test('legacy store schema stays intact; startup no longer warms unused cache', () => {
  const storage = fs.readFileSync(storageFile, 'utf8');
  const hook = fs.readFileSync(hookFile, 'utf8');
  assert.match(storage, /createObjectStore\('customer_drafts'/);
  assert.match(storage, /createObjectStore\('menu_cache'/);
  assert.doesNotMatch(hook, /cacheMenuItemsInIndexedDb|DEFAULT_MENU_ITEMS/);
});

test('useBackgroundSync never auto-submits offline catering orders', () => {
  const hookContent = fs.readFileSync(hookFile, 'utf8');

  // Must not call order submission APIs directly
  assert.ok(
    !hookContent.includes('/api/orders'),
    'useBackgroundSync must never send POST requests to /api/orders'
  );

  // Must return unsupported for unhandled items
  assert.match(
    hookContent,
    /return\s+['"]unsupported['"]/,
    'useBackgroundSync must return "unsupported" for non-handled items so they are preserved'
  );
});

test('NativeAppListeners rehydrates offline queue and requires user confirmation', () => {
  const listenersContent = fs.readFileSync(listenersFile, 'utf8');

  // Confirms explicit design that orders are NOT auto-flushed
  assert.match(
    listenersContent,
    /rehydrateQueueFromNative/,
    'NativeAppListeners must rehydrate pending orders queue on reconnection'
  );
  assert.match(
    listenersContent,
    /PendingOrdersDialog/,
    'NativeAppListeners must render PendingOrdersDialog for explicit customer confirmation'
  );
  const codeWithoutComments = listenersContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  assert.ok(
    !codeWithoutComments.includes('autoSyncPendingOrders'),
    'NativeAppListeners must not import or invoke autoSyncPendingOrders'
  );
});
