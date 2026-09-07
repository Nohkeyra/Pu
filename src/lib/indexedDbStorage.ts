/**
 * IndexedDB Storage & Offline Background Sync Engine for Restoran Wawasan
 * Provides persistent structured offline storage for:
 * 1. Menu cache (instant offline browsing)
 * 2. Order drafts (prevent data loss during intermittent connectivity)
 * 3. Background Sync Queue (offline reviews, ratings, user interactions)
 */

const DB_NAME = 'WawasanAppDB';
const DB_VERSION = 1;

export interface OfflineMenuItem {
  id: string;
  nameEn: string;
  nameBm: string;
  category: string;
  price?: number;
  image?: string;
  isPopular?: boolean;
  isAvailable?: boolean;
  cachedAt: number;
}

export interface OrderDraft {
  id: string;
  pax: number;
  date: string;
  session: string;
  dishes: any[];
  veggies: any[];
  contactInfo: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  notes?: string;
  updatedAt: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'review_submission' | 'favorite_dish' | 'contact_inquiry';
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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache Menu Items into IndexedDB
 */
export async function cacheMenuItemsInIndexedDb(items: any[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('menu_cache', 'readwrite');
    const store = tx.objectStore('menu_cache');
    const now = Date.now();

    for (const item of items) {
      if (item && item.id) {
        store.put({ ...item, cachedAt: now });
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.debug('IndexedDB menu cache error:', err);
  }
}

/**
 * Retrieve cached menu items from IndexedDB
 */
export async function getCachedMenuItemsFromIndexedDb(): Promise<OfflineMenuItem[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('menu_cache', 'readonly');
    const store = tx.objectStore('menu_cache');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.debug('IndexedDB menu retrieval error:', err);
    return [];
  }
}

/**
 * Save active customer draft to IndexedDB
 */
export async function saveOrderDraftToIndexedDb(draft: Omit<OrderDraft, 'updatedAt'>): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('customer_drafts', 'readwrite');
    const store = tx.objectStore('customer_drafts');
    store.put({ ...draft, updatedAt: Date.now() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.debug('IndexedDB draft save error:', err);
  }
}

/**
 * Get active customer draft from IndexedDB
 */
export async function getOrderDraftFromIndexedDb(id = 'active_draft'): Promise<OrderDraft | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('customer_drafts', 'readonly');
    const store = tx.objectStore('customer_drafts');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.debug('IndexedDB draft retrieval error:', err);
    return null;
  }
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

  try {
    const db = await openDatabase();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    store.put(item);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return id;
  } catch (err) {
    console.debug('Background sync queue enqueue error:', err);
    return id;
  }
}

/**
 * Drains and executes pending background sync items
 */
export async function processBackgroundSyncQueue(
  handler: (item: SyncQueueItem) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.getAll();

    const items: SyncQueueItem[] = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    let processed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const success = await handler(item);
        if (success) {
          const deleteTx = db.transaction('sync_queue', 'readwrite');
          deleteTx.objectStore('sync_queue').delete(item.id);
          processed++;
        } else {
          item.retries += 1;
          if (item.retries > 5) {
            // Drop unrecoverable items after 5 retries
            const deleteTx = db.transaction('sync_queue', 'readwrite');
            deleteTx.objectStore('sync_queue').delete(item.id);
          } else {
            const updateTx = db.transaction('sync_queue', 'readwrite');
            updateTx.objectStore('sync_queue').put(item);
          }
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { processed, failed };
  } catch (err) {
    console.debug('Background sync processing error:', err);
    return { processed: 0, failed: 0 };
  }
}
