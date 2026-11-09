export class FirestoreQuotaPausedError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterMs: number) {
    super('Firestore is temporarily unavailable because of a quota limit.');
    this.name = 'FirestoreQuotaPausedError';
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  }
}
export function isFirestoreQuotaError(error: unknown): boolean {
  if (error instanceof FirestoreQuotaPausedError) return true;
  const e = error as { code?: unknown; message?: unknown } | null;
  return (
    e?.code === 8 ||
    e?.code === '8' ||
    /^(?:resource[-_]exhausted)$/i.test(String(e?.code ?? '')) ||
    /RESOURCE_EXHAUSTED|quota exceeded/i.test(String(e?.message ?? ''))
  );
}
/** Process-local pause shared by background reads, calendar reads and rate-limit sync. */
export class FirestoreQuotaBackoff {
  private blockedUntil = 0;
  private delayMs = 60_000;
  private recovering = false;
  private probing = false;
  private revision = 0;
  get retryAfterSeconds(): number {
    return Math.max(this.probing ? 1 : 0, Math.ceil((this.blockedUntil - Date.now()) / 1000), 0);
  }
  reset(): void {
    this.blockedUntil = 0;
    this.delayMs = 60_000;
    this.recovering = false;
    this.probing = false;
    this.revision++;
  }
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.retryAfterSeconds > 0)
      throw new FirestoreQuotaPausedError(this.retryAfterSeconds * 1000);
    const revision = this.revision,
      probe = this.recovering;
    if (probe) this.probing = true;
    try {
      const result = await operation();
      // A success from an older request must not clear a newer quota failure.
      if (probe && revision === this.revision) this.reset();
      return result;
    } catch (error) {
      if (isFirestoreQuotaError(error) && !(error instanceof FirestoreQuotaPausedError)) {
        if (revision === this.revision) {
          const waitMs = this.delayMs;
          this.blockedUntil = Date.now() + waitMs;
          this.delayMs = Math.min(15 * 60_000, waitMs * 2);
          this.recovering = true;
          this.revision++;
          console.warn(
            '[Firestore] RESOURCE_EXHAUSTED; pausing background/calendar reads and rate-limit sync for ' +
              waitMs / 1000 +
              's. Jobs remain stored; quota recovery time is not known.'
          );
        }
        throw new FirestoreQuotaPausedError(this.retryAfterSeconds * 1000);
      }
      if (probe && revision === this.revision && !(error instanceof FirestoreQuotaPausedError))
        this.reset();
      throw error;
    } finally {
      if (probe) this.probing = false;
    }
  }
}
export const firestoreQuota = new FirestoreQuotaBackoff();
