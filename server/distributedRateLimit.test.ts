import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreDistributedStore } from './distributedRateLimit';
import { getFirestore } from './firebaseAdmin';
import { firestoreQuota, FirestoreQuotaPausedError } from './services/firestoreQuota';
const db = getFirestore();
describe('distributed rate-limit counters', () => {
  beforeEach(() => {
    firestoreQuota.reset();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-01-01'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    firestoreQuota.reset();
  });
  it('preserves authoritative counts across concurrent instances', async () => {
    const a = new FirestoreDistributedStore('strict_counts'),
      b = new FirestoreDistributedStore('strict_counts');
    await a.resetAll();
    const tx = vi.spyOn(db, 'runTransaction');
    const counts = await Promise.all(
      Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b).increment('client'))
    );
    expect(counts.map((c) => c.totalHits).sort((x, y) => x - y)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1)
    );
    expect(tx).toHaveBeenCalledTimes(12);
    expect((await a.get('client'))?.totalHits).toBe(12);
    await a.decrement('client');
    expect((await b.get('client'))?.totalHits).toBe(11);
  });
  it('maintains local counts without repeated transactions during a quota pause', async () => {
    const store = new FirestoreDistributedStore('quota_counts');
    await store.resetAll();
    const first = await store.increment('client');
    const tx = vi
      .spyOn(db, 'runTransaction')
      .mockRejectedValue(Object.assign(new Error('Quota exceeded'), { code: 8 }));
    expect((await store.increment('client')).totalHits).toBe(2);
    expect((await store.increment('client')).totalHits).toBe(3);
    await store.decrement('client');
    expect((await store.get('client'))?.totalHits).toBe(2);
    expect((await store.increment('other')).totalHits).toBe(1);
    expect(tx).toHaveBeenCalledTimes(1);
    expect((await store.get('client'))?.resetTime.getTime()).toBe(first.resetTime.getTime());
    tx.mockRestore();
    vi.setSystemTime(Date.now() + 60000);
    await store.increment('client');
    expect(firestoreQuota.retryAfterSeconds).toBe(0);
  });
  it('honors a pause started by another reader', async () => {
    await expect(
      firestoreQuota.run(async () => {
        throw { code: 8 };
      })
    ).rejects.toBeInstanceOf(FirestoreQuotaPausedError);
    const tx = vi.spyOn(db, 'runTransaction'),
      store = new FirestoreDistributedStore('shared_pause');
    expect((await store.increment('client')).totalHits).toBe(1);
    expect((await store.increment('client')).totalHits).toBe(2);
    expect(tx).not.toHaveBeenCalled();
  });
});
