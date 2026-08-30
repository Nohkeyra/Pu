import crypto from 'crypto';
import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import rateLimit from 'express-rate-limit';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirestore } from './firebaseAdmin.js';

export interface DistributedRateLimitDoc {
  key: string;
  prefix: string;
  totalHits: number;
  resetTimeMs: number;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

export class FirestoreDistributedStore implements Store {
  prefix: string;
  windowMs: number = 15 * 60 * 1000;
  private localFallback = new Map<string, { totalHits: number; resetTimeMs: number }>();
  private static cleanupRegistered = false;

  constructor(prefix = 'rl') {
    this.prefix = prefix;
    FirestoreDistributedStore.registerPeriodicCleanup();
  }

  init(options: Options): void {
    this.windowMs = options.windowMs || 15 * 60 * 1000;
  }

  private getDocId(key: string): string {
    const rawKey = `${this.prefix}:${key}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex').slice(0, 32);
    // Safe alphanumeric Firestore ID
    const sanitizedPrefix = this.prefix.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    return `${sanitizedPrefix}_${hash}`;
  }

  private fallbackIncrement(key: string): ClientRateLimitInfo {
    const now = Date.now();
    const existing = this.localFallback.get(key);

    if (existing && existing.resetTimeMs > now) {
      existing.totalHits += 1;
      return { totalHits: existing.totalHits, resetTime: new Date(existing.resetTimeMs) };
    }

    const resetTimeMs = now + this.windowMs;
    const entry = { totalHits: 1, resetTimeMs };
    this.localFallback.set(key, entry);
    return { totalHits: 1, resetTime: new Date(resetTimeMs) };
  }

  private fallbackDecrement(key: string): void {
    const existing = this.localFallback.get(key);
    if (existing && existing.totalHits > 0) {
      existing.totalHits -= 1;
    }
  }

  private fallbackResetKey(key: string): void {
    this.localFallback.delete(key);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const docId = this.getDocId(key);

    try {
      const db = getFirestore();
      const docRef = db.collection('rate_limits').doc(docId);

      const result = await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        let totalHits = 1;
        let resetTimeMs = now + this.windowMs;

        if (snap.exists) {
          const data = snap.data() as Partial<DistributedRateLimitDoc>;
          const storedResetTime = typeof data?.resetTimeMs === 'number' ? data.resetTimeMs : 0;

          if (storedResetTime > now) {
            totalHits = (data?.totalHits || 0) + 1;
            resetTimeMs = storedResetTime;
            transaction.update(docRef, {
              totalHits,
              updatedAt: Timestamp.now(),
            });
          } else {
            // Window expired, reset counter
            totalHits = 1;
            resetTimeMs = now + this.windowMs;
            transaction.set(docRef, {
              key,
              prefix: this.prefix,
              totalHits: 1,
              resetTimeMs,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
        } else {
          transaction.set(docRef, {
            key,
            prefix: this.prefix,
            totalHits: 1,
            resetTimeMs,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }

        return { totalHits, resetTime: new Date(resetTimeMs) };
      });

      return result;
    } catch (err) {
      console.warn(`[DistributedRateLimit] Firestore increment failed for key ${key}, using memory fallback:`, err instanceof Error ? err.message : err);
      return this.fallbackIncrement(key);
    }
  }

  async decrement(key: string): Promise<void> {
    const docId = this.getDocId(key);
    try {
      const db = getFirestore();
      const docRef = db.collection('rate_limits').doc(docId);

      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        if (snap.exists) {
          const data = snap.data() as Partial<DistributedRateLimitDoc>;
          const currentHits = data?.totalHits || 0;
          if (currentHits > 0) {
            transaction.update(docRef, {
              totalHits: currentHits - 1,
              updatedAt: Timestamp.now(),
            });
          }
        }
      });
    } catch (err) {
      console.warn(`[DistributedRateLimit] Firestore decrement failed for key ${key}, using memory fallback:`, err instanceof Error ? err.message : err);
      this.fallbackDecrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    const docId = this.getDocId(key);
    try {
      const db = getFirestore();
      await db.collection('rate_limits').doc(docId).delete();
    } catch (err) {
      console.warn(`[DistributedRateLimit] Firestore resetKey failed for key ${key}:`, err instanceof Error ? err.message : err);
    } finally {
      this.fallbackResetKey(key);
    }
  }

  async resetAll(): Promise<void> {
    this.localFallback.clear();
    try {
      const db = getFirestore();
      const snap = await db.collection('rate_limits').where('prefix', '==', this.prefix).get();
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (err) {
      console.warn('[DistributedRateLimit] Firestore resetAll failed:', err instanceof Error ? err.message : err);
    }
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const now = Date.now();
    const docId = this.getDocId(key);

    try {
      const db = getFirestore();
      const snap = await db.collection('rate_limits').doc(docId).get();
      if (snap.exists) {
        const data = snap.data() as Partial<DistributedRateLimitDoc>;
        const resetTimeMs = typeof data?.resetTimeMs === 'number' ? data.resetTimeMs : 0;
        if (resetTimeMs > now) {
          return {
            totalHits: data?.totalHits || 0,
            resetTime: new Date(resetTimeMs),
          };
        }
      }
    } catch (err) {
      console.warn(`[DistributedRateLimit] Firestore get failed for key ${key}:`, err instanceof Error ? err.message : err);
    }

    const local = this.localFallback.get(key);
    if (local && local.resetTimeMs > now) {
      return { totalHits: local.totalHits, resetTime: new Date(local.resetTimeMs) };
    }

    return undefined;
  }

  private static registerPeriodicCleanup(): void {
    if (this.cleanupRegistered) return;
    this.cleanupRegistered = true;

    // Run cleanup every 30 minutes in background
    setInterval(async () => {
      try {
        const now = Date.now();
        const db = getFirestore();
        // Delete records expired more than 1 hour ago
        const cutoff = now - (60 * 60 * 1000);
        const expiredSnap = await db.collection('rate_limits')
          .where('resetTimeMs', '<', cutoff)
          .limit(100)
          .get();

        if (!expiredSnap.empty) {
          const batch = db.batch();
          expiredSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          console.log(`[DistributedRateLimit] Cleaned up ${expiredSnap.size} expired rate limit entries.`);
        }
      } catch {
        // Silent cleanup error
      }
    }, 30 * 60 * 1000).unref();
  }
}

/**
 * Creates a distributed rate limiter middleware backed by Firestore
 * with automatic memory fallback for high availability across multiple server instances.
 */
export function createDistributedRateLimiter(options: Partial<Options> & { prefix: string }) {
  const { prefix, ...restOptions } = options;
  const store = new FirestoreDistributedStore(prefix);

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: { success: false, error: 'Too many requests. Please try again later.' },
    ...restOptions,
  });
}
