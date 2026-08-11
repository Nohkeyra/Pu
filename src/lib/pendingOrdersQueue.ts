// F-OFFLINE (audit 2026-08-11): OrderForm's existing draft-save
// (wawasan_order_draft) protects the *unsubmitted form* from app/process
// kill — but if a customer taps Submit and the network fails at that exact
// moment (fetch itself throws/aborts, not an HTTP error response), the
// fully-assembled order payload was lost with no recovery: the draft was
// already cleared on submit attempt in some paths, and even where it
// wasn't, there was no automatic path back to actually sending the order.
//
// This queue stores the exact payload OrderForm already builds (orderData,
// including its idempotencyKey) so a later retry is safe — the server
// dedupes on idempotencyKey, so re-POSTing a queued item can't create a
// duplicate order even if the original request actually landed before the
// client saw the failure.
//
// Design decision (explicit, per Noh 2026-08-11): auto-flush is NOT used.
// A queued order may go stale (event date/time already passed by the time
// connectivity returns), so the customer is always shown a confirmation
// list and picks what to send/discard — see PendingOrdersDialog.tsx.
import { safeJsonStringify } from '@/lib/utils';

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
    localStorage.setItem(PENDING_ORDERS_STORAGE_KEY, safeJsonStringify(queue));
  } catch {
    // Storage full/unavailable — queueing is a best-effort convenience,
    // never let it throw into the submit flow that called it.
  }
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
  } catch {
    /* ignore */
  }
}
