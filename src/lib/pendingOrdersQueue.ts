import { Preferences } from '@capacitor/preferences';
import { safeJsonStringify } from '@/lib/utils';
import { auth } from '@/firebaseConfig';

/** Offline sends require an email-verified session; preserve original ownership when present. */
export async function getOrderSubmissionHeaders(payload: Record<string, unknown>): Promise<Record<string, string>> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to send your saved order.');
  const owner = payload.userId;
  if (typeof owner === 'string' && owner && user.uid !== owner) {
    throw new Error('Sign in to the original account to send this order.');
  }
  await user.reload();
  if (!user.emailVerified) throw new Error('Verify your email address before sending this order.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await user.getIdToken(true)}`,
  };
}

const PENDING_ORDERS_STORAGE_KEY = 'wawasan_pending_orders';

export interface PendingOrder {
  /** Same idempotencyKey embedded in orderPayload; duplicated here for quick lookups without re-parsing. */
  idempotencyKey: string;
  /** The exact object OrderForm was about to JSON.stringify and POST to /api/orders. */
  orderPayload: Record<string, unknown>;
  /** When this entry was queued, for display/staleness only — not used to auto-expire. */
  queuedAt: number;
}

let nativeWrites: Promise<void> = Promise.resolve();
let clearGeneration = 0;
const removedKeys = new Set<string>();

function persistNative(operation: () => Promise<unknown>): void {
  // A slow older native write must never overwrite a newer discard/clear.
  nativeWrites = nativeWrites.then(operation).then(() => undefined).catch(() => {});
}

function isPendingOrder(item: unknown): item is PendingOrder {
  if (!item || typeof item !== 'object') return false;
  const row = item as Partial<PendingOrder>;
  return typeof row.idempotencyKey === 'string' && row.idempotencyKey.length > 0
    && Boolean(row.orderPayload) && typeof row.orderPayload === 'object'
    && !Array.isArray(row.orderPayload);
}

function readQueue(): PendingOrder[] {
  try {
    const raw = localStorage.getItem(PENDING_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingOrder);
  } catch {
    // Corrupt or unavailable storage — treat as empty rather than throwing.
    return [];
  }
}

export const MAX_PENDING_ORDERS = 20;

function writeQueue(queue: PendingOrder[]): boolean {
  try {
    const jsonStr = safeJsonStringify(queue);
    localStorage.setItem(PENDING_ORDERS_STORAGE_KEY, jsonStr);
    // Persist asynchronously to Capacitor Preferences for Android native storage resilience
    persistNative(() => Preferences.set({ key: PENDING_ORDERS_STORAGE_KEY, value: jsonStr }));
    return true;
  } catch {
    return false;
  }
}

/** Rehydrates queue from native Capacitor Preferences into localStorage if needed. */
export async function rehydrateQueueFromNative(): Promise<PendingOrder[]> {
  const startedBeforeClear = clearGeneration;
  try {
    await nativeWrites;
    const { value } = await Preferences.get({ key: PENDING_ORDERS_STORAGE_KEY });
    // A snapshot requested before Clear belongs to the previous local queue.
    if (startedBeforeClear !== clearGeneration) return readQueue();
    if (value) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const currentLocal = readQueue();
        const existingKeys = new Set(currentLocal.map((item) => item.idempotencyKey));
        let updated = false;

        for (const item of parsed) {
          if (
            isPendingOrder(item) &&
            !removedKeys.has(item.idempotencyKey) &&
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

/** Returns whether the order is available in the local queue for retry. */
export function addPendingOrder(orderPayload: Record<string, unknown>, idempotencyKey: string): boolean {
  if (!idempotencyKey) return false;
  const queue = readQueue();
  if (queue.some((item) => item.idempotencyKey === idempotencyKey)) return true;
  // A full queue rejects the new save; it never silently evicts a customer's request.
  if (queue.length >= MAX_PENDING_ORDERS) return false;
  queue.push({ idempotencyKey, orderPayload, queuedAt: Date.now() });
  const saved = writeQueue(queue);
  if (saved) removedKeys.delete(idempotencyKey);
  return saved;
}

export function removePendingOrder(idempotencyKey: string): void {
  removedKeys.add(idempotencyKey);
  const queue = readQueue().filter((item) => item.idempotencyKey !== idempotencyKey);
  writeQueue(queue);
}

export function clearPendingOrders(): void {
  clearGeneration++;
  removedKeys.clear();
  try {
    localStorage.removeItem(PENDING_ORDERS_STORAGE_KEY);
    persistNative(() => Preferences.remove({ key: PENDING_ORDERS_STORAGE_KEY }));
  } catch {
    /* ignore */
  }
}

// Offline catering requests must be reviewed individually by the customer.
// Sending is intentionally only available through PendingOrdersDialog's button.
