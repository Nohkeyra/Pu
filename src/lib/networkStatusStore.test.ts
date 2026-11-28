import { describe, it, expect, vi } from 'vitest';
import { createNetworkStatusStore } from './networkStatusStore';

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe('shared network status', () => {
  it('shares one listener and suppresses duplicate events for multiple consumers', async () => {
    let publish!: (online: boolean) => void;
    const cleanup = vi.fn();
    const source = {
      read: vi.fn(async () => true),
      listen: vi.fn(async (fn: (online: boolean) => void) => { publish = fn; return cleanup; }),
    };
    const store = createNetworkStatusStore(source);
    const first = vi.fn(), second = vi.fn();
    const offFirst = store.subscribe(first), offSecond = store.subscribe(second);
    await settle();
    expect(source.listen).toHaveBeenCalledTimes(1);
    expect(source.read).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(true);
    publish(false); publish(false); publish(true);
    expect(first).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenCalledTimes(3);
    offFirst();
    expect(cleanup).not.toHaveBeenCalled();
    publish(false);
    expect(first).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenCalledTimes(4);
    offSecond();
    await settle();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBeNull();
  });

  it('does not overwrite a newer connection event with a late initial read', async () => {
    let publish!: (online: boolean) => void;
    let finish!: (online: boolean) => void;
    const store = createNetworkStatusStore({
      listen: async fn => { publish = fn; return () => {}; },
      read: () => new Promise<boolean>(resolve => { finish = resolve; }),
    });
    const off = store.subscribe(vi.fn());
    await settle();
    publish(false);
    finish(true);
    await settle();
    expect(store.getSnapshot()).toBe(false);
    off();
  });

  it('cleans up a late listener and ignores stale callbacks after remount', async () => {
    const callbacks: Array<(online: boolean) => void> = [];
    const finishers: Array<(cleanup: () => void) => void> = [];
    const oldCleanup = vi.fn(), newCleanup = vi.fn();
    const store = createNetworkStatusStore({
      listen: fn => { callbacks.push(fn); return new Promise(resolve => finishers.push(resolve)); },
      read: async () => true,
    });
    const oldOff = store.subscribe(vi.fn());
    oldOff();
    const fresh = vi.fn(), freshOff = store.subscribe(fresh);
    finishers[0](oldCleanup);
    finishers[1](newCleanup);
    await settle();
    callbacks[0](false);
    expect(oldCleanup).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(true);
    expect(fresh).toHaveBeenCalledTimes(1);
    freshOff();
    await settle();
    expect(newCleanup).toHaveBeenCalledTimes(1);
  });
});
