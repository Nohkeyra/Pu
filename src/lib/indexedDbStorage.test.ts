import { afterEach, describe, expect, it, vi } from 'vitest';
import { enqueueBackgroundSync, processBackgroundSyncQueue, type SyncQueueItem } from './indexedDbStorage';

function installDb(items: SyncQueueItem[] = [], abortWrites = false) {
  const rows = new Map(items.map(item => [item.id, structuredClone(item)]));
  const close = vi.fn();
  const db = {
    close,
    transaction: () => {
      const tx = {
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        error: null as Error | null,
        objectStore: () => ({
          put: (item: SyncQueueItem) => queueMicrotask(() => {
            if (abortWrites) {
              tx.error = new Error('write aborted');
              tx.onabort?.();
            } else {
              rows.set(item.id, structuredClone(item));
              tx.oncomplete?.();
            }
          }),
          delete: (id: string) => queueMicrotask(() => {
            if (abortWrites) {
              tx.error = new Error('write aborted');
              tx.onabort?.();
            } else {
              rows.delete(id);
              tx.oncomplete?.();
            }
          }),
          getAll: () => {
            const request = {
              result: Array.from(rows.values(), item => structuredClone(item)),
              onsuccess: null as (() => void) | null,
            };
            queueMicrotask(() => request.onsuccess?.());
            return request;
          },
        }),
      };
      return tx;
    },
  };
  vi.stubGlobal('window', {
    indexedDB: {
      open: () => {
        const request = { result: db, onsuccess: null as (() => void) | null };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    },
  });
  return { rows, close };
}

const item: SyncQueueItem = {
  id: 'legacy-item', type: 'contact_inquiry', payload: {}, retries: 0, createdAt: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe('IndexedDB queue durability', () => {
  it('returns an ID only after enqueue commits', async () => {
    const { rows, close } = installDb();
    const id = await enqueueBackgroundSync('contact_inquiry', {});
    expect(rows.has(id)).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects an aborted enqueue instead of reporting a successful save', async () => {
    const { rows, close } = installDb([], true);
    await expect(enqueueBackgroundSync('contact_inquiry', {})).rejects.toThrow('write aborted');
    expect(rows.size).toBe(0);
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not count an aborted deletion as processed', async () => {
    const { rows, close } = installDb([item], true);
    expect(await processBackgroundSyncQueue(async () => true)).toEqual({
      processed: 0, failed: 1, skipped: 0,
    });
    expect(rows.has(item.id)).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });

  it('retains exhausted queue items without resending or silently deleting', async () => {
    const exhausted = {...item,retries:5};
    const { rows } = installDb([exhausted]);
    const handler = vi.fn(async () => false as const);
    expect(await processBackgroundSyncQueue(handler)).toEqual({processed:0,failed:1,skipped:0});
    expect(rows.get(item.id)?.retries).toBe(6);
    expect(await processBackgroundSyncQueue(handler)).toEqual({processed:0,failed:0,skipped:1});
    expect(handler).toHaveBeenCalledOnce();
    expect(rows.has(item.id)).toBe(true);
  });

  it('preserves unsupported legacy entries and commits successful deletions', async () => {
    const unknown = { ...item, id: 'unknown', type: 'catering_order' };
    const { rows } = installDb([item, unknown]);
    expect(await processBackgroundSyncQueue(async row =>
      row.id === item.id ? true : 'unsupported'
    )).toEqual({ processed: 1, failed: 0, skipped: 1 });
    expect(rows.has(item.id)).toBe(false);
    expect(rows.get(unknown.id)).toEqual(unknown);
  });
});
