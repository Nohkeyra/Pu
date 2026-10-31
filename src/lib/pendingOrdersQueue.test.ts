import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addPendingOrder,
  getPendingOrders,
  getPendingOrdersCount,
  removePendingOrder,
  clearPendingOrders,
  MAX_PENDING_ORDERS,
  getOrderSubmissionHeaders,
} from './pendingOrdersQueue';

const firebaseMock = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; getIdToken: () => Promise<string> }, authStateReady: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/firebaseConfig', () => firebaseMock);

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ value: null }),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('pendingOrdersQueue', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    firebaseMock.auth.currentUser = null;
    for (const key in mockStorage) {
      delete mockStorage[key];
    }

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        for (const key in mockStorage) {
          delete mockStorage[key];
        }
      },
    });

    clearPendingOrders();
  });

  it('keeps guest submissions unauthenticated even if a user has signed in', async () => {
    firebaseMock.auth.currentUser = { uid: 'other', getIdToken: async () => 'token' };
    expect(await getOrderSubmissionHeaders({ userId: null })).toEqual({ 'Content-Type': 'application/json' });
  });

  it('uses the original user session for a queued order', async () => {
    firebaseMock.auth.currentUser = { uid: 'owner', getIdToken: async () => 'owner-token' };
    expect(await getOrderSubmissionHeaders({ userId: 'owner' })).toEqual({
      'Content-Type': 'application/json', Authorization: 'Bearer owner-token',
    });
  });

  it('keeps an order queued when the original account is not signed in', async () => {
    firebaseMock.auth.currentUser = { uid: 'other', getIdToken: async () => 'other-token' };
    await expect(getOrderSubmissionHeaders({ userId: 'owner' })).rejects.toThrow(/original account/);
  });

  it('starts with an empty queue', () => {
    expect(getPendingOrders()).toEqual([]);
    expect(getPendingOrdersCount()).toBe(0);
  });

  it('adds an order with idempotencyKey', () => {
    const payload = { to: 'Jabatan Perdana Menteri', quantity: 50 };
    addPendingOrder(payload, 'idemp-123');

    const queue = getPendingOrders();
    expect(queue.length).toBe(1);
    expect(queue[0].idempotencyKey).toBe('idemp-123');
    expect(queue[0].orderPayload).toEqual(payload);
    expect(typeof queue[0].queuedAt).toBe('number');
  });

  it('does not add duplicate orders with the same idempotencyKey', () => {
    const payload = { to: 'Kementerian Kewangan', quantity: 30 };
    addPendingOrder(payload, 'idemp-duplicate');
    addPendingOrder(payload, 'idemp-duplicate');

    expect(getPendingOrdersCount()).toBe(1);
  });

  it('skips adding if idempotencyKey is empty string', () => {
    addPendingOrder({ to: 'Test' }, '');
    expect(getPendingOrdersCount()).toBe(0);
  });

  it('removes a specific pending order by idempotencyKey', () => {
    addPendingOrder({ to: 'Order 1' }, 'key-1');
    addPendingOrder({ to: 'Order 2' }, 'key-2');
    expect(getPendingOrdersCount()).toBe(2);

    removePendingOrder('key-1');
    const remaining = getPendingOrders();
    expect(remaining.length).toBe(1);
    expect(remaining[0].idempotencyKey).toBe('key-2');
  });

  it('clears all pending orders', () => {
    addPendingOrder({ to: 'Order A' }, 'key-a');
    addPendingOrder({ to: 'Order B' }, 'key-b');
    expect(getPendingOrdersCount()).toBe(2);

    clearPendingOrders();
    expect(getPendingOrdersCount()).toBe(0);
  });

  it('caps queue at MAX_PENDING_ORDERS', () => {
    for (let i = 0; i < MAX_PENDING_ORDERS + 5; i++) {
      addPendingOrder({ to: `Order ${i}` }, `key-${i}`);
    }

    const queue = getPendingOrders();
    expect(queue.length).toBe(MAX_PENDING_ORDERS);
    // The first 5 should have been shifted out
    expect(queue[0].idempotencyKey).toBe('key-5');
  });

  it('handles corrupted localStorage JSON without throwing', () => {
    mockStorage['wawasan_pending_orders'] = 'invalid-json-content{{{';
    expect(() => getPendingOrders()).not.toThrow();
    expect(getPendingOrders()).toEqual([]);
  });
});

