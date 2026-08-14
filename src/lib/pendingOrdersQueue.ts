import { Preferences } from '@capacitor/preferences';
import { safeJsonStringify } from '@/lib/utils';
import { getApiUrl } from '@/lib/api';

const PENDING_ORDERS_STORAGE_KEY = 'wawasan_pending_orders';

export interface PendingOrder {
  /** Same idempotencyKey embedded in orderPayload; duplicated here for quick lookups without re-parsing. */
  idempotencyKey: string;
  /** The exact object OrderForm was about to JSON.stringify and POST to /api/orders. */
  orderPayload: Record<string, unknown>;
  /** When this entry was queued, for display/staleness only — not used to auto-expire. */
  queuedAt: number;
}

function readQueue(): PendingOrder[] {
  try {
    const raw = localStorage.getItem(PENDING_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingOrder =>
        item && typeof item === 'object' && typeof item.idempotencyKey === 'string' && !!item.orderPayload
    );
  } catch {
    // Corrupt or unavailable storage — treat as empty rather than throwing.
    return [];
  }
}

function writeQueue(queue: PendingOrder[]): void {
  try {
    const jsonStr = safeJsonStringify(queue);
    localStorage.setItem(PENDING_ORDERS_STORAGE_KEY, jsonStr);
    // Persist asynchronously to Capacitor Preferences for Android native storage resilience
    Preferences.set({ key: PENDING_ORDERS_STORAGE_KEY, value: jsonStr }).catch(() => {});
  } catch {
    // Storage full/unavailable — queueing is a best-effort convenience,
    // never let it throw into the submit flow that called it.
  }
}

/** Rehydrates queue from native Capacitor Preferences into localStorage if needed. */
export async function rehydrateQueueFromNative(): Promise<PendingOrder[]> {
  try {
    const { value } = await Preferences.get({ key: PENDING_ORDERS_STORAGE_KEY });
    if (value) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const currentLocal = readQueue();
        const existingKeys = new Set(currentLocal.map((item) => item.idempotencyKey));
        let updated = false;

        for (const item of parsed) {
          if (
            item &&
            typeof item === 'object' &&
            typeof item.idempotencyKey === 'string' &&
            !existingKeys.has(item.idempotencyKey)
          ) {
            currentLocal.push(item);
            existingKeys.add(item.idempotencyKey);
            updated = true;
          }
        }

        if (updated) {
          writeQueue(currentLocal);
        }
        return currentLocal;
      }
    }
  } catch {
    /* ignore */
  }
  return readQueue();
}

export function getPendingOrders(): PendingOrder[] {
  return readQueue();
}

export function getPendingOrdersCount(): number {
  return readQueue().length;
}

/** Adds an order to the queue, skipping if the same idempotencyKey is already present. */
export function addPendingOrder(orderPayload: Record<string, unknown>, idempotencyKey: string): void {
  if (!idempotencyKey) return;
  const queue = readQueue();
  if (queue.some((item) => item.idempotencyKey === idempotencyKey)) return;
  queue.push({ idempotencyKey, orderPayload, queuedAt: Date.now() });
  writeQueue(queue);
}

export function removePendingOrder(idempotencyKey: string): void {
  const queue = readQueue().filter((item) => item.idempotencyKey !== idempotencyKey);
  writeQueue(queue);
}

export function clearPendingOrders(): void {
  try {
    localStorage.removeItem(PENDING_ORDERS_STORAGE_KEY);
    Preferences.remove({ key: PENDING_ORDERS_STORAGE_KEY }).catch(() => {});
  } catch {
    /* ignore */
  }
}

let isSyncing = false;

/**
 * Automatically synchronizes cached local order data to the Firestore database backend
 * when network connection is restored on mobile device / browser.
 */
export async function autoSyncPendingOrders(
  onSuccess?: (syncedCount: number) => void
): Promise<{ syncedCount: number; remainingCount: number }> {
  if (isSyncing) return { syncedCount: 0, remainingCount: getPendingOrdersCount() };
  isSyncing = true;

  try {
    await rehydrateQueueFromNative();
    const queue = getPendingOrders();
    if (queue.length === 0) {
      return { syncedCount: 0, remainingCount: 0 };
    }

    let syncedCount = 0;

    for (const item of queue) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(getApiUrl('/api/orders'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify(item.orderPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          syncedCount++;
          removePendingOrder(item.idempotencyKey);
        }
      } catch (err) {
        console.warn('[AutoSync] Order submit failed during sync retry:', err);
      }
    }

    if (syncedCount > 0 && onSuccess) {
      onSuccess(syncedCount);
    }

    return {
      syncedCount,
      remainingCount: getPendingOrdersCount(),
    };
  } finally {
    isSyncing = false;
  }
}
