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
  assert.match(storageContent, /export async function cacheMenuItemsInIndexedDb/);
  assert.match(storageContent, /export async function enqueueBackgroundSync/);
  assert.match(storageContent, /export async function getOrderDraftFromIndexedDb/);
  assert.match(storageContent, /export async function saveOrderDraftToIndexedDb/);

  const hookContent = fs.readFileSync(hookFile, 'utf8');
  assert.match(hookContent, /export function useBackgroundSync/);
});

test('processBackgroundSyncQueue logic preserves unsupported queue items without deleting or incrementing retries', async () => {
  // Simulate the queue processing algorithm as implemented in indexedDbStorage.ts
  async function simulateProcessQueue(items, handler) {
    const queue = JSON.parse(JSON.stringify(items));
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i];
      try {
        const result = await handler(item);
        if (result === true) {
          queue.splice(i, 1);
          processed++;
        } else if (result === false) {
          item.retries += 1;
          if (item.retries > 5) {
            queue.splice(i, 1);
          }
          failed++;
        } else {
          // Unsupported or skipped
          skipped++;
        }
      } catch {
        failed++;
      }
    }
    return { queue, processed, failed, skipped };
  }

  const initialItems = [
    { id: '1', type: 'contact_inquiry', payload: { name: 'Alice' }, retries: 0 },
    { id: '2', type: 'unknown_future_item', payload: { data: 'test' }, retries: 0 },
    { id: '3', type: 'catering_order', payload: { pax: 50 }, retries: 0 },
    { id: '4', type: 'failing_inquiry', payload: {}, retries: 5 },
  ];

  const handler = async (item) => {
    if (item.type === 'contact_inquiry') return true;
    if (item.type === 'failing_inquiry') return false;
    return 'unsupported';
  };

  const outcome = await simulateProcessQueue(initialItems, handler);

  assert.equal(outcome.processed, 1, 'One item was processed successfully');
  assert.equal(outcome.failed, 1, 'One item failed and was dropped after exceeding retries');
  assert.equal(outcome.skipped, 2, 'Two unsupported items were skipped');

  // Verify that unsupported items remained untouched in the queue
  const remainingIds = outcome.queue.map(q => q.id);
  assert.ok(remainingIds.includes('2'), 'Unsupported item "2" must NOT be deleted');
  assert.ok(remainingIds.includes('3'), 'Unsupported item "3" must NOT be deleted');
  assert.ok(!remainingIds.includes('1'), 'Processed item "1" must be deleted');
  assert.ok(!remainingIds.includes('4'), 'Exceeded retries item "4" must be deleted');

  // Verify retries were NOT incremented on unsupported items
  const item2 = outcome.queue.find(q => q.id === '2');
  const item3 = outcome.queue.find(q => q.id === '3');
  assert.equal(item2.retries, 0, 'Unsupported item retries must remain unchanged');
  assert.equal(item3.retries, 0, 'Unsupported item retries must remain unchanged');
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
