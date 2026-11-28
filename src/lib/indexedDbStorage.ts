/**
 * IndexedDB Storage & Offline Background Sync Engine for Restoran Wawasan
 * Processes retained background queue entries. Catering drafts and pending
 * orders have separate authoritative storage; old stores are never auto-deleted.
 */

const DB_NAME = 'WawasanAppDB';
const DB_VERSION = 1;

// Retain existing store schema for upgrade safety; only legacy background queue is active.
export interface SyncQueueItem {
  id: string;
  type: 'review_submission' | 'favorite_dish' | 'contact_inquiry' | (string & {});
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in current environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('menu_cache')) {
        db.createObjectStore('menu_cache', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('customer_drafts')) {
        db.createObjectStore('customer_drafts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Resolve only after the entire write transaction commits, including aborts. */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/**
 * Enqueue item into Background Sync Queue
 */
export async function enqueueBackgroundSync(
  type: SyncQueueItem['type'],
  payload: Record<string, unknown>
): Promise<string> {
  const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const item: SyncQueueItem = {
    id,
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
  };

  const db = await openDatabase();
  try {
    const tx = db.transaction('sync_queue', 'readwrite');
    tx.objectStore('sync_queue').put(item);
    await transactionDone(tx);
    return id;
  } finally {
    db.close();
  }
}

export type SyncHandlerResult = boolean | 'unsupported' | 'skip';

/**
 * Drains and executes pending background sync items.
 * - Return true: item processed successfully, removed from queue.
 * - Return false: transient failure; retry up to six attempts, then preserve the item.
 * - Return 'unsupported' | 'skip': item is not processed or handled by this worker, preserved intact in queue without deleting or incrementing retries.
 */
export async function processBackgroundSyncQueue(
  handler: (item: SyncQueueItem) => Promise<SyncHandlerResult>
): Promise<{ processed: number; failed: number; skipped?: number }> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase();
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const request = store.getAll();

    const items: SyncQueueItem[] = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of items) {
      if (item.retries > 5) { skipped++; continue; }
      try {
        const result = await handler(item);
        if (result === true) {
          const deleteTx = db.transaction('sync_queue', 'readwrite');
          deleteTx.objectStore('sync_queue').delete(item.id);
          await transactionDone(deleteTx);
          processed++;
        } else if (result === false) {
          item.retries += 1;
          // Keep failed payloads instead of silently discarding them after retries.
          const updateTx = db.transaction('sync_queue', 'readwrite');
          updateTx.objectStore('sync_queue').put(item);
          await transactionDone(updateTx);
          failed++;
        } else {
          // Unsupported or skipped item: preserve in queue without deleting or incrementing retries
          skipped++;
        }
      } catch {
        failed++;
      }
    }

    return { processed, failed, skipped };
  } catch (err) {
    console.debug('Background sync processing error:', err);
    return { processed: 0, failed: 0, skipped: 0 };
  } finally {
    db?.close();
  }
}
