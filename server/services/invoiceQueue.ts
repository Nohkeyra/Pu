import { getFirestore } from '../firebaseAdmin.js';
import { createBrevoTransporter } from '../emailService.js';
import { generateServerInvoicePdf } from './serverPdfService.js';
import { telemetry } from '../telemetry.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomUUID, createHash } from 'crypto';

export interface InvoiceDeliveryJob {
  orderId: string;
  orderForPdf: Record<string, any>;
  invoiceNo: string;
  recipientEmail: string;
  totalAmount: number;
  companyName: string;
  lang: 'en' | 'bm';
  /**
   * Stable key identifying the logical delivery. Defaults to `${orderId}:${invoiceNo}`
   * (both fixed by the billing transaction). Never derive it from timestamps.
   */
  idempotencyKey?: string;
  attempts?: number;
  maxRetries?: number;
}

/** Audit metadata for an intentional re-send of an already-queued invoice. */
export interface InvoiceResendRequest {
  requestedBy: string;
  reason: string;
  /** Optional caller-supplied stable id so a retried resend request is not sent twice. */
  requestId?: string;
}

type PollKind = 'ready' | 'recovery';

interface ClaimedJob {
  data: Record<string, any>;
  attempts: number;
  maxRetries: number;
  leaseToken: string;
}

const toMillis = (v: any): number => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

/**
 * Durable Firestore-backed Invoice Outbox Service.
 *
 * Job lifecycle: pending -> processing -> delivered | failed.
 *  - Claiming is an atomic transaction that sets lockedBy, lockedUntil and a fresh
 *    per-claim `leaseToken`, and increments `attempts` (so crash loops are bounded too).
 *  - Jobs left in `processing` whose lease expired (worker crash) are recovered by a
 *    separate query and re-claimed through the same transaction.
 *  - Acknowledgement (delivered / failed) is a transaction that only applies if the job is
 *    still `processing` with the caller's `leaseToken`, so a stale worker can never
 *    overwrite a job that another worker has reclaimed.
 *  - A job whose attempts are exhausted stays in the collection as `status: 'failed'` with
 *    `attempts >= maxRetries`, `failedPermanentlyAt` and `lastError` for diagnosis. To retry it
 *    manually, set status back to 'pending' and attempts to 0 on that document.
 *
 * NOTE ON SMTP DELIVERY SEMANTICS:
 * SMTP providers do not guarantee exactly-once delivery. If a worker crashes after the SMTP
 * send but before acknowledgement, the job is retried after lease expiry (at-least-once).
 * Likewise a worker that outlives its lease may send once more before its acknowledgement is
 * rejected as stale.
 */
export class DurableInvoiceOutboxService {
  private workerId = `worker_${randomUUID().slice(0, 8)}`;
  private isPolling = false;
  private pollIntervalMs = 5000;
  private leaseDurationMs = 60_000; // 1 minute lease lock
  private maxRetries = 3;
  private timer: NodeJS.Timeout | null = null;

  // Permanent Firestore errors (e.g. 9 FAILED_PRECONDITION: missing composite index)
  // cannot be fixed by retrying every poll. Each query pauses independently with
  // exponential backoff, so a missing recovery index cannot stall normal deliveries.
  private static readonly BLOCK_BASE_MS = 60_000;
  private static readonly BLOCK_MAX_MS = 15 * 60_000;
  private queryState: Record<PollKind, { blockedUntilMs: number; backoffMs: number }> = {
    ready: { blockedUntilMs: 0, backoffMs: DurableInvoiceOutboxService.BLOCK_BASE_MS },
    recovery: { blockedUntilMs: 0, backoffMs: DurableInvoiceOutboxService.BLOCK_BASE_MS },
  };

  constructor() {
    this.startBackgroundWorker();
  }

  /** Firestore document ids cannot contain '/', so unsafe keys are hashed deterministically. */
  private jobIdForKey(key: string): string {
    const safe = /^[A-Za-z0-9_-]{1,100}$/.test(key);
    return `outbox_${safe ? key : createHash('sha256').update(key).digest('hex').slice(0, 40)}`;
  }

  private defaultKey(job: InvoiceDeliveryJob): string {
    if (!job.orderId || !job.invoiceNo) {
      throw new Error('Invoice outbox job requires orderId and invoiceNo (or an explicit idempotencyKey).');
    }
    return `invoice:${job.orderId}:${job.invoiceNo}`;
  }

  private buildDoc(job: InvoiceDeliveryJob, key: string, extra: Record<string, any> = {}) {
    const now = Timestamp.now();
    return {
      orderId: job.orderId,
      orderForPdf: job.orderForPdf,
      invoiceNo: job.invoiceNo,
      recipientEmail: job.recipientEmail,
      totalAmount: job.totalAmount,
      companyName: job.companyName,
      lang: job.lang || 'bm',
      kind: 'invoice',
      idempotencyKey: key,
      status: 'pending',
      attempts: 0,
      maxRetries: job.maxRetries || this.maxRetries,
      lockedBy: null,
      lockedUntil: null,
      leaseToken: null,
      createdAt: now,
      updatedAt: now,
      lastError: null,
      ...extra,
    };
  }

  private isAlreadyExists(err: unknown): boolean {
    const e = err as { code?: unknown; message?: unknown } | null;
    return e?.code === 6 || e?.code === 'already-exists' || /ALREADY_EXISTS/.test(String(e?.message ?? ''));
  }

  /**
   * Enqueue an invoice delivery job. Idempotent: the job id is derived from the idempotency
   * key and the document is created only if absent, so a duplicate enqueue never modifies an
   * existing job (in particular a `delivered` job is never reset to `pending`).
   * The first write wins; a later duplicate's payload is ignored. Returns the job id.
   */
  public async enqueue(job: InvoiceDeliveryJob): Promise<string> {
    const db = getFirestore();
    const key = job.idempotencyKey || this.defaultKey(job);
    const jobId = this.jobIdForKey(key);

    try {
      await db.collection('invoice_outbox').doc(jobId).create(this.buildDoc(job, key));
      telemetry.captureBreadcrumb('Enqueued durable invoice outbox job', {
        jobId,
        orderId: job.orderId,
        invoiceNo: job.invoiceNo,
        recipient: job.recipientEmail,
      });
      return jobId;
    } catch (err) {
      if (this.isAlreadyExists(err)) {
        telemetry.captureBreadcrumb('Duplicate invoice outbox enqueue ignored (idempotent)', {
          jobId,
          orderId: job.orderId,
          invoiceNo: job.invoiceNo,
        });
        return jobId;
      }
      telemetry.captureException(err, {
        metadata: { component: 'DurableInvoiceOutboxService', action: 'enqueue', orderId: job.orderId }
      });
      throw err;
    }
  }

  /**
   * Intentionally re-send an invoice. Creates a SEPARATE, auditable job (kind 'resend') that
   * records who asked and why, and links to the original job. It never touches the original.
   * Pass `requestId` to make a retried resend request idempotent; without it every call is a
   * new job (an explicit, repeated human action).
   */
  public async enqueueResend(job: InvoiceDeliveryJob, resend: InvoiceResendRequest): Promise<string> {
    const requestedBy = resend?.requestedBy?.trim();
    const reason = resend?.reason?.trim();
    if (!requestedBy || !reason) {
      throw new Error('Invoice resend requires requestedBy and reason for the audit trail.');
    }

    const db = getFirestore();
    const originalKey = job.idempotencyKey || this.defaultKey(job);
    const resendOf = this.jobIdForKey(originalKey);
    const requestId = resend.requestId?.trim();
    const col = db.collection('invoice_outbox');
    const docRef = requestId
      ? col.doc(this.jobIdForKey(`resend:${originalKey}:${requestId}`))
      : col.doc();

    const doc = this.buildDoc(job, `resend:${originalKey}:${requestId || docRef.id}`, {
      kind: 'resend',
      resendOf,
      requestedBy,
      resendReason: reason,
      resendRequestedAt: Timestamp.now(),
    });

    try {
      await docRef.create(doc);
      telemetry.captureBreadcrumb('Enqueued invoice resend job', {
        jobId: docRef.id,
        resendOf,
        orderId: job.orderId,
        invoiceNo: job.invoiceNo,
        requestedBy,
      });
    } catch (err) {
      if (!this.isAlreadyExists(err)) throw err;
    }
    return docRef.id;
  }

  public startBackgroundWorker(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processQueue().catch(err => {
        console.error('[InvoiceOutbox] Background worker cycle error:', err);
      });
    }, this.pollIntervalMs);
  }

  public stopBackgroundWorker(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async processQueue(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;
    try {
      await this.drain('ready');
      await this.drain('recovery');
    } finally {
      this.isPolling = false;
    }
  }

  private buildQuery(kind: PollKind, nowMs: number) {
    const col = getFirestore().collection('invoice_outbox');
    if (kind === 'ready') {
      // Index: invoice_outbox (status ASC, attempts ASC)
      return col
        .where('status', 'in', ['pending', 'failed'])
        .where('attempts', '<', this.maxRetries)
        .limit(5);
    }
    // Crash recovery: leases that have expired.
    // Index: invoice_outbox (status ASC, lockedUntil ASC)
    return col
      .where('status', '==', 'processing')
      .where('lockedUntil', '<=', Timestamp.fromMillis(nowMs))
      .limit(5);
  }

  private async drain(kind: PollKind): Promise<void> {
    const state = this.queryState[kind];
    const nowMs = Date.now();
    if (nowMs < state.blockedUntilMs) return;

    try {
      const snapshot = await this.buildQuery(kind, nowMs).get();

      // Query is healthy again (e.g. index finished building): clear any backoff.
      state.blockedUntilMs = 0;
      state.backoffMs = DurableInvoiceOutboxService.BLOCK_BASE_MS;

      for (const docSnap of snapshot.docs) {
        const claimed = await this.claim(docSnap.ref);
        if (claimed) {
          await this.executeJob(docSnap.id, claimed);
        }
      }
    } catch (err) {
      if (this.isPermanentFirestoreError(err)) {
        const waitMs = state.backoffMs;
        state.blockedUntilMs = Date.now() + waitMs;
        state.backoffMs = Math.min(waitMs * 2, DurableInvoiceOutboxService.BLOCK_MAX_MS);
        const msg = err instanceof Error ? err.message : String(err);
        const link = msg.match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0];
        console.error(
          `[InvoiceOutbox] Permanent Firestore error (FAILED_PRECONDITION) on '${kind}' query; pausing it for ${Math.round(waitMs / 1000)}s. ` +
          `Pending jobs are preserved. Deploy the invoice_outbox indexes from firestore.indexes.json.` +
          (link ? ` Index link: ${link}` : '')
        );
      } else {
        console.error(`[InvoiceOutbox] Process queue error (${kind}):`, err);
      }
    }
  }

  private isPermanentFirestoreError(err: unknown): boolean {
    const e = err as { code?: unknown; message?: unknown } | null;
    return e?.code === 9 || e?.code === 'failed-precondition' ||
      /FAILED_PRECONDITION/.test(String(e?.message ?? ''));
  }

  /**
   * Atomically claim a job (new work or an expired lease). Returns null if another worker
   * holds a live lease, the job is delivered/exhausted, or it was just dead-lettered.
   */
  private async claim(ref: FirebaseFirestore.DocumentReference): Promise<ClaimedJob | null> {
    const db = getFirestore();
    const leaseToken = randomUUID();

    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const d = snap.data()!;
        const nowMs = Date.now();
        const attempts = d.attempts || 0;
        const maxRetries = d.maxRetries || this.maxRetries;
        const orderRef = db.collection('orders').doc(d.orderId);

        if (d.status === 'processing') {
          if (toMillis(d.lockedUntil) > nowMs) return null; // live lease held by another worker
          if (attempts >= maxRetries) {
            // Crashed/timed out on every allowed attempt: keep the job visible as failed.
            const lastError = 'Lease expired after maximum attempts (worker crash or timeout)';
            tx.update(ref, {
              status: 'failed',
              lockedBy: null,
              lockedUntil: null,
              leaseToken: null,
              lastError,
              failedPermanentlyAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            tx.set(orderRef, {
              invoiceDeliveryStatus: 'failed',
              invoiceDeliveryError: lastError,
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return null;
          }
        } else if (d.status === 'pending' || d.status === 'failed') {
          if (attempts >= maxRetries) return null;
        } else {
          return null; // delivered or unknown
        }

        tx.update(ref, {
          status: 'processing',
          lockedBy: this.workerId,
          lockedUntil: Timestamp.fromMillis(nowMs + this.leaseDurationMs),
          leaseToken,
          attempts: attempts + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(orderRef, {
          invoiceDeliveryStatus: 'processing',
          invoiceDeliveryAttempt: attempts + 1,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return { data: d, attempts: attempts + 1, maxRetries, leaseToken };
      });
    } catch (err) {
      console.error('[InvoiceOutbox] Claim transaction failed:', err);
      return null;
    }
  }

  private async executeJob(jobId: string, claimed: ClaimedJob): Promise<void> {
    const { data } = claimed;

    try {
      // 1. Generate PDF server-side with server-derived values
      const pdfBuffer = await generateServerInvoicePdf(data.orderForPdf, true);

      // 2. Email PDF via SMTP
      const transporter = createBrevoTransporter();
      const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;

      await transporter.sendMail({
        from: `"Restoran Wawasan Pak Usop" <${senderEmail}>`,
        to: data.recipientEmail.trim(),
        subject: data.lang === 'bm'
          ? `[Restoran Wawasan] Invois Rasmi ${data.invoiceNo} - ${data.companyName}`
          : `[Restoran Wawasan] Official Invoice ${data.invoiceNo} - ${data.companyName}`,
        text: data.lang === 'bm'
          ? `Salam hormat,\n\nSila rujuk invois rasmi kami ${data.invoiceNo} yang dilampirkan bersama emel ini.\n\nJumlah: RM ${Number(data.totalAmount).toFixed(2)}\n\nTerima kasih atas kepercayaan anda.\n\nRestoran Wawasan Pak Usop\nUnit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya`
          : `Dear ${data.companyName},\n\nPlease find our official invoice ${data.invoiceNo} attached to this email.\n\nTotal: RM ${Number(data.totalAmount).toFixed(2)}\n\nThank you for your continued trust.\n\nRestoran Wawasan Pak Usop\nUnit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya`,
        attachments: [{
          filename: `Invoice_${data.invoiceNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      });
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[InvoiceOutbox] Job ${jobId} failed (attempt ${claimed.attempts}):`, errorMsg);

      telemetry.captureException(err, {
        metadata: { component: 'DurableInvoiceOutboxService', jobId, orderId: data.orderId }
      });

      await this.acknowledgeFailure(jobId, claimed, errorMsg);
      return;
    }

    await this.acknowledgeDelivered(jobId, claimed);
    telemetry.captureBreadcrumb('Durable invoice outbox job delivered', {
      jobId,
      orderId: data.orderId,
      invoiceNo: data.invoiceNo,
    });
  }

  /** True only if the job is still processing under this exact claim. */
  private ownsLease(snap: FirebaseFirestore.DocumentSnapshot, leaseToken: string): boolean {
    if (!snap.exists) return false;
    const d = snap.data()!;
    return d.status === 'processing' && d.leaseToken === leaseToken;
  }

  private async acknowledgeDelivered(jobId: string, claimed: ClaimedJob): Promise<void> {
    const db = getFirestore();
    const ref = db.collection('invoice_outbox').doc(jobId);
    const orderRef = db.collection('orders').doc(claimed.data.orderId);
    try {
      const applied = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!this.ownsLease(snap, claimed.leaseToken)) return false;
        tx.update(ref, {
          status: 'delivered',
          lockedBy: null,
          lockedUntil: null,
          leaseToken: null,
          deliveredAt: FieldValue.serverTimestamp(),
          deliveredBy: this.workerId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(orderRef, {
          invoiceDeliveryStatus: 'delivered',
          invoiceDeliveredAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
      });
      if (!applied) {
        console.warn(`[InvoiceOutbox] Stale worker ack ignored for job ${jobId}: lease was reclaimed.`);
      }
    } catch (err) {
      // Job stays 'processing'; the lease expires and recovery re-claims it (at-least-once).
      console.error(`[InvoiceOutbox] Failed to acknowledge delivery of job ${jobId}:`, err);
    }
  }

  private async acknowledgeFailure(jobId: string, claimed: ClaimedJob, errorMsg: string): Promise<void> {
    const db = getFirestore();
    const ref = db.collection('invoice_outbox').doc(jobId);
    const orderRef = db.collection('orders').doc(claimed.data.orderId);
    const isPermanent = claimed.attempts >= claimed.maxRetries;
    try {
      const applied = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!this.ownsLease(snap, claimed.leaseToken)) return false;
        tx.update(ref, {
          // Retryable failures are re-queried while attempts < maxRetries; exhausted ones stay
          // as failed (never deleted) for diagnosis and manual recovery.
          status: 'failed',
          lockedBy: null,
          lockedUntil: null,
          leaseToken: null,
          lastError: errorMsg,
          ...(isPermanent ? { failedPermanentlyAt: FieldValue.serverTimestamp() } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (isPermanent) {
          tx.set(orderRef, {
            invoiceDeliveryStatus: 'failed',
            invoiceDeliveryError: errorMsg,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        return true;
      });
      if (!applied) {
        console.warn(`[InvoiceOutbox] Stale worker failure write ignored for job ${jobId}: lease was reclaimed.`);
      }
    } catch (err) {
      console.error(`[InvoiceOutbox] Failed to record failure of job ${jobId}:`, err);
    }
  }

  /**
   * Public alias to enqueue (backward compatible with previous in-memory queue usage)
   */
  public enqueueLegacy(job: Omit<InvoiceDeliveryJob, 'attempts' | 'maxRetries'>): void {
    this.enqueue(job as InvoiceDeliveryJob).catch(err => {
      console.error('[InvoiceOutbox] Failed to enqueue legacy job:', err);
    });
  }
}

// Single shared service: constructing one starts a polling timer, so enqueue()
// must reuse this instance rather than creating a new worker per call.
const sharedService = new DurableInvoiceOutboxService();

export const invoiceQueue = {
  enqueue: (job: Omit<InvoiceDeliveryJob, 'attempts' | 'maxRetries'>) => {
    sharedService.enqueue(job as InvoiceDeliveryJob).catch(err => {
      console.error('[InvoiceOutbox] Enqueue error:', err);
    });
  },
  /** Intentional, audited re-send as a separate job. Not wired to any route. */
  enqueueResend: (job: Omit<InvoiceDeliveryJob, 'attempts' | 'maxRetries'>, resend: InvoiceResendRequest) =>
    sharedService.enqueueResend(job as InvoiceDeliveryJob, resend),
  // Export singleton service instance
  service: sharedService,
};
