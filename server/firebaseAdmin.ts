import type express from "express";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore as getFirestoreModular, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import { firebaseConfig, STRICT_FIREBASE_ADMIN } from "./config.js";

let adminApp: App | undefined;

export function getAdminApp(): App {
  if (!adminApp) {
    const apps = getApps();
    if (apps.length === 0) {
      let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim()
        : undefined;
      if (email && email.startsWith('"') && email.endsWith('"')) {
        email = email.slice(1, -1).trim();
      }

      let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.trim()
        : undefined;
      if (privateKey) {
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1).trim();
        }
        privateKey = privateKey.replace(/\\n/g, "\n");
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
          "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY. " +
          "On Render this usually means Firebase Admin cannot authenticate to Firestore, so orders/invoice counters/widgets will fail.";
        if (STRICT_FIREBASE_ADMIN) {
          throw new Error(msg);
        }
        console.warn(msg + " Continuing with Application Default Credentials (not recommended on Render).");
        adminApp = initializeApp({ projectId: firebaseConfig.projectId });
      }
    } else {
      adminApp = apps[0]!;
    }
  }
  return adminApp;
}

export async function verifyCustomerIdToken(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!idToken) return null;

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    return decoded.uid;
  } catch (err) {
    console.warn("[Auth] Failed to verify customer ID token:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function getFirestore() {
  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId;

  if (dbId && dbId !== "(default)") {
    try {
      return getFirestoreModular(app, dbId);
    } catch (err) {
      console.warn(`Failed to initialize Firestore with database ID ${dbId}, falling back to default:`, err);
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
  time?: string;
  dateTime?: string;
  quantity?: number;
  pax?: number;
  meals?: string | string[];
  location?: string;
  menu?: string;
  notes?: string;
  userId?: string | null;
  uid?: string;
  items?: unknown[];
  to?: string;
  attn?: string;
  contact?: string;
  calendarEventIds?: Record<string, string>;
  customerEmail?: string;
  customerName?: string;
  lang?: string;
  approvedAt?: string;
  billedAt?: string;
  cancelRequestedAt?: string;
  totalAmount?: number | null;
  eventTimestamp?: Timestamp;
  createdAt?: Timestamp | { seconds?: number; nanoseconds?: number } | FieldValue;
  updatedAt?: Timestamp | { seconds?: number; nanoseconds?: number } | FieldValue | string;
  presetId?: string;
  unitPrice?: number | null;
  preparationType?: string;
  prices?: Record<string, number>;
  department?: string;
}

export async function sendNotificationToTopic(topic: string, title: string, body: string) {
  try {
    const app = getAdminApp();
    const message = {
      notification: {
        title,
        body,
      },
      topic: topic,
    };
    const response = await getMessaging(app).send(message);
    console.log(`Successfully sent message to topic ${topic}:`, response);
  } catch (error) {
    console.error(`Error sending message to topic ${topic}:`, error);
  }
}

export async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[Firestore Retry] Attempt ${attempt} failed. Retrying in ${delayMs}ms... Error:`, error);
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
        ? new Date(`${orderData.date}T${orderData.time || "12:00"}:00+08:00`)
        : null;
    if (!raw || isNaN(raw.getTime())) return null;
    return Timestamp.fromDate(raw);
  } catch {
    return null;
  }
}

export async function generateSequentialInvoiceNo(): Promise<string> {
  const db = getFirestore();
  const counterRef = db.collection("meta").doc("invoiceCounter");
  return await db.runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    let next = 1;
    if (counterSnap.exists) {
      const data = counterSnap.data();
      if (data && typeof data.count === "number") {
        next = data.count + 1;
      }
    }
    const invoiceNo = `RW-${String(next).padStart(4, "0")}`;
    tx.set(
      counterRef,
      { count: next, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return invoiceNo;
  });
}

export async function createOrder(orderData: OrderData): Promise<{ orderId: string; invoiceNo?: string }> {
  const db = getFirestore();
  const orderRef = db.collection("orders").doc();
  const eventTimestamp = toEventTimestamp(orderData);

  const newOrderDoc = {
    ...orderData,
    status: orderData.status || "SUBMITTED",
    eventTimestamp,
    createdAt: FieldValue.serverTimestamp(),
  };

  await orderRef.set(newOrderDoc);

  return { orderId: orderRef.id, invoiceNo: orderData.invoiceNo };
}
