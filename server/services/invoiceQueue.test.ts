import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// In-memory Firestore fake. Transactions use optimistic concurrency like the real
// thing: every document read is version-checked at commit, and a conflict re-runs
// the callback. This lets the tests exercise genuine claim races.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({ db: null as any, sendMail: null as any }));

vi.mock('../firebaseAdmin.js', () => ({ getFirestore: () => h.db }));
vi.mock('../emailService.js', () => ({
  createBrevoTransporter: () => ({ sendMail: (...a: any[]) => h.sendMail(...a) }),
}));
vi.mock('./serverPdfService.js', () => ({
  generateServerInvoicePdf: vi.fn(async () => Buffer.from('pdf')),
}));

import { invoiceQueue, DurableInvoiceOutboxService } from './invoiceQueue.js';

const norm = (v: any) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v);

function matches(field: any, op: string, value: any): boolean {
  const a = norm(field);
  const b = norm(value);
  switch (op) {
    case '==': return a === b;
    case 'in': return (b as any[]).includes(a);
    case '<': return a !== undefined && a !== null && a < b;
    case '<=': return a !== undefined && a !== null && a <= b;
    default: throw new Error(`unsupported op ${op}`);
  }
}

class FakeSnap {
  constructor(public ref: FakeRef, private d: Record<string, any> | undefined) {}
  get id() { return this.ref.id; }
  get exists() { return this.d !== undefined; }
  data() { return this.d ? { ...this.d } : undefined; }
}

class FakeRef {
  constructor(public db: FakeDb, public col: string, public id: string) {}
  get path() { return `${this.col}/${this.id}`; }
  async get() { await Promise.resolve(); return this.db.snap(this); }
  async set(data: any, opts?: { merge?: boolean }) { this.db.write(this.path, data, opts?.merge ? 'merge' : 'set'); }
  async update(data: any) { this.db.write(this.path, data, 'update'); }
  async create(data: any) { this.db.write(this.path, data, 'create'); }
}

class FakeQuery {
  constructor(
    protected db: FakeDb,
    protected col: string,
    protected filters: Array<[string, string, any]> = [],
    protected lim?: number,
  ) {}
  where(f: string, op: string, v: any) { return new FakeQuery(this.db, this.col, [...this.filters, [f, op, v]], this.lim); }
  limit(n: number) { return new FakeQuery(this.db, this.col, this.filters, n); }
  async get() {
    this.db.queryLog.push({ collection: this.col, filters: this.filters });
    const err = this.db.queryError?.(this.filters);
    if (err) throw err;
    await Promise.resolve();
    const docs: FakeSnap[] = [];
    for (const [path, e] of this.db.store) {
      if (!path.startsWith(this.col + '/')) continue;
      if (this.filters.every(([f, op, v]) => matches(e.data[f], op, v))) {
        docs.push(new FakeSnap(new FakeRef(this.db, this.col, path.slice(this.col.length + 1)), e.data));
      }
    }
    return { docs: this.lim ? docs.slice(0, this.lim) : docs };
  }
}

class FakeCollection extends FakeQuery {
  doc(id?: string) { return new FakeRef(this.db, this.col, id ?? `auto_${++this.db.autoId}`); }
}

class FakeDb {
  store = new Map<string, { data: Record<string, any>; version: number }>();
  queryLog: Array<{ collection: string; filters: Array<[string, string, any]> }> = [];
  queryError: ((filters: Array<[string, string, any]>) => Error | null) | null = null;
  autoId = 0;
  txConflicts = 0;

  collection(name: string) { return new FakeCollection(this, name); }
  snap(ref: FakeRef) { return new FakeSnap(ref, this.store.get(ref.path)?.data); }

  write(path: string, data: any, mode: 'set' | 'merge' | 'update' | 'create') {
    const existing = this.store.get(path);
    if (mode === 'create' && existing) {
      throw Object.assign(new Error('6 ALREADY_EXISTS: Document already exists'), { code: 6 });
    }
    if (mode === 'update' && !existing) {
      throw Object.assign(new Error('5 NOT_FOUND: No document to update'), { code: 5 });
    }
    const next = mode === 'merge' || mode === 'update' ? { ...(existing?.data ?? {}), ...data } : { ...data };
    this.store.set(path, { data: next, version: (existing?.version ?? 0) + 1 });
  }

  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reads = new Map<string, number>();
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: FakeRef) => {
          await Promise.resolve();
          reads.set(ref.path, this.store.get(ref.path)?.version ?? 0);
          return this.snap(ref);
        },
        update: (ref: FakeRef, data: any) => { writes.push(() => this.write(ref.path, data, 'update')); },
        set: (ref: FakeRef, data: any, opts?: { merge?: boolean }) => {
          writes.push(() => this.write(ref.path, data, opts?.merge ? 'merge' : 'set'));
        },
      };
      const result = await fn(tx);
      const conflict = [...reads].some(([p, v]) => (this.store.get(p)?.version ?? 0) !== v);
      if (conflict) { this.txConflicts++; continue; }
      writes.forEach(w => w());
      return result;
    }
    throw new Error('transaction aborted after retries');
  }
}

// ---------------------------------------------------------------------------
const T0 = new Date('2026-10-23T00:00:00Z').getTime();
const OUTBOX = 'invoice_outbox';

const baseJob = (o: Record<string, any> = {}) => ({
  orderId: 'o1',
  orderForPdf: { id: 'o1' },
  invoiceNo: 'RW 001',
  recipientEmail: 'client@example.test',
  totalAmount: 100,
  companyName: 'Co',
  lang: 'en' as const,
  ...o,
});

const seed = (id: string, o: Record<string, any> = {}) => {
  h.db.store.set(`${OUTBOX}/${id}`, {
    version: 1,
    data: {
      ...baseJob(),
      kind: 'invoice',
      status: 'pending',
      attempts: 0,
      maxRetries: 3,
      lockedBy: null,
      lockedUntil: null,
      leaseToken: null,
      lastError: null,
      ...o,
    },
  });
};
const doc = (id: string) => h.db.store.get(`${OUTBOX}/${id}`)?.data;
const order = (id: string) => h.db.store.get(`orders/${id}`)?.data;
const outboxIds = () => [...h.db.store.keys()].filter(k => k.startsWith(`${OUTBOX}/`)).map(k => k.slice(OUTBOX.length + 1));
const deferred = <T = unknown>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('DurableInvoiceOutboxService', () => {
  let a: DurableInvoiceOutboxService;
  let b: DurableInvoiceOutboxService;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    h.db = new FakeDb();
    h.sendMail = vi.fn().mockResolvedValue({});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    invoiceQueue.service.stopBackgroundWorker();
    a = new DurableInvoiceOutboxService();
    b = new DurableInvoiceOutboxService();
    a.stopBackgroundWorker();
    b.stopBackgroundWorker();
  });

  afterEach(() => {
    a.stopBackgroundWorker();
    b.stopBackgroundWorker();
    vi.useRealTimers();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  // ------------------------------------------------------------------ queries
  describe('queries and index-error backoff', () => {
    it('uses single-field queries on status (built-in index)', async () => {
      await a.processQueue();
      expect(h.db.queryLog).toHaveLength(2);
      expect(h.db.queryLog[0].collection).toBe(OUTBOX);
      expect(h.db.queryLog[0].filters).toEqual([
        ['status', 'in', ['pending', 'failed']],
      ]);
      const recovery = h.db.queryLog[1].filters;
      expect(recovery).toEqual([
        ['status', '==', 'processing'],
      ]);
    });

    it('pauses each query after FAILED_PRECONDITION and doubles the pause', async () => {
      h.db.queryError = () => Object.assign(new Error('9 FAILED_PRECONDITION: The query requires an index. https://console.firebase.google.com/x'), { code: 9 });
      await a.processQueue();
      expect(h.db.queryLog).toHaveLength(2);

      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(Date.now() + 5_000);
        await a.processQueue();
      }
      expect(h.db.queryLog).toHaveLength(2); // still inside the 60s pause

      vi.setSystemTime(T0 + 60_001);
      await a.processQueue();
      expect(h.db.queryLog).toHaveLength(4); // retried once, pause now 120s

      vi.setSystemTime(T0 + 60_001 + 60_001);
      await a.processQueue();
      expect(h.db.queryLog).toHaveLength(4); // still paused

      vi.setSystemTime(T0 + 60_001 + 120_001);
      await a.processQueue();
      expect(h.db.queryLog).toHaveLength(6);
    });

    it('handles query failures gracefully without stalling queue worker', async () => {
      h.db.queryError = (f) => (f.some(x => x[0] === 'status' && x[2] === 'processing')
        ? Object.assign(new Error('9 FAILED_PRECONDITION: needs index'), { code: 9 })
        : null);
      seed('job1');
      await a.processQueue();
      expect(doc('job1')!.status).toBe('delivered');
      expect(h.sendMail).toHaveBeenCalledTimes(1);
    });

    it('does not pause on ordinary transient errors', async () => {
      h.db.queryError = () => new Error('network blip');
      await a.processQueue();
      await a.processQueue();
      expect(h.db.queryLog).toHaveLength(4);
    });
  });

  // ------------------------------------------------------- expired-lease recovery
  describe('expired lease recovery', () => {
    it('re-claims and delivers a job whose processing lease expired', async () => {
      seed('job1', { status: 'processing', attempts: 1, lockedBy: 'dead_worker', leaseToken: 'old', lockedUntil: Timestamp.fromMillis(T0 - 1_000) });
      await a.processQueue();

      const d = doc('job1')!;
      expect(d.status).toBe('delivered');
      expect(d.attempts).toBe(2);
      expect(d.leaseToken).toBeNull();
      expect(d.lockedBy).toBeNull();
      expect(d.deliveredBy).toBe((a as any).workerId);
      expect(h.sendMail).toHaveBeenCalledTimes(1);
      expect(order('o1')!.invoiceDeliveryStatus).toBe('delivered');
    });

    it('leaves a job with a live lease alone', async () => {
      seed('job1', { status: 'processing', attempts: 1, lockedBy: 'live_worker', leaseToken: 'live', lockedUntil: Timestamp.fromMillis(T0 + 30_000) });
      await a.processQueue();
      expect(doc('job1')!.status).toBe('processing');
      expect(doc('job1')!.leaseToken).toBe('live');
      expect(h.sendMail).not.toHaveBeenCalled();
    });

    it('dead-letters an expired job that already used all attempts, keeping it visible', async () => {
      seed('job1', { status: 'processing', attempts: 3, lockedBy: 'dead_worker', leaseToken: 'old', lockedUntil: Timestamp.fromMillis(T0 - 1_000) });
      await a.processQueue();

      const d = doc('job1')!;
      expect(d).toBeDefined();
      expect(d.status).toBe('failed');
      expect(d.attempts).toBe(3);
      expect(d.lastError).toContain('Lease expired');
      expect(d.failedPermanentlyAt).toBeDefined();
      expect(d.leaseToken).toBeNull();
      expect(h.sendMail).not.toHaveBeenCalled();
      expect(order('o1')!.invoiceDeliveryStatus).toBe('failed');

      await a.processQueue(); // never picked up again
      expect(h.sendMail).not.toHaveBeenCalled();
      expect(doc('job1')!.attempts).toBe(3);
    });

    it('bounds send failures to maxRetries and keeps the failed job for diagnosis', async () => {
      h.sendMail.mockRejectedValue(new Error('smtp down'));
      seed('job1');

      // Attempt 1
      await a.processQueue();
      expect(doc('job1')!.status).toBe('failed');
      expect(doc('job1')!.attempts).toBe(1);
      const next1 = norm(doc('job1')!.nextRetryAt);
      expect(next1).toBeGreaterThan(T0);

      // Advance time past 1st retry
      vi.setSystemTime(next1 + 10);
      // Attempt 2
      await a.processQueue();
      expect(doc('job1')!.status).toBe('failed');
      expect(doc('job1')!.attempts).toBe(2);
      const next2 = norm(doc('job1')!.nextRetryAt);
      expect(next2).toBeGreaterThan(next1);

      // Advance time past 2nd retry
      vi.setSystemTime(next2 + 10);
      // Attempt 3 (final attempt for maxRetries = 3)
      await a.processQueue();

      expect(h.sendMail).toHaveBeenCalledTimes(3);
      const d = doc('job1')!;
      expect(d.status).toBe('failed');
      expect(d.attempts).toBe(3);
      expect(d.isPermanent).toBe(true);
      expect(d.lastError).toBe('smtp down');
      expect(d.failedPermanentlyAt).toBeDefined();
      expect(order('o1')!.invoiceDeliveryStatus).toBe('failed');
    });
  });

  // ------------------------------------------------ retry backoff & jitter
  describe('bounded retry backoff, jitter, restart persistence & permanent errors', () => {
    it('computes exponential backoff delay with equal jitter bounds', () => {
      // Test attempt 1 (base 5000ms, max 300000ms)
      const minJitter1 = a.computeRetryDelayMs(1, () => 0);
      const maxJitter1 = a.computeRetryDelayMs(1, () => 1);
      expect(minJitter1).toBe(2500);
      expect(maxJitter1).toBe(5000);

      // Test attempt 2 (10000ms exp delay)
      const minJitter2 = a.computeRetryDelayMs(2, () => 0);
      const maxJitter2 = a.computeRetryDelayMs(2, () => 1);
      expect(minJitter2).toBe(5000);
      expect(maxJitter2).toBe(10000);

      // Test attempt 3 (20000ms exp delay)
      const minJitter3 = a.computeRetryDelayMs(3, () => 0);
      const maxJitter3 = a.computeRetryDelayMs(3, () => 1);
      expect(minJitter3).toBe(10000);
      expect(maxJitter3).toBe(20000);

      // Test maximum cap at 300,000ms
      const minJitterCap = a.computeRetryDelayMs(10, () => 0);
      const maxJitterCap = a.computeRetryDelayMs(10, () => 1);
      expect(minJitterCap).toBe(150000);
      expect(maxJitterCap).toBe(300000);
    });

    it('persists nextRetryAt in Firestore so retry delay survives server restarts', async () => {
      h.sendMail.mockRejectedValue(new Error('transient connection failure'));
      const jobId = await a.enqueue(baseJob());

      // Worker A attempts delivery and fails
      await a.processQueue();
      const jobAfterFail = doc(jobId)!;
      expect(jobAfterFail.status).toBe('failed');
      expect(jobAfterFail.attempts).toBe(1);
      expect(jobAfterFail.isPermanent).toBe(false);
      expect(jobAfterFail.nextRetryAt).toBeDefined();

      const nextRetryAtMs = norm(jobAfterFail.nextRetryAt);
      expect(nextRetryAtMs).toBeGreaterThan(T0);

      // Server A shuts down
      a.stopBackgroundWorker();

      // Before nextRetryAtMs, a new Server C boots up and attempts processQueue
      const c = new DurableInvoiceOutboxService();
      c.stopBackgroundWorker();
      await c.processQueue();
      expect(doc(jobId)!.attempts).toBe(1); // not claimed before retry time!
      expect(h.sendMail).toHaveBeenCalledTimes(1);

      // Fast-forward past nextRetryAtMs
      vi.setSystemTime(nextRetryAtMs + 50);

      // Server C runs processQueue again -> now eligible!
      h.sendMail.mockResolvedValueOnce({});
      await c.processQueue();

      expect(doc(jobId)!.status).toBe('delivered');
      expect(doc(jobId)!.attempts).toBe(2);
      expect(h.sendMail).toHaveBeenCalledTimes(2);
      c.stopBackgroundWorker();
    });

    it('immediately classifies invalid recipient email as a permanent failure', async () => {
      const invalidJob = baseJob({ recipientEmail: 'invalid-email-address-no-at-symbol' });
      const jobId = await a.enqueue(invalidJob);

      h.sendMail.mockRejectedValue(new Error('Invalid email recipient'));
      await a.processQueue();

      const d = doc(jobId)!;
      expect(d.status).toBe('failed');
      expect(d.isPermanent).toBe(true);
      expect(d.nextRetryAt).toBeNull();
      expect(d.failedPermanentlyAt).toBeDefined();

      // Advance time and run again -> worker skips permanent failure
      vi.setSystemTime(T0 + 3600_000);
      await a.processQueue();
      expect(h.sendMail).toHaveBeenCalledTimes(1); // no retry
    });

    it('immediately classifies SMTP 5xx permanent response as a permanent failure', async () => {
      const jobId = await a.enqueue(baseJob());
      h.sendMail.mockRejectedValue(new Error('550 5.1.1 User unknown: recipient address rejected'));

      await a.processQueue();

      const d = doc(jobId)!;
      expect(d.status).toBe('failed');
      expect(d.isPermanent).toBe(true);
      expect(d.nextRetryAt).toBeNull();
      expect(d.failedPermanentlyAt).toBeDefined();

      // Advance time and run again -> worker skips permanent failure
      vi.setSystemTime(T0 + 3600_000);
      await a.processQueue();
      expect(h.sendMail).toHaveBeenCalledTimes(1); // no retry
    });

    it('prevents concurrent workers from claiming a job before its nextRetryAt', async () => {
      h.sendMail.mockRejectedValue(new Error('421 Service temporarily unavailable'));
      seed('job1', {
        status: 'failed',
        attempts: 1,
        nextRetryAt: Timestamp.fromMillis(T0 + 60_000),
        isPermanent: false,
      });

      await Promise.all([a.processQueue(), b.processQueue()]);
      expect(h.sendMail).not.toHaveBeenCalled();
      expect(doc('job1')!.status).toBe('failed');
      expect(doc('job1')!.attempts).toBe(1);

      // Advance time past nextRetryAt
      vi.setSystemTime(T0 + 60_001);
      h.sendMail.mockResolvedValueOnce({});
      await Promise.all([a.processQueue(), b.processQueue()]);

      expect(h.sendMail).toHaveBeenCalledTimes(1);
      expect(doc('job1')!.status).toBe('delivered');
      expect(doc('job1')!.attempts).toBe(2);
    });
  });

  // -------------------------------------------------------------- concurrent claims
  describe('concurrent claims', () => {
    it('lets exactly one of two racing workers claim and send', async () => {
      seed('job1');
      await Promise.all([a.processQueue(), b.processQueue()]);

      expect(h.sendMail).toHaveBeenCalledTimes(1);
      expect(doc('job1')!.status).toBe('delivered');
      expect(doc('job1')!.attempts).toBe(1);
      expect(h.db.txConflicts).toBeGreaterThanOrEqual(1); // the race really happened
    });

    it('lets exactly one worker reclaim an expired lease', async () => {
      seed('job1', { status: 'processing', attempts: 1, leaseToken: 'old', lockedUntil: Timestamp.fromMillis(T0 - 1_000) });
      await Promise.all([a.processQueue(), b.processQueue()]);

      expect(h.sendMail).toHaveBeenCalledTimes(1);
      expect(doc('job1')!.status).toBe('delivered');
      expect(doc('job1')!.attempts).toBe(2);
    });
  });

  // ---------------------------------------------------------------- stale workers
  describe('stale worker protection', () => {
    const startStaleScenario = async () => {
      const dA = deferred();
      const dB = deferred();
      h.sendMail.mockReset();
      h.sendMail.mockImplementationOnce(() => dA.promise).mockImplementationOnce(() => dB.promise);
      seed('job1');

      const runA = a.processQueue();
      await vi.waitFor(() => expect(h.sendMail).toHaveBeenCalledTimes(1));
      expect(doc('job1')!.status).toBe('processing');
      expect(doc('job1')!.lockedBy).toBe((a as any).workerId);

      vi.setSystemTime(T0 + 61_000); // A's 60s lease has now expired
      const runB = b.processQueue();
      await vi.waitFor(() => expect(h.sendMail).toHaveBeenCalledTimes(2));
      expect(doc('job1')!.lockedBy).toBe((b as any).workerId);
      return { dA, dB, runA, runB };
    };

    it('ignores a stale worker success after another worker delivered', async () => {
      const { dA, dB, runA, runB } = await startStaleScenario();
      dB.resolve({});
      await runB;
      expect(doc('job1')!.status).toBe('delivered');
      expect(doc('job1')!.deliveredBy).toBe((b as any).workerId);

      dA.resolve({});
      await runA;
      expect(doc('job1')!.status).toBe('delivered');
      expect(doc('job1')!.deliveredBy).toBe((b as any).workerId); // not overwritten by A
      expect(doc('job1')!.attempts).toBe(2);
    });

    it('ignores a stale worker failure after another worker delivered', async () => {
      const { dA, dB, runA, runB } = await startStaleScenario();
      dB.resolve({});
      await runB;

      dA.reject(new Error('late smtp error'));
      await runA;
      const d = doc('job1')!;
      expect(d.status).toBe('delivered');
      expect(d.lastError).toBeNull();
      expect(order('o1')!.invoiceDeliveryStatus).toBe('delivered');
    });

    it('ignores a stale acknowledgement while the new owner still holds the lease', async () => {
      const { dA, dB, runA, runB } = await startStaleScenario();
      const tokenB = doc('job1')!.leaseToken;

      dA.resolve({});
      await runA; // A finishes first but no longer owns the job
      expect(doc('job1')!.status).toBe('processing');
      expect(doc('job1')!.lockedBy).toBe((b as any).workerId);
      expect(doc('job1')!.leaseToken).toBe(tokenB);

      dB.resolve({});
      await runB;
      expect(doc('job1')!.status).toBe('delivered');
      expect(doc('job1')!.deliveredBy).toBe((b as any).workerId);
    });
  });

  // ------------------------------------------------------------------ idempotency
  describe('enqueue idempotency', () => {
    it('derives a stable key from orderId + invoiceNo and returns the same job id', async () => {
      const id1 = await a.enqueue(baseJob());
      const id2 = await a.enqueue(baseJob());
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^outbox_/);
      expect(outboxIds()).toEqual([id1]);
      expect(doc(id1)!.kind).toBe('invoice');
      expect(doc(id1)!.idempotencyKey).toBe('invoice:o1:RW 001');
      expect(doc(id1)!.status).toBe('pending');
    });

    it('never resets a delivered job to pending when enqueued again', async () => {
      const id = await a.enqueue(baseJob());
      await a.processQueue();
      const delivered = { ...doc(id)! };
      expect(delivered.status).toBe('delivered');

      await a.enqueue(baseJob());
      expect(doc(id)).toEqual(delivered); // untouched

      await a.processQueue();
      expect(h.sendMail).toHaveBeenCalledTimes(1); // no second send
    });

    it('does not reset attempts or state of an in-flight or failed job', async () => {
      const id = await a.enqueue(baseJob());
      h.db.write(`${OUTBOX}/${id}`, { status: 'failed', attempts: 2, lastError: 'boom' }, 'update');
      await a.enqueue(baseJob());
      expect(doc(id)!.status).toBe('failed');
      expect(doc(id)!.attempts).toBe(2);
      expect(doc(id)!.lastError).toBe('boom');
    });

    it('honours an explicit idempotencyKey; first write wins', async () => {
      const id1 = await a.enqueue(baseJob({ idempotencyKey: 'k-1', recipientEmail: 'first@example.test' }));
      const id2 = await a.enqueue(baseJob({ idempotencyKey: 'k-1', recipientEmail: 'second@example.test' }));
      expect(id1).toBe('outbox_k-1');
      expect(id2).toBe(id1);
      expect(doc(id1)!.recipientEmail).toBe('first@example.test');
    });

    it('treats a different invoiceNo for the same order as a distinct delivery', async () => {
      const id1 = await a.enqueue(baseJob({ invoiceNo: 'RW 001' }));
      const id2 = await a.enqueue(baseJob({ invoiceNo: 'RW 002' }));
      expect(id1).not.toBe(id2);
    });

    it('rejects a job with neither a key nor orderId + invoiceNo (no invented keys)', async () => {
      await expect(a.enqueue(baseJob({ invoiceNo: '' }))).rejects.toThrow(/orderId and invoiceNo/);
      expect(outboxIds()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------- resends
  describe('intentional resend', () => {
    const resendMeta = { requestedBy: 'admin@wawasan.test', reason: 'Client lost the email' };

    it('creates a separate, auditable job and leaves the original delivered job alone', async () => {
      const originalId = await a.enqueue(baseJob());
      await a.processQueue();
      const original = { ...doc(originalId)! };

      const resendId = await a.enqueueResend(baseJob(), resendMeta);
      expect(resendId).not.toBe(originalId);
      expect(doc(originalId)).toEqual(original);

      const r = doc(resendId)!;
      expect(r.kind).toBe('resend');
      expect(r.resendOf).toBe(originalId);
      expect(r.requestedBy).toBe('admin@wawasan.test');
      expect(r.resendReason).toBe('Client lost the email');
      expect(r.resendRequestedAt).toBeDefined();
      expect(r.status).toBe('pending');
      expect(r.attempts).toBe(0);

      await a.processQueue();
      expect(h.sendMail).toHaveBeenCalledTimes(2);
      expect(doc(resendId)!.status).toBe('delivered');
      expect(doc(originalId)).toEqual(original);
    });

    it('is idempotent for a repeated request when requestId is supplied', async () => {
      const id1 = await a.enqueueResend(baseJob(), { ...resendMeta, requestId: 'req-1' });
      await a.processQueue();
      const id2 = await a.enqueueResend(baseJob(), { ...resendMeta, requestId: 'req-1' });
      expect(id2).toBe(id1);
      expect(doc(id1)!.status).toBe('delivered'); // not reset
      expect(outboxIds()).toHaveLength(1);
    });

    it('creates a new audited job for each call without a requestId', async () => {
      const id1 = await a.enqueueResend(baseJob(), resendMeta);
      const id2 = await a.enqueueResend(baseJob(), resendMeta);
      expect(id1).not.toBe(id2);
      expect(outboxIds()).toHaveLength(2);
    });

    it('requires requestedBy and reason for the audit trail', async () => {
      await expect(a.enqueueResend(baseJob(), { requestedBy: '', reason: 'x' })).rejects.toThrow(/requestedBy and reason/);
      await expect(a.enqueueResend(baseJob(), { requestedBy: 'admin', reason: '  ' })).rejects.toThrow(/requestedBy and reason/);
      expect(outboxIds()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------- shared facade
  it('exported invoiceQueue.enqueue reuses the shared service instead of creating a new worker', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const enqueueSpy = vi.spyOn(invoiceQueue.service, 'enqueue').mockResolvedValue('job_1');

    invoiceQueue.enqueue(baseJob());

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});
