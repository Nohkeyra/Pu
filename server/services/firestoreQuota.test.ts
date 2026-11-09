import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FirestoreQuotaBackoff,
  FirestoreQuotaPausedError,
  isFirestoreQuotaError,
} from './firestoreQuota';
const quota = () => Object.assign(new Error('8 RESOURCE_EXHAUSTED: Quota exceeded'), { code: 8 });
describe('shared quota recovery', () => {
  let gate: FirestoreQuotaBackoff;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    gate = new FirestoreQuotaBackoff();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it.each([8, '8', 'resource-exhausted', 'RESOURCE_EXHAUSTED'])('recognizes code %s', (code) =>
    expect(isFirestoreQuotaError({ code })).toBe(true)
  );
  it('blocks other readers and allows just one recovery probe', async () => {
    await expect(
      gate.run(async () => {
        throw quota();
      })
    ).rejects.toBeInstanceOf(FirestoreQuotaPausedError);
    const other = vi.fn(async () => true);
    await expect(gate.run(other)).rejects.toBeInstanceOf(FirestoreQuotaPausedError);
    expect(other).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000);
    let release!: (value: string) => void;
    const probe = gate.run(
      () =>
        new Promise<string>((r) => {
          release = r;
        })
    );
    await expect(gate.run(other)).rejects.toBeInstanceOf(FirestoreQuotaPausedError);
    release('ok');
    await probe;
    await expect(gate.run(other)).resolves.toBe(true);
  });
  it('caps increasing pauses at 15 minutes and resets after recovery', async () => {
    for (const seconds of [60, 120, 240, 480, 900, 900]) {
      await expect(
        gate.run(async () => {
          throw quota();
        })
      ).rejects.toBeInstanceOf(FirestoreQuotaPausedError);
      expect(gate.retryAfterSeconds).toBe(seconds);
      await vi.advanceTimersByTimeAsync(seconds * 1000);
    }
    await gate.run(async () => true);
    await expect(
      gate.run(async () => {
        throw quota();
      })
    ).rejects.toBeInstanceOf(FirestoreQuotaPausedError);
    expect(gate.retryAfterSeconds).toBe(60);
  });
  it('keeps a newer pause when an old in-flight request succeeds', async () => {
    let release!: () => void;
    const old = gate.run(
      () =>
        new Promise<void>((r) => {
          release = r;
        })
    );
    await expect(
      gate.run(async () => {
        throw quota();
      })
    ).rejects.toBeInstanceOf(FirestoreQuotaPausedError);
    release();
    await old;
    expect(gate.retryAfterSeconds).toBe(60);
  });
  it('propagates unrelated failures without pausing', async () => {
    const error = new Error('network');
    await expect(
      gate.run(async () => {
        throw error;
      })
    ).rejects.toBe(error);
    expect(gate.retryAfterSeconds).toBe(0);
    await expect(gate.run(async () => 123)).resolves.toBe(123);
  });
});
