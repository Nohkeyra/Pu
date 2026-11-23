import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addPendingOrder,
  getPendingOrders,
  getPendingOrdersCount,
  removePendingOrder,
  clearPendingOrders,
  MAX_PENDING_ORDERS,
  getOrderSubmissionHeaders,
  rehydrateQueueFromNative,
} from './pendingOrdersQueue';
import { Preferences } from '@capacitor/preferences';

const firebaseMock = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; emailVerified: boolean; reload: () => Promise<void>; getIdToken: (forceRefresh?: boolean) => Promise<string> }, authStateReady: vi.fn().mockResolvedValue(undefined) },
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

  it('requires sign-in even for a legacy guest draft', async () => {
    await expect(getOrderSubmissionHeaders({ userId: null })).rejects.toThrow(/Sign in/);
  });

  it('lets a verified member explicitly send a legacy guest draft', async () => {
    firebaseMock.auth.currentUser = { uid: 'other', emailVerified: true, reload: async () => {}, getIdToken: async () => 'token' };
    expect(await getOrderSubmissionHeaders({ userId: null })).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer token' });
  });

  it('blocks unverified members from sending a queued order', async () => {
    firebaseMock.auth.currentUser = { uid: 'other', emailVerified: false, reload: async () => {}, getIdToken: async () => 'token' };
    await expect(getOrderSubmissionHeaders({ userId: 'other' })).rejects.toThrow(/Verify your email/);
  });

  it('uses the original user session for a queued order', async () => {
    firebaseMock.auth.currentUser = { uid: 'owner', emailVerified: true, reload: async () => {}, getIdToken: async () => 'owner-token' };
    expect(await getOrderSubmissionHeaders({ userId: 'owner' })).toEqual({
      'Content-Type': 'application/json', Authorization: 'Bearer owner-token',
    });
  });

  it('keeps an order queued when the original account is not signed in', async () => {
    firebaseMock.auth.currentUser = { uid: 'other', emailVerified: true, reload: async () => {}, getIdToken: async () => 'other-token' };
    await expect(getOrderSubmissionHeaders({ userId: 'owner' })).rejects.toThrow(/original account/);
  });

  it('starts with an empty queue', () => {
    expect(getPendingOrders()).toEqual([]);
    expect(getPendingOrdersCount()).toBe(0);
  });

  it('does not resurrect a discarded order when native hydration finishes late', async () => {
    addPendingOrder({ name: 'Saved request' }, 'discard-race');
    const snapshot = JSON.stringify(getPendingOrders());
    let finish!: (result: { value: string }) => void;
    vi.mocked(Preferences.get).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const hydration = rehydrateQueueFromNative();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    removePendingOrder('discard-race');
    finish({ value: snapshot });
    await hydration;
    expect(getPendingOrders()).toEqual([]);
  });

  it('does not resurrect old orders after Clear while native hydration is pending', async () => {
    let finish!: (result: { value: string }) => void;
    vi.mocked(Preferences.get).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const hydration = rehydrateQueueFromNative();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    clearPendingOrders();
    finish({ value: JSON.stringify([{ idempotencyKey: 'cleared-native', orderPayload: { name: 'Old request' }, queuedAt: 1 }]) });
    await hydration;
    expect(getPendingOrders()).toEqual([]);
  });

  it('preserves both a new local request and undismissed native requests during hydration', async () => {
    let finish!: (result: { value: string }) => void;
    vi.mocked(Preferences.get).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const hydration = rehydrateQueueFromNative();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    addPendingOrder({ name: 'New request' }, 'new-local');
    finish({ value: JSON.stringify([{ idempotencyKey: 'old-native', orderPayload: { name: 'Saved request' }, queuedAt: 1 }]) });
    await hydration;
    expect(getPendingOrders().map(item => item.idempotencyKey).sort()).toEqual(['new-local', 'old-native']);
  });

  it('rejects malformed native rows before exposing them to the pending-orders dialog', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: JSON.stringify([
      { idempotencyKey: 'missing-payload', queuedAt: 1 },
      { idempotencyKey: 'array-payload', orderPayload: [], queuedAt: 1 },
      { idempotencyKey: 'valid-native', orderPayload: { name: 'Saved request' }, queuedAt: 1 },
    ]) });
    await rehydrateQueueFromNative();
    expect(getPendingOrders().map(item => item.idempotencyKey)).toEqual(['valid-native']);
  });

  it('adds an order with idempotencyKey', () => {
    const payload = { to: 'Jabatan Perdana Menteri', quantity: 50 };
    expect(addPendingOrder(payload, 'idemp-123')).toBe(true);

    const queue = getPendingOrders();
    expect(queue.length).toBe(1);
    expect(queue[0].idempotencyKey).toBe('idemp-123');
    expect(queue[0].orderPayload).toEqual(payload);
    expect(typeof queue[0].queuedAt).toBe('number');
  });

  it('does not add duplicate orders with the same idempotencyKey', () => {
    const payload = { to: 'Kementerian Kewangan', quantity: 30 };
    addPendingOrder(payload, 'idemp-duplicate');
    expect(addPendingOrder(payload, 'idemp-duplicate')).toBe(true);

    expect(getPendingOrdersCount()).toBe(1);
  });

  it('skips adding if idempotencyKey is empty string', () => {
    expect(addPendingOrder({ to: 'Test' }, '')).toBe(false);
    expect(getPendingOrdersCount()).toBe(0);
  });

  it('reports when local storage could not save the order', () => {
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError');
    });
    try {
      expect(addPendingOrder({ to: 'Test' }, 'key-unsaved')).toBe(false);
      expect(getPendingOrdersCount()).toBe(0);
    } finally {
      write.mockRestore();
    }
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

  it('rejects overflow without silently dropping previously saved requests', () => {
    for (let i = 0; i < MAX_PENDING_ORDERS + 5; i++) {
      expect(addPendingOrder({ to: `Order ${i}` }, `key-${i}`)).toBe(i < MAX_PENDING_ORDERS);
    }

    const queue = getPendingOrders();
    expect(queue.length).toBe(MAX_PENDING_ORDERS);
    expect(queue[0].idempotencyKey).toBe('key-0');
  });

  it('handles corrupted localStorage JSON without throwing', () => {
    mockStorage['wawasan_pending_orders'] = 'invalid-json-content{{{';
    expect(() => getPendingOrders()).not.toThrow();
    expect(getPendingOrders()).toEqual([]);
  });
});

