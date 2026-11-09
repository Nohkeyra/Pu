import type express from 'express';
import { createHash } from 'node:crypto';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import {
  getFirestore as getFirestoreModular,
  Timestamp,
  FieldValue,
} from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { firebaseConfig, STRICT_FIREBASE_ADMIN } from './config.js';

let adminApp: App | undefined;
let memoryFirestoreInstance: any = null;

class MemoryFirestore {
  private collections = new Map<string, Map<string, any>>();
  private transactionTail: Promise<void> = Promise.resolve();

  private getCol(name: string): Map<string, any> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  collection(name: string) {
    const col = this.getCol(name);
    const createDocRef = (id?: string) => {
      const docId = id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      return {
        id: docId,
        _colName: name,
        get: async () => {
          const data = col.get(docId);
          return {
            exists: data !== undefined,
            id: docId,
            ref: createDocRef(docId),
            data: () => (data ? { ...data } : undefined),
          };
        },
        set: async (data: any, options?: { merge?: boolean }) => {
          if (options?.merge && col.has(docId)) {
            col.set(docId, { ...col.get(docId), ...data });
          } else {
            col.set(docId, { ...data });
          }
        },
        update: async (data: any) => {
          if (!col.has(docId))
            throw new Error(`NOT_FOUND: Document ${name}/${docId} does not exist`);
          const existing = col.get(docId);
          col.set(docId, { ...existing, ...data });
        },
        delete: async () => {
          col.delete(docId);
        },
      };
    };

    // Immutable query descriptors mimic Firestore chaining. Previously these were
    // no-ops, so tests could pass with records a real Firestore query excludes.
    type Filter = { field: string; operator: string; expected: any };
    const makeQuery = (
      filters: Filter[] = [],
      ordering: Array<{ field: string; direction: string }> = [],
      maxResults?: number,
      cursor?: any
    ): any => {
      const readField = (record: any, field: string) =>
        field.split('.').reduce((value, key) => value?.[key], record);
      const compare = (a: any, b: any): number => {
        if (a === b) return 0;
        if (a === undefined || a === null) return -1;
        if (b === undefined || b === null) return 1;
        if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : 1;
        return String(a).localeCompare(String(b));
      };
      return {
        doc: (id?: string) => createDocRef(id),
        add: async (data: any) => {
          const ref = createDocRef();
          col.set(ref.id, { ...data });
          return ref;
        },
        where: (field: string, operator: string, expected: any) => {
          if (!['==', '<', '<=', '>', '>=', 'in'].includes(operator)) {
            throw new Error(`Unsupported MemoryFirestore where operator: ${operator}`);
          }
          return makeQuery(
            [...filters, { field, operator, expected }],
            ordering,
            maxResults,
            cursor
          );
        },
        orderBy: (field: string, direction = 'asc') =>
          makeQuery(filters, [...ordering, { field, direction }], maxResults, cursor),
        limit: (count: number) => {
          if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid query limit');
          return makeQuery(filters, ordering, count, cursor);
        },
        startAfter: (value: any) => makeQuery(filters, ordering, maxResults, value),
        get: async () => {
          let rows = Array.from(col.entries()).map(([id, data]) => ({
            id,
            data,
            ref: createDocRef(id),
          }));
          for (const { field, operator, expected } of filters) {
            rows = rows.filter(({ data }) => {
              const actual = readField(data, field);
              if (actual === undefined) return false;
              if (operator === '==') return actual === expected;
              if (operator === 'in') return Array.isArray(expected) && expected.includes(actual);
              const diff = compare(actual, expected);
              if (operator === '<') return diff < 0;
              if (operator === '<=') return diff <= 0;
              if (operator === '>') return diff > 0;
              return diff >= 0;
            });
          }
          if (ordering.length) {
            rows = rows.filter(({ data }) =>
              ordering.every(({ field }) => readField(data, field) !== undefined)
            );
            rows.sort((a, b) => {
              for (const { field, direction } of ordering) {
                const diff = compare(readField(a.data, field), readField(b.data, field));
                if (diff) return direction === 'desc' ? -diff : diff;
              }
              return a.id.localeCompare(b.id);
            });
          } else {
            // Firestore's implicit order for equality/in queries is document ID.
            rows.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
          }
          if (cursor !== undefined && !ordering.length) {
            const cursorId = typeof cursor === 'string' ? cursor : cursor?.id;
            if (typeof cursorId !== 'string') throw new Error('Invalid document cursor');
            rows = rows.filter(row => row.id > cursorId);
          }
          if (cursor !== undefined && ordering.length) {
            const values =
              cursor && typeof cursor.data === 'function'
                ? ordering.map(({ field }) => readField(cursor.data(), field))
                : [cursor];
            rows = rows.filter(({ data }) =>
              ordering.some(({ field, direction }, i) => {
                const diff = compare(readField(data, field), values[i]);
                return (direction === 'desc' ? -diff : diff) > 0;
              })
            );
          }
          if (maxResults !== undefined) rows = rows.slice(0, maxResults);
          const docs = rows.map(({ id, data, ref }) => ({
            id,
            ref,
            data: () => ({ ...data }),
            exists: true,
          }));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
      };
    };
    const colRef = makeQuery();
    return colRef;
  }

  batch() {
    const operations: Array<() => void> = [];
    return {
      set: (ref: any, data: any, options?: { merge?: boolean }) => {
        operations.push(() => {
          const col = this.getCol(ref._colName || 'orders');
          if (options?.merge && col.has(ref.id)) {
            col.set(ref.id, { ...col.get(ref.id), ...data });
          } else {
            col.set(ref.id, { ...data });
          }
        });
      },
      update: (ref: any, data: any) => {
        operations.push(() => {
          const col = this.getCol(ref._colName || 'orders');
          if (!col.has(ref.id))
            throw new Error(
              `NOT_FOUND: Document ${ref._colName || 'orders'}/${ref.id} does not exist`
            );
          const existing = col.get(ref.id);
          col.set(ref.id, { ...existing, ...data });
        });
      },
      delete: (ref: any) => {
        operations.push(() => {
          const col = this.getCol(ref._colName || 'orders');
          col.delete(ref.id);
        });
      },
      commit: async () => {
        for (const op of operations) op();
      },
    };
  }

  async runTransaction<T>(updateFunction: (tx: any) => Promise<T>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const writes: Array<() => Promise<unknown>> = [];
      const tx = {
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any, options?: any) => {
          writes.push(() => ref.set(data, options));
        },
        update: (ref: any, data: any) => {
          writes.push(() => ref.update(data));
        },
        delete: (ref: any) => {
          writes.push(() => ref.delete());
        },
      };
      const result = await updateFunction(tx);
      for (const write of writes) await write();
      return result;
    } finally {
      release();
    }
  }

  async getAll(...refs: any[]) {
    return Promise.all(refs.map((ref) => (typeof ref.get === 'function' ? ref.get() : ref)));
  }
}

export function hasAdminCredentials(): boolean {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim()
    : undefined;
  if (
    email &&
    ((email.startsWith('"') && email.endsWith('"')) ||
      (email.startsWith("'") && email.endsWith("'")))
  ) {
    email = email.slice(1, -1).trim();
  }

  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.trim()
    : undefined;
  if (privateKey) {
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1).trim();
    }
  }

  return Boolean((email && privateKey) || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

export function getAdminApp(): App {
  if (!adminApp) {
    const apps = getApps();
    if (apps.length === 0) {
      let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim()
        : undefined;
      if (
        email &&
        ((email.startsWith('"') && email.endsWith('"')) ||
          (email.startsWith("'") && email.endsWith("'")))
      ) {
        email = email.slice(1, -1).trim();
      }

      let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.trim()
        : undefined;
      if (privateKey) {
        if (
          (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
          (privateKey.startsWith("'") && privateKey.endsWith("'"))
        ) {
          privateKey = privateKey.slice(1, -1).trim();
        }
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      if (email && privateKey) {
        adminApp = initializeApp({
          credential: cert({
            projectId: firebaseConfig.projectId,
            clientEmail: email,
            privateKey: privateKey,
          }),
          projectId: firebaseConfig.projectId,
        });
      } else {
        const msg =
          'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY. ' +
          'On Render this usually means Firebase Admin cannot authenticate to Firestore, so orders/invoice counters/widgets will fail.';
        if (STRICT_FIREBASE_ADMIN) {
          throw new Error(msg);
        }
        console.warn(
          msg + ' Continuing with Application Default Credentials (not recommended on Render).'
        );
        adminApp = initializeApp({ projectId: firebaseConfig.projectId });
      }
    } else {
      adminApp = apps[0]!;
    }
  }
  return adminApp;
}

export function isFirebaseAdminIdentity(identity: { admin?: boolean; email?: string; email_verified?: boolean }): boolean {
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  return identity.admin === true || Boolean(identity.email_verified && identity.email && allowed.includes(identity.email.trim().toLowerCase()));
}

export function firebaseTokenRevocationId(token: string): string {
  return `firebase_${createHash('sha256').update(token).digest('hex')}`;
}

/** Firebase refreshes preserve auth_time; a fresh sign-in starts a new session. */
export function firebaseSessionRevocationId(identity: { uid: string; auth_time?: number }): string | null {
  return Number.isSafeInteger(identity.auth_time) && identity.auth_time! > 0 && !identity.uid.includes('/')
    ? `firebase_session_${identity.uid}_${identity.auth_time}` : null;
}

export async function verifyFirebaseIdToken(
  idToken: string,
  { checkSessionRevocation = true }: { checkSessionRevocation?: boolean } = {},
): Promise<{ uid: string; email?: string; email_verified?: boolean; admin?: boolean; auth_time?: number } | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  if (!hasAdminCredentials()) {
    return null;
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken, true);
    if (checkSessionRevocation && isFirebaseAdminIdentity(decoded) &&
        (await getFirestore().collection('admin_revocations').doc(firebaseSessionRevocationId(decoded) || firebaseTokenRevocationId(idToken)).get()).exists) {
      return null;
    }
    return {
      uid: decoded.uid,
      email: decoded.email,
      email_verified: decoded.email_verified === true,
      admin: decoded.admin === true,
      auth_time: decoded.auth_time,
    };
  } catch (err) {
    console.warn(
      '[Auth] Failed to verify Firebase ID token:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function verifyCustomerIdToken(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!idToken) return null;

  const verified = await verifyFirebaseIdToken(idToken);
  return verified?.uid || null;
}

export function getFirestore(): FirebaseFirestore.Firestore {
  if (
    process.env.CI ||
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.USE_MEMORY_FIRESTORE === 'true'
  ) {
    if (process.env.NODE_ENV === 'production') {
      // NEVER use memory Firestore in production
      throw new Error('Memory Firestore disabled in production');
    }
    if (!memoryFirestoreInstance) {
      memoryFirestoreInstance = new MemoryFirestore();
    }
    return memoryFirestoreInstance as unknown as FirebaseFirestore.Firestore;
  }

  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId;

  if (dbId && dbId !== '(default)') {
    try {
      return getFirestoreModular(app, dbId);
    } catch (err) {
      console.warn(
        `Failed to initialize Firestore with database ID ${dbId}, falling back to default:`,
        err
      );
      return getFirestoreModular(app);
    }
  }
  return getFirestoreModular(app);
}

export interface OrderData {
  id?: string;
  invoiceNo?: string;
  name?: string;
  email?: string;
  status?: string;
  date?: string;
  eventDate?: string;
  time?: string;
  dateTime?: string;
  quantity?: number;
  pax?: number;
  guests?: number;
  invoiceDeliveryStatus?: string;
  meals?: string | string[];
  location?: string;
  menu?: string;
  notes?: string;
  userId?: string | null;
  uid?: string;
  items?: unknown[];
  billingAddress?: string;
  invoiceBatchNo?: string;
  to?: string;
  attn?: string;
  contact?: string;
  phone?: string;
  calendarEventIds?: Record<string, string>;
  customerEmail?: string;
  customerName?: string;
  lang?: string;
  approvedAt?: string;
  billedAt?: string;
  cancelRequestedAt?: string;
  deletedByAdmin?: boolean;
  deletedByAdminAt?: string | Timestamp | FieldValue;
  deletedByUser?: boolean;
  deletedByUserAt?: string | Timestamp | FieldValue;
  totalAmount?: number | null;
  eventTimestamp?: Timestamp;
  createdAt?: Timestamp | { seconds?: number; nanoseconds?: number } | FieldValue;
  updatedAt?: Timestamp | { seconds?: number; nanoseconds?: number } | FieldValue | string;
  presetId?: string;
  unitPrice?: number | null;
  preparationType?: string;
  prices?: Record<string, number>;
  department?: string;
  fcmToken?: string;
}

export async function sendNotificationToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!hasAdminCredentials()) {
    console.log(
      `[FCM] Service account credentials not configured; skipping topic notification (${topic}).`
    );
    return null;
  }
  try {
    const app = getAdminApp();
    const cleanTopic = (topic || 'new_orders').trim();
    const message = {
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          channelId: cleanTopic === 'new_orders' ? 'new_orders' : 'order_status',
          sound: 'default',
          priority: 'high' as const,
        },
      },
      data: {
        topic: cleanTopic,
        timestamp: new Date().toISOString(),
        ...(data || {}),
      },
      topic: cleanTopic,
    };
    const response = await getMessaging(app).send(message);
    console.log(`[FCM] Successfully sent message to topic ${cleanTopic}:`, response);
    return response;
  } catch (error) {
    console.error(`[FCM] Error sending message to topic ${topic}:`, error);
    return null;
  }
}

export async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(
        `[Firestore Retry] Attempt ${attempt} failed. Retrying in ${delayMs}ms... Error:`,
        error
      );
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }
  throw lastError;
}

export function toEventTimestamp(orderData: Partial<OrderData>): Timestamp | null {
  try {
    const raw = orderData.dateTime
      ? new Date(orderData.dateTime)
      : orderData.date
        ? new Date(`${orderData.date}T${orderData.time || '12:00'}:00+08:00`)
        : null;
    if (!raw || isNaN(raw.getTime())) return null;
    return Timestamp.fromDate(raw);
  } catch {
    return null;
  }
}

/** Allocate multiple serials in one transaction. Call after the caller's other reads. */
export async function allocateInvoiceNumbers(
  tx: FirebaseFirestore.Transaction,
  count: number,
  isQuote = false,
  targetDate?: string | Date,
  excluded: string[] = []
): Promise<string[]> {
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw new Error('Invalid invoice count');
  const db = getFirestore(),
    date = targetDate ? new Date(targetDate) : new Date();
  const year = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
  }).format(isNaN(date.getTime()) ? new Date() : date);
  const counterRef = db.collection('meta').doc(`invoiceCounter_${year}`),
    legacyRef = db.collection('meta').doc('invoiceCounter');
  const [counter, legacy] = await Promise.all([tx.get(counterRef), tx.get(legacyRef)]);
  let next = Number(counter.data()?.count ?? legacy.data()?.count ?? 0);
  if (!Number.isSafeInteger(next) || next < 0) throw new Error('Invalid invoice counter');
  const numbers: string[] = [];
  while (numbers.length < count) {
    next++;
    const number = `RW ${year}-${String(next).padStart(5, '0')}`;
    if (
      !(await tx.get(db.collection('invoice_numbers').doc(number))).exists &&
      !excluded.includes(number)
    )
      numbers.push(number);
  }
  for (const number of numbers)
    tx.set(db.collection('invoice_numbers').doc(number), {
      purpose: isQuote ? 'quote' : 'invoice',
      createdAt: FieldValue.serverTimestamp(),
    });
  tx.set(
    counterRef,
    { year: Number(year), count: next, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  tx.set(
    legacyRef,
    { count: next, lastYear: Number(year), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return isQuote ? numbers.map((number) => number.replace(/^RW /, 'QT ')) : numbers;
}
export async function generateSequentialInvoiceNo(
  isQuote = false,
  targetDate?: string | Date
): Promise<string> {
  return getFirestore().runTransaction(
    async (tx) => (await allocateInvoiceNumbers(tx, 1, isQuote, targetDate))[0]
  );
}

export async function createOrder(
  orderData: OrderData
): Promise<{ orderId: string; invoiceNo?: string }> {
  const db = getFirestore();
  const orderRef = db.collection('orders').doc();
  const eventTimestamp = toEventTimestamp(orderData);

  const newOrderDoc = {
    ...orderData,
    status: (orderData.status || 'pending').toLowerCase(),
    eventTimestamp,
    createdAt: FieldValue.serverTimestamp(),
  };

  await orderRef.set(newOrderDoc);

  return { orderId: orderRef.id, invoiceNo: orderData.invoiceNo };
}
