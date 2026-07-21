import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import cors from "cors";
import { cert, App, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore as getFirestoreModular, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";
import { google } from "googleapis";
import jwt from "jsonwebtoken";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  firestoreDatabaseId?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCaCFMk6K8go9Wgt-jdNd6QTvD8JbsTkY4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "restoran-wawasan.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "restoran-wawasan",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "restoran-wawasan.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1019707766959",
  appId: process.env.FIREBASE_APP_ID || "1:1019707766959:web:78644cddb16b67a69ffc5a",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-ZWC8H62RZN",
  firestoreDatabaseId: undefined
};

// IMPORTANT: The backend Express server must ALWAYS connect to the production
// Firebase project (restoran-wawasan), regardless of environment. Unlike the
// frontend (which legitimately switches to a sandbox project during AI Studio
// preview), this server only ever runs on Render as the real production
// backend — so it must never read firebase-applet-config.json or any other
// sandbox override. Doing so previously caused orders, invoice counters, and
// calendar syncs to silently target the wrong Firestore project.

// Self-healing Local JSON Database Fallback
const LOCAL_DB_PATH = path.join(process.cwd(), "orders.json");
const ENABLE_LOCAL_FALLBACK = process.env.ENABLE_LOCAL_FALLBACK === "true";
const STRICT_FIREBASE_ADMIN = process.env.STRICT_FIREBASE_ADMIN !== "false";

// Lazy initialize Firebase Admin
let adminApp: App | null = null;
function getAdminApp() {
  if (!adminApp) {
    const apps = getApps();
    if (apps.length === 0) {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;

      if (email && privateKey) {
        // Render has no Application Default Credentials (that's a GCP-only
        // mechanism), so Firebase Admin must be given an explicit service
        // account credential or every Firestore call silently fails auth.
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

// Verifies a Firebase Auth ID token sent by the customer app and returns the
// authenticated uid. Previously /api/orders/cancel and /api/orders/delete
// trusted a plain `userId` field in the request body with no proof it came
// from that user's actual session — anyone who knew (or guessed) an orderId +
// userId pair could cancel or delete someone else's order, since these
// endpoints use the Admin SDK and therefore bypass firestore.rules entirely.
// This checks the token's signature against the real Firebase project, so
// the uid it returns cannot be spoofed by the client.
async function verifyCustomerIdToken(req: express.Request): Promise<string | null> {
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

function getFirestore() {
  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId;
  
  if (dbId && dbId !== "(default)") {
    // In the modular API, a named database is passed as the second argument
    // to getFirestore(app, databaseId).
    try {
      return getFirestoreModular(app, dbId);
    } catch (err) {
      console.warn(`Failed to initialize Firestore with database ID ${dbId}, falling back to default:`, err);
      return getFirestoreModular(app);
    }
  }
  return getFirestoreModular(app);
}

interface OrderData {
  id?: string;
  invoiceNo?: string;
  name?: string;
  email?: string;
  status?: string;
  [key: string]: unknown;
}

async function sendNotificationToTopic(topic: string, title: string, body: string) {
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

// ---------------------------------------------------------------------------
// Order status-change notifications (email + push to the customer)
// ---------------------------------------------------------------------------
// Feature: when an admin changes an order's status in the dashboard, notify the
// customer by email (reliable) and, best-effort, by an FCM push notification.
// All work here is wrapped in try/catch by callers so a notification failure can
// NEVER break the underlying order update.

const ENABLE_ORDER_STATUS_NOTIFICATIONS =
  (process.env.ENABLE_ORDER_STATUS_NOTIFICATIONS || "true") !== "false";

type NotifyLang = "en" | "bm";

interface StatusCopy {
  subject: string;
  heading: string;
  message: string;
  pushTitle: string;
  pushBody: string;
}

// Human-friendly, bilingual copy for each known status. Falls back to a generic
// message for any unrecognized status value so new statuses still notify.
function getStatusCopy(status: string, name: string, invoiceNo: string, lang: NotifyLang): StatusCopy {
  const s = (status || "").toLowerCase();
  const who = name || (lang === "bm" ? "Pelanggan" : "Customer");
  const invoiceSuffix = invoiceNo ? (lang === "bm" ? ` (No. Invois: ${invoiceNo})` : ` (Invoice No: ${invoiceNo})`) : "";

  const en: Record<string, StatusCopy> = {
    pending: {
      subject: `Your order is being reviewed${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Order Received — Pending Review",
      message: `Hi ${who}, we've received your catering order${invoiceSuffix} and it is currently pending review. We'll update you as soon as it's confirmed.`,
      pushTitle: "Order pending review",
      pushBody: `Your order${invoiceSuffix} is pending review.`,
    },
    approved: {
      subject: `Your order is approved${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Order Approved 🎉",
      message: `Great news ${who}! Your catering order${invoiceSuffix} has been approved. We look forward to serving you.`,
      pushTitle: "Order approved 🎉",
      pushBody: `Your order${invoiceSuffix} has been approved.`,
    },
    billed: {
      subject: `Your invoice is ready${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Invoice Issued",
      message: `Hi ${who}, an invoice${invoiceSuffix} has been issued for your catering order. Please check your email for the invoice details.`,
      pushTitle: "Invoice ready",
      pushBody: `Your invoice${invoiceSuffix} is ready.`,
    },
    rejected: {
      subject: `Update on your order${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Order Could Not Be Confirmed",
      message: `Hi ${who}, unfortunately we were unable to confirm your catering order${invoiceSuffix} at this time. Please contact us if you'd like to discuss alternatives.`,
      pushTitle: "Order update",
      pushBody: `There's an update on your order${invoiceSuffix}.`,
    },
    completed: {
      subject: `Thank you from Restoran Wawasan${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Order Completed — Thank You!",
      message: `Hi ${who}, your catering order${invoiceSuffix} is now marked as completed. Thank you for choosing Restoran Wawasan — we hope to serve you again!`,
      pushTitle: "Order completed",
      pushBody: `Your order${invoiceSuffix} is completed. Thank you!`,
    },
    cancel_requested: {
      subject: `Your cancellation request is being reviewed${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Cancellation Requested — Pending Review",
      message: `Hi ${who}, we've received your request to cancel your catering order${invoiceSuffix} and it is currently pending review by the admin. We'll update you soon.`,
      pushTitle: "Cancellation pending review",
      pushBody: `Your cancellation request${invoiceSuffix} is pending review.`,
    },
    cancelled: {
      subject: `Your order has been cancelled${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Order Cancelled 🚫",
      message: `Hi ${who}, your catering order${invoiceSuffix} has been successfully cancelled.`,
      pushTitle: "Order cancelled 🚫",
      pushBody: `Your order${invoiceSuffix} has been cancelled.`,
    },
  };

  const bm: Record<string, StatusCopy> = {
    pending: {
      subject: `Pesanan anda sedang disemak${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Pesanan Diterima — Menunggu Semakan",
      message: `Salam ${who}, kami telah menerima tempahan katering anda${invoiceSuffix} dan ia sedang menunggu semakan. Kami akan maklumkan sebaik sahaja ia disahkan.`,
      pushTitle: "Pesanan menunggu semakan",
      pushBody: `Pesanan anda${invoiceSuffix} sedang disemak.`,
    },
    approved: {
      subject: `Pesanan anda telah diluluskan${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Pesanan Diluluskan 🎉",
      message: `Berita baik ${who}! Tempahan katering anda${invoiceSuffix} telah diluluskan. Kami menantikan peluang untuk berkhidmat kepada anda.`,
      pushTitle: "Pesanan diluluskan 🎉",
      pushBody: `Pesanan anda${invoiceSuffix} telah diluluskan.`,
    },
    billed: {
      subject: `Invois anda telah sedia${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Invois Dikeluarkan",
      message: `Salam ${who}, satu invois${invoiceSuffix} telah dikeluarkan untuk tempahan katering anda. Sila semak e-mel anda untuk butiran invois.`,
      pushTitle: "Invois sedia",
      pushBody: `Invois anda${invoiceSuffix} telah sedia.`,
    },
    rejected: {
      subject: `Kemas kini tempahan anda${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Tempahan Tidak Dapat Disahkan",
      message: `Salam ${who}, malangnya kami tidak dapat mengesahkan tempahan katering anda${invoiceSuffix} pada masa ini. Sila hubungi kami jika anda ingin membincangkan pilihan lain.`,
      pushTitle: "Kemas kini tempahan",
      pushBody: `Terdapat kemas kini pada tempahan anda${invoiceSuffix}.`,
    },
    completed: {
      subject: `Terima kasih daripada Restoran Wawasan${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Tempahan Selesai — Terima Kasih!",
      message: `Salam ${who}, tempahan katering anda${invoiceSuffix} kini ditanda sebagai selesai. Terima kasih kerana memilih Restoran Wawasan — kami harap dapat berkhidmat lagi!`,
      pushTitle: "Tempahan selesai",
      pushBody: `Tempahan anda${invoiceSuffix} telah selesai. Terima kasih!`,
    },
    cancel_requested: {
      subject: `Permintaan pembatalan anda sedang disemak${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Pembatalan Diminta — Menunggu Semakan",
      message: `Salam ${who}, kami telah menerima permintaan pembatalan tempahan katering anda${invoiceSuffix} dan ia sedang menunggu kelulusan daripada admin. Kami akan maklumkan tidak lama lagi.`,
      pushTitle: "Pembatalan menunggu semakan",
      pushBody: `Permintaan pembatalan anda${invoiceSuffix} sedang disemak.`,
    },
    cancelled: {
      subject: `Pesanan anda telah dibatalkan${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Pesanan Dibatalkan 🚫",
      message: `Salam ${who}, tempahan katering anda${invoiceSuffix} telah berjaya dibatalkan.`,
      pushTitle: "Pesanan dibatalkan 🚫",
      pushBody: `Pesanan anda${invoiceSuffix} telah dibatalkan.`,
    },
  };

  const table = lang === "bm" ? bm : en;
  if (table[s]) return table[s];

  // Generic fallback for any unknown status.
  const prettyStatus = status || (lang === "bm" ? "dikemas kini" : "updated");
  return lang === "bm"
    ? {
        subject: `Status tempahan anda telah dikemas kini${invoiceNo ? ` — ${invoiceNo}` : ""}`,
        heading: "Kemas Kini Status Tempahan",
        message: `Salam ${who}, status tempahan katering anda${invoiceSuffix} kini ialah: ${prettyStatus}.`,
        pushTitle: "Kemas kini status tempahan",
        pushBody: `Status pesanan anda${invoiceSuffix}: ${prettyStatus}.`,
      }
    : {
        subject: `Your order status was updated${invoiceNo ? ` — ${invoiceNo}` : ""}`,
        heading: "Order Status Update",
        message: `Hi ${who}, the status of your catering order${invoiceSuffix} is now: ${prettyStatus}.`,
        pushTitle: "Order status update",
        pushBody: `Your order status${invoiceSuffix}: ${prettyStatus}.`,
      };
}

function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildStatusEmailHtml(copy: StatusCopy, lang: NotifyLang): string {
  const footerText =
    lang === "bm"
      ? "E-mel ini dijanakan secara automatik apabila status tempahan anda berubah. Sila hubungi kami jika terdapat sebarang pertanyaan."
      : "This email is generated automatically when your order status changes. Please contact us if you have any questions.";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f7fafc;margin:0;padding:20px;color:#2d3748;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);border:1px solid #e2e8f0;">
    <div style="background-color:#1a202c;padding:30px;text-align:center;color:#ffffff;border-bottom:3px solid #D4AF37;">
      <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.05em;color:#D4AF37;">RESTORAN WAWASAN</h1>
      <p style="margin:5px 0 0 0;color:#a0aec0;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(copy.heading)}</p>
    </div>
    <div style="padding:30px;">
      <p style="font-size:16px;line-height:1.6;margin:0 0 25px 0;">${escapeHtml(copy.message)}</p>
    </div>
    <div style="background-color:#f7fafc;padding:20px 30px;text-align:center;color:#718096;font-size:12px;border-top:1px solid #e2e8f0;">
      ${footerText}
    </div>
  </div>
</body>
</html>`;
}

// Send the status-change email to the customer. Reuses the same nodemailer
// transporter already configured for invoices. Returns true if an email was sent.
async function sendOrderStatusEmail(
  transporter: nodemailer.Transporter,
  order: Partial<OrderData> & { email?: string; name?: string; invoiceNo?: string; lang?: string },
  newStatus: string
): Promise<boolean> {
  const to = order.email;
  if (!to) {
    console.warn("[StatusNotify] No customer email on order; skipping status email.");
    return false;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[StatusNotify] SMTP not configured (SMTP_USER/SMTP_PASS); skipping status email.");
    return false;
  }

  const lang: NotifyLang = order.lang === "bm" ? "bm" : "en";
  const copy = getStatusCopy(newStatus, order.name || "", order.invoiceNo || "", lang);

  await transporter.sendMail({
    from: `"Restoran Wawasan" <${process.env.SENDER_EMAIL || process.env.SMTP_USER || "madnor.noisy@gmail.com"}>`,
    to,
    subject: copy.subject,
    text: `${copy.heading}\n\n${copy.message}`,
    html: buildStatusEmailHtml(copy, lang),
  });
  console.log(`[StatusNotify] Status email (${newStatus}) sent to ${to}.`);
  return true;
}

// Resolve a customer's FCM device token. Prefers an explicit uid on the order,
// otherwise falls back to matching a users document by email. Returns null if
// no token can be found (in which case push is simply skipped).
async function resolveCustomerFcmToken(order: Partial<OrderData> & { uid?: string; userId?: string | null; email?: string }): Promise<string | null> {
  try {
    const db = getFirestore();
    // The order stores the customer's Firebase Auth uid as `userId` (sent by the
    // app's OrderForm when logged in); also accept `uid` for robustness. This is
    // the reliable path — a direct lookup of the customer's device token.
    const customerUid = order.userId || order.uid;
    if (customerUid) {
      const snap = await db.collection("users").doc(customerUid).get();
      const token = snap.exists ? (snap.data()?.fcmToken as string | undefined) : undefined;
      if (token) return token;
    }
    // Fallback: match a users document by email (works only if that account is
    // logged in on the app with the same email and has a stored token).
    if (order.email) {
      const q = await db.collection("users").where("email", "==", order.email).limit(1).get();
      if (!q.empty) {
        const token = q.docs[0].data()?.fcmToken as string | undefined;
        if (token) return token;
      }
    }
  } catch (err) {
    console.warn("[StatusNotify] Could not resolve customer FCM token:", err);
  }
  return null;
}

// Best-effort direct push to the customer's device via FCM. Returns true if sent.
async function sendOrderStatusPush(
  order: Partial<OrderData> & { uid?: string; email?: string; name?: string; invoiceNo?: string; lang?: string; id?: string },
  newStatus: string
): Promise<boolean> {
  const token = await resolveCustomerFcmToken(order);
  if (!token) {
    console.log("[StatusNotify] No FCM token for customer; skipping push (email still sent).");
    return false;
  }
  const lang: NotifyLang = order.lang === "bm" ? "bm" : "en";
  const copy = getStatusCopy(newStatus, order.name || "", order.invoiceNo || "", lang);
  try {
    const app = getAdminApp();
    const response = await getMessaging(app).send({
      token,
      notification: { title: copy.pushTitle, body: copy.pushBody },
      data: {
        type: "order_status",
        status: String(newStatus || ""),
        orderId: String(order.id || ""),
        invoiceNo: String(order.invoiceNo || ""),
      },
    });
    console.log(`[StatusNotify] Status push (${newStatus}) sent to customer:`, response);
    return true;
  } catch (error) {
    console.error("[StatusNotify] Error sending status push to customer:", error);
    return false;
  }
}

// Orchestrator: fire both channels without blocking or throwing. Safe to call
// with `.catch()` from a request handler.
async function notifyCustomerOfStatusChange(
  transporter: nodemailer.Transporter,
  order: Partial<OrderData> & { id?: string; uid?: string; email?: string; name?: string; invoiceNo?: string; lang?: string },
  newStatus: string
): Promise<void> {
  if (!ENABLE_ORDER_STATUS_NOTIFICATIONS) {
    console.log("[StatusNotify] Disabled via ENABLE_ORDER_STATUS_NOTIFICATIONS=false; skipping.");
    return;
  }
  await Promise.allSettled([
    sendOrderStatusEmail(transporter, order, newStatus).catch((err) =>
      console.error("[StatusNotify] Email send failed:", err)
    ),
    sendOrderStatusPush(order, newStatus).catch((err) =>
      console.error("[StatusNotify] Push send failed:", err)
    ),
  ]);
}

// Robust Firestore operation retry mechanism to minimize reliance on the transient file system
async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[Firestore Retry] Attempt ${attempt} failed. Retrying in ${delayMs}ms... Error:`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      }
    }
  }
  throw lastError;
}

function getLocalOrders(): Record<string, unknown>[] {
  if (!ENABLE_LOCAL_FALLBACK) return [];
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      console.warn("[WARNING] Reading from local fallback file 'orders.json'. Note: This local file system is ephemeral and transient. All local changes will be lost upon container restart or redeployment.");
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error("Error reading local orders database:", err);
  }
  return [];
}

function saveLocalOrders(orders: Record<string, unknown>[]) {
  if (!ENABLE_LOCAL_FALLBACK) return;
  try {
    console.warn("[WARNING] Writing to local fallback file 'orders.json'. Note: This local file system is ephemeral and transient. All local changes will be lost upon container restart or redeployment.");
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to local orders database:", err);
  }
}

function toEventTimestamp(orderData: Partial<OrderData>): Timestamp | null {
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

async function createOrderWithSequentialInvoice(orderData: OrderData): Promise<{ orderId: string; invoiceNo: string }> {
  const db = getFirestore();
  const counterRef = db.collection("meta").doc("invoiceCounter");
  const orderRef = db.collection("orders").doc();

  return await db.runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    let next = 1;
    if (counterSnap.exists) {
      const data = counterSnap.data();
      if (data && typeof data.count === "number") {
        next = data.count + 1;
      }
    }

    const invoiceNo = `RW${String(next).padStart(4, "0")}`;
    const eventTimestamp = toEventTimestamp(orderData);

    tx.set(
      counterRef,
      { count: next, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    tx.set(orderRef, {
      ...orderData,
      status: "pending",
      approvedAt: new Date().toISOString(),
      invoiceNo,
      eventTimestamp,
      // Always set by server (client may send a Firestore sentinel that isn't valid server-side)
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId: orderRef.id, invoiceNo };
  });
}

// Google Calendar Helper
function getGoogleCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!email || !privateKey) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not configured. Google Calendar event creation will be skipped.");
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
    });
    return google.calendar({ version: "v3", auth });
  } catch (err) {
    console.error("Failed to initialize Google Calendar client:", err);
    return null;
  }
}


async function syncGoogleCalendarEvent(orderId: string, passedOrderData?: OrderData) {
  try {
    const calendar = getGoogleCalendarClient();
    if (!calendar) {
      return;
    }

    // 1. Fetch current order data if not passed
    let orderData: OrderData | undefined = passedOrderData;
    if (!orderData) {
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) {
          orderData = docSnap.data() as OrderData;
        }
      } catch (dbErr) {
        console.warn(`Firestore sync load failed for order ${orderId}:`, dbErr);
      }

      if (!orderData) {
        const localOrders = getLocalOrders();
        orderData = localOrders.find(o => o.id === orderId) as OrderData | undefined;
      }
    }

    if (!orderData) {
      console.warn(`Sync Google Calendar Event: Order ${orderId} not found.`);
      return;
    }

    // Determine start time (using orderData.dateTime or parsing date/time)
    let startDateTime: Date;
    if (orderData.dateTime) {
      startDateTime = new Date(orderData.dateTime);
    } else if (orderData.date) {
      startDateTime = new Date(`${orderData.date}T${orderData.time || '12:00'}:00+08:00`);
    } else {
      startDateTime = new Date();
    }

    // Validate date
    if (isNaN(startDateTime.getTime())) {
      startDateTime = new Date();
    }

    // Default duration: 3 hours
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);

    const mealList = Array.isArray(orderData.meals) ? orderData.meals.join(", ") : (orderData.meals || "");
    const summary = `${orderData.quantity || ""} Pax | ${mealList || "N/A"} | ${orderData.location || "N/A"}`;
    const description = `Menu: ${orderData.menu || "N/A"}`;

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const existingEventId = orderData.calendarEventIds?.[calendarId];

    if (existingEventId) {
      try {
        console.log(`Updating existing Google Calendar event ${existingEventId} for order ${orderId}...`);
        await calendar.events.update({
          calendarId: calendarId,
          eventId: existingEventId,
          requestBody: {
            summary: summary,
            description: description,
            location: orderData.location || "",
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur",
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur",
            },
          },
        });
        console.log(`Google Calendar event ${existingEventId} updated successfully.`);
        return;
      } catch (updateErr) {
        // If event was deleted, we'll recreate it
        const errObj = updateErr as { status?: number; message?: string };
        if (errObj && (errObj.status === 404 || (errObj.message && errObj.message.includes('Not Found')))) {
          console.warn(`Existing calendar event ${existingEventId} not found or deleted on calendar, recreating...`);
        } else {
          throw updateErr;
        }
      }
    }

    // Insert new event if no existing event id or if recreation is needed
    console.log(`Creating new Google Calendar event for order ${orderId}...`);
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: summary,
        description: description,
        location: orderData.location || "",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
      },
    });

    const eventId = response.data.id;
    if (eventId) {
      console.log(`Google Calendar event created successfully! Event Link: ${response.data.htmlLink}`);
      
      const updatedCalendarEventIds = {
        ...(orderData.calendarEventIds || {}),
        [calendarId]: eventId
      };

      // Update Firestore document with calendarEventIds
      try {
        const adminDb = getFirestore();
        await adminDb.collection("orders").doc(orderId).update({
          calendarEventIds: updatedCalendarEventIds
        });
        console.log(`Firestore updated with calendarEventIds for order ${orderId}`);
      } catch (dbErr) {
        console.warn(`Failed to update calendarEventIds in Firestore for order ${orderId}:`, dbErr);
      }

      // Update Local JSON file with calendarEventIds
      try {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            calendarEventIds: updatedCalendarEventIds
          };
          saveLocalOrders(localOrders);
          console.log(`Local JSON updated with calendarEventIds for order ${orderId}`);
        }
      } catch (localErr) {
        console.error("Failed to update local orders with calendarEventIds:", localErr);
      }
    }
  } catch (err) {
    console.error(`Error syncing Google Calendar event for order ${orderId}:`, err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Allow large payloads for base64 PDF

  // Nodemailer transporter setup
  // Expects environment variables for SMTP configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    family: 4, // Force IPv4 — Render's network doesn't reliably route outbound IPv6 to Gmail SMTP
  });

  // Verify SMTP transporter connection
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Configuration/Connection Error:", error);
    } else {
      console.log("SMTP connection verified! Server is ready to send emails.");
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });


  // Diagnostics endpoint: verifies Firebase Admin can authenticate and write to Firestore.
  // This creates/updates a harmless doc `meta/diagnostics`.
  app.get("/api/diagnostics/firebase", async (req, res) => {
    try {
      const db = getFirestore();
      const ref = db.collection("meta").doc("diagnostics");
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const prev = (snap.data() as { count?: number } | undefined)?.count || 0;
        tx.set(
          ref,
          {
            count: prev + 1,
            lastRunAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
      res.json({ ok: true, projectId: firebaseConfig.projectId });
    } catch (err) {
      console.error("Firebase diagnostics failed:", err);
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Diagnostics endpoint: verifies Google Calendar API auth + API enablement.
  app.get("/api/diagnostics/calendar", async (req, res) => {
    try {
      const calendar = getGoogleCalendarClient();
      if (!calendar) {
        return res.status(500).json({
          ok: false,
          error: "Google Calendar client not configured (missing GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY).",
        });
      }

      // A lightweight call that will surface 403 PERMISSION_DENIED if the API is disabled.
      const r = await calendar.calendarList.list({ maxResults: 1 });
      res.json({ ok: true, calendarsReturned: (r.data.items || []).length });
    } catch (err) {
      const e = err as { code?: number; status?: number; message?: string; errors?: unknown };
      console.error("Calendar diagnostics failed:", err);
      res.status(500).json({
        ok: false,
        status: e?.status ?? e?.code,
        message: e?.message || "Calendar diagnostics failed",
      });
    }
  });

  // Diagnostics endpoint: verifies SMTP is configured and can send a test email.
  app.post("/api/diagnostics/email", verifyAdminToken, async (req, res) => {
    try {
      const { testEmail } = req.body;

      if (!testEmail) {
        return res.status(400).json({ error: "Missing testEmail" });
      }

      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(500).json({ 
          ok: false, 
          error: "SMTP is not fully configured (missing SMTP_USER or SMTP_PASS environment variables)." 
        });
      }

      const info = await transporter.sendMail({
        from: `"Restoran Wawasan (Test)" <${process.env.SMTP_USER}>`,
        to: testEmail,
        subject: "Wawasan Pak Usop Catering App - SMTP Test Email",
        text: `Hello,\n\nThis is a diagnostics test email sent from the Restoran Wawasan Pak Usop Admin Panel.\nIf you received this, your SMTP configuration is 100% WORKING!\n\nSent at: ${new Date().toLocaleString()}\n\nBest regards,\nRestoran Wawasan Pak Usop Server`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
            <h2 style="color: #0f3d2a; margin-top: 0;">Restoran Wawasan Putrajaya</h2>
            <p style="font-size: 16px; color: #333;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #555;">
              This is a diagnostics test email sent from the <strong>Restoran Wawasan Pak Usop Catering App</strong> Admin Panel.
            </p>
            <div style="background-color: #d1e7dd; color: #0f5132; padding: 12px; border-radius: 4px; font-weight: bold; margin: 15px 0;">
              ✓ SMTP Configuration is 100% OPERATIONAL!
            </div>
            <p style="font-size: 12px; color: #888; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px;">
              Sent at: ${new Date().toLocaleString()}<br>
              Server Time: ${new Date().toISOString()}
            </p>
          </div>
        `
      });

      res.json({ ok: true, messageId: info.messageId });
    } catch (err) {
      console.error("Email diagnostics failed:", err);
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Lightweight endpoint for the Android home-screen widget.
  // Returns only the fields the widget needs (pax, meal, location, menu, date),
  // sorted by event date ascending, limited to the nearest upcoming orders.
  app.get("/api/widget/upcoming-orders", async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "5", 10), 20);
      const now = new Date();
      const results: { id: string; date: string; time?: string; quantity?: number; meals?: string; location?: string; menu?: string }[] = [];

      try {
        const adminDb = getFirestore();
        // Prefer querying by a Firestore Timestamp field (fast, index-friendly).
        // New orders created by the backend set `eventTimestamp`.
        const nowTs = Timestamp.fromDate(now);
        const snapshot = await adminDb
          .collection("orders")
          .where("eventTimestamp", ">=", nowTs)
          .orderBy("eventTimestamp", "asc")
          .limit(limit)
          .get();

        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as OrderData & { eventTimestamp?: Timestamp };
          const eventDate =
            d.eventTimestamp?.toDate?.() ||
            (d.dateTime ? new Date(d.dateTime) : d.date ? new Date(`${d.date}T${d.time || "12:00"}:00+08:00`) : null);
          if (eventDate && !isNaN(eventDate.getTime()) && eventDate.getTime() >= now.getTime()) {
            results.push({
              id: docSnap.id,
              date: eventDate.toISOString(),
              quantity: d.quantity,
              meals: Array.isArray(d.meals) ? d.meals.join(", ") : d.meals,
              location: d.location,
              menu: d.menu,
            });
          }
        });

        // Backward compatibility for older orders that do not have `eventTimestamp`.
        if (results.length === 0) {
          const legacySnap = await adminDb.collection("orders").get();
          legacySnap.forEach((docSnap) => {
            const d = docSnap.data() as OrderData;
            const eventDate = d.dateTime
              ? new Date(d.dateTime)
              : d.date
                ? new Date(`${d.date}T${d.time || "12:00"}:00+08:00`)
                : null;
            if (eventDate && !isNaN(eventDate.getTime()) && eventDate.getTime() >= now.getTime()) {
              results.push({
                id: docSnap.id,
                date: eventDate.toISOString(),
                quantity: d.quantity,
                meals: Array.isArray(d.meals) ? d.meals.join(", ") : d.meals,
                location: d.location,
                menu: d.menu,
              });
            }
          });
        }
      } catch (dbErr) {
        console.warn("Widget endpoint: Firestore fetch failed, falling back to local orders:", dbErr);
        const localOrders = getLocalOrders() as unknown as (OrderData & { id: string })[];
        localOrders.forEach((d) => {
          const eventDate = d.dateTime ? new Date(d.dateTime) : (d.date ? new Date(`${d.date}T${d.time || '12:00'}:00+08:00`) : null);
          if (eventDate && !isNaN(eventDate.getTime()) && eventDate.getTime() >= now.getTime()) {
            results.push({
              id: d.id,
              date: eventDate.toISOString(),
              quantity: d.quantity,
              meals: Array.isArray(d.meals) ? d.meals.join(", ") : d.meals,
              location: d.location,
              menu: d.menu,
            });
          }
        });
      }

      results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      res.json({ success: true, orders: results.slice(0, limit) });
    } catch (err) {
      console.error("Widget endpoint error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Specialized KWGT (Kustom Widget) endpoint for upcoming event
  app.get("/api/widget/kwgt", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const now = new Date();
      interface UpcomingOrder extends OrderData {
        id: string;
        computedDate?: Date;
        eventTimestamp?: Timestamp;
      }
      let nextOrder: UpcomingOrder | null = null;

      try {
        const adminDb = getFirestore();
        const nowTs = Timestamp.fromDate(now);
        const snapshot = await adminDb
          .collection("orders")
          .where("eventTimestamp", ">=", nowTs)
          .orderBy("eventTimestamp", "asc")
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          nextOrder = { id: docSnap.id, ...docSnap.data() } as UpcomingOrder;
        } else {
          // Backward compatibility fallback for older orders without eventTimestamp
          const legacySnap = await adminDb.collection("orders").get();
          const legacyOrders: UpcomingOrder[] = [];
          legacySnap.forEach((docSnap) => {
            const d = docSnap.data() as OrderData;
            const eventDate = d.dateTime
              ? new Date(d.dateTime)
              : d.date
                ? new Date(`${d.date}T${d.time || "12:00"}:00+08:00`)
                : null;
            if (eventDate && !isNaN(eventDate.getTime()) && eventDate.getTime() >= now.getTime()) {
              legacyOrders.push({
                id: docSnap.id,
                ...d,
                computedDate: eventDate
              });
            }
          });
          if (legacyOrders.length > 0) {
            legacyOrders.sort((a, b) => {
              const aTime = a.computedDate?.getTime() || 0;
              const bTime = b.computedDate?.getTime() || 0;
              return aTime - bTime;
            });
            nextOrder = legacyOrders[0];
          }
        }
      } catch (dbErr) {
        console.warn("KWGT endpoint: Firestore fetch failed, falling back to local orders:", dbErr);
        const localOrders = getLocalOrders() as unknown as (OrderData & { id: string })[];
        const upcomingLocal: UpcomingOrder[] = [];
        localOrders.forEach((d) => {
          const eventDate = d.dateTime ? new Date(d.dateTime) : (d.date ? new Date(`${d.date}T${d.time || '12:00'}:00+08:00`) : null);
          if (eventDate && !isNaN(eventDate.getTime()) && eventDate.getTime() >= now.getTime()) {
            upcomingLocal.push({
              ...d,
              id: d.id,
              computedDate: eventDate
            });
          }
        });
        if (upcomingLocal.length > 0) {
          upcomingLocal.sort((a, b) => {
            const aTime = a.computedDate?.getTime() || 0;
            const bTime = b.computedDate?.getTime() || 0;
            return aTime - bTime;
          });
          nextOrder = upcomingLocal[0];
        }
      }

      if (!nextOrder) {
        return res.json({
          status: "success",
          title: "No Upcoming Events",
          time: "--:--"
        });
      }

      // Format time to GMT+8 (Malaysia time) "08:00 PM"
      const eventDate = nextOrder.eventTimestamp?.toDate?.() ||
        (nextOrder.dateTime ? new Date(nextOrder.dateTime) : nextOrder.date ? new Date(`${nextOrder.date}T${nextOrder.time || "12:00"}:00+08:00`) : null);

      let timeStr = "--:--";
      if (eventDate && !isNaN(eventDate.getTime())) {
        const utc = eventDate.getTime() + eventDate.getTimezoneOffset() * 60000;
        const myTime = new Date(utc + (3600000 * 8)); // UTC+8
        
        let hours = myTime.getHours();
        const minutes = myTime.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // hour '0' should be '12'
        
        const minutesStr = String(minutes).padStart(2, "0");
        const hoursStr = String(hours).padStart(2, "0");
        timeStr = `${hoursStr}:${minutesStr} ${ampm}`;
      }

      const orderName = nextOrder.name || "Customer";
      const orderMenu = nextOrder.menu || "Catering";
      const orderQty = nextOrder.quantity || 0;
      const titleStr = `${orderName} - ${orderMenu} (${orderQty} Pax)`;

      res.json({
        status: "success",
        title: titleStr,
        time: timeStr
      });
    } catch (err) {
      console.error("KWGT endpoint error:", err);
      res.status(500).json({ 
        status: "error",
        message: err instanceof Error ? err.message : "Internal server error" 
      });
    }
  });

  // TEMPORARY DEBUG ENDPOINT - lists ALL orders with no date filter, to verify
  // Firestore actually contains test data. Remove this once debugging is done.
  if (process.env.ENABLE_DEBUG_ENDPOINTS === "true") {
    app.get("/api/widget/debug-all-orders", async (req, res) => {
      try {
        const results: Record<string, unknown>[] = [];
        try {
          const adminDb = getFirestore();
          const snapshot = await adminDb.collection("orders").get();
          snapshot.forEach((docSnap) => {
            results.push({ id: docSnap.id, ...docSnap.data() });
          });
        } catch (dbErr) {
          console.warn("Debug endpoint: Firestore fetch failed:", dbErr);
        }
        const localOrders = getLocalOrders();
        res.json({ success: true, firestoreCount: results.length, localCount: localOrders.length, firestoreOrders: results, localOrders });
      } catch (err) {
        console.error("Debug endpoint error:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
      }
    });
  }

  // Submit order endpoint - tries Firestore first, falls back to local JSON backup
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = req.body as OrderData;

      // IMPORTANT: Do not silently fall back to client-side Firestore writes in production.
      // This endpoint is the single source of truth for:
      // 1) sequential invoice numbers, 2) correct Firestore project, 3) widget pipeline.
      let orderId = "";
      let invoiceNo = "";
      try {
        const created = await runWithRetry(() => createOrderWithSequentialInvoice(orderData));
        orderId = created.orderId;
        invoiceNo = created.invoiceNo;
      } catch (firestoreErr) {
        if (ENABLE_LOCAL_FALLBACK) {
          console.warn("Firestore order submission failed; ENABLE_LOCAL_FALLBACK=true so saving locally:", firestoreErr);
          orderId = "order_" + Math.random().toString(36).substring(2, 10);
          invoiceNo = `RW-FALLBACK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const localOrders = getLocalOrders();
          localOrders.push({
            id: orderId,
            ...orderData,
            status: "pending",
            approvedAt: new Date().toISOString(),
            invoiceNo,
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          });
          saveLocalOrders(localOrders);
        } else {
          throw firestoreErr;
        }
      }

      // Trigger background Google Calendar event creation safely without blocking client response
      syncGoogleCalendarEvent(orderId, { ...orderData, invoiceNo }).catch(err => {
        console.error("Background Google Calendar event creation error:", err);
      });

      // Trigger push notification
      sendNotificationToTopic("new_orders", "New Order Received!", `New order from ${orderData.name || 'Customer'} - ${orderData.quantity || '0'} pax.`).catch(err => {
        console.error("Background push notification error:", err);
      });

      res.json({ success: true, id: orderId, invoiceNo });
    } catch (err) {
      console.error("Order submission endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Cancel order request endpoint (called by member/user)
  app.post("/api/orders/cancel", async (req, res) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, error: "Missing orderId" });
      }

      // Verify the caller's identity from a real Firebase ID token instead of
      // trusting a client-supplied userId field (see verifyCustomerIdToken).
      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid session token" });
      }

      // 1. Fetch document from Firestore or Local JSON
      let data: OrderData | null = null;
      let isLocal = false;
      
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) {
          data = docSnap.data() as OrderData;
        }
      } catch (dbErr) {
        console.warn("Firestore fetch in order cancel failed, trying local backup:", dbErr);
      }

      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === orderId);
        if (found) {
          data = found;
          isLocal = true;
        }
      }

      if (!data) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      // 2. Security validation: ensure order belongs to requesting user
      const orderUserId = data.userId || data.uid;
      if (orderUserId !== callerUid) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order" });
      }

      // 3. Update Firestore or Local JSON to status 'cancel_requested'
      const updatedFields = {
        status: 'cancel_requested',
        cancelRequestedAt: new Date().toISOString()
      };

      if (!isLocal) {
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).update(updatedFields));
        } catch (dbErr) {
          console.warn("Firestore update in order cancel failed after retries, syncing locally:", dbErr);
          isLocal = true;
        }
      }

      if (isLocal) {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            ...updatedFields
          };
          saveLocalOrders(localOrders);
        }
      }

      // Sync Google Calendar Event in background
      syncGoogleCalendarEvent(orderId).catch(err => {
        console.error("Background Google Calendar event sync error during cancel request:", err);
      });

      // Notify the customer that cancellation has been requested
      const mergedOrder = {
        ...data,
        ...updatedFields,
        id: orderId,
      } as unknown as OrderData;
      notifyCustomerOfStatusChange(transporter, mergedOrder, "cancel_requested").catch(err => {
        console.error("[StatusNotify] Background cancel requested notification error:", err);
      });

      // Also trigger a push notification to admin/topic
      sendNotificationToTopic("new_orders", "Order Cancellation Requested", `Cancellation requested for order ${data.invoiceNo || orderId} by ${data.name || 'Customer'}`).catch(err => {
        console.error("Background push notification error for cancellation request:", err);
      });

      return res.json({ success: true, message: "Cancellation request submitted successfully" });
    } catch (err) {
      console.error("Order cancel endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Direct delete of billed order endpoint (called by member/user)
  app.post("/api/orders/delete", async (req, res) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, error: "Missing orderId" });
      }

      // Verify the caller's identity from a real Firebase ID token instead of
      // trusting a client-supplied userId field (see verifyCustomerIdToken).
      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid session token" });
      }

      // 1. Fetch document from Firestore or Local JSON
      let data: OrderData | null = null;
      let isLocal = false;
      
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) {
          data = docSnap.data() as OrderData;
        }
      } catch (dbErr) {
        console.warn("Firestore fetch in order delete failed, trying local backup:", dbErr);
      }

      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === orderId);
        if (found) {
          data = found;
          isLocal = true;
        }
      }

      if (!data) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      // 2. Security validation: ensure order belongs to requesting user
      const orderUserId = data.userId || data.uid;
      if (orderUserId !== callerUid) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order" });
      }

      // 3. Status validation: must be billed to be deleted directly by user
      if (data.status !== "billed") {
        return res.status(400).json({ success: false, error: "Unauthorized: Only billed orders can be deleted directly" });
      }

      // 4. Delete from Firestore and Local JSON
      if (!isLocal) {
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).delete());
        } catch (dbErr) {
          console.warn("Firestore delete failed, falling back to local:", dbErr);
          isLocal = true;
        }
      }

      // Also delete from local orders
      const localOrders = getLocalOrders();
      const filtered = localOrders.filter(o => o.id !== orderId);
      if (filtered.length !== localOrders.length) {
        saveLocalOrders(filtered);
      }

      return res.json({ success: true, message: "Order deleted successfully" });
    } catch (err) {
      console.error("Order delete endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Invoice Billing and Delivery system for Submissions/Orders collection
  app.post("/api/submissions/bill", verifyAdminToken, async (req, res) => {
    try {
      const { submissionId, totalAmount, pdfBase64, fileName, collectionName = 'submissions' } = req.body;

      if (!submissionId) {
        return res.status(400).json({ error: "Missing submissionId" });
      }

      if (totalAmount === undefined || totalAmount === null || isNaN(Number(totalAmount))) {
        return res.status(400).json({ error: "Invalid or missing totalAmount" });
      }

      const parsedAmount = Number(totalAmount);

      // 1. Fetch document from Firestore or Local JSON
      let data: Record<string, unknown> | null = null;
      let isLocal = false;
      
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection(collectionName).doc(submissionId).get();
        if (docSnap.exists) {
          data = docSnap.data() as Record<string, unknown>;
        }
      } catch (dbErr) {
        console.warn("Firestore fetch in bill failed, trying local backup:", dbErr);
      }

      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === submissionId);
        if (found) {
          data = found;
          isLocal = true;
        }
      }

      if (!data) {
        return res.status(404).json({ error: `Document not found in ${collectionName}` });
      }

      // 2. Update Firestore document or Local JSON with totalAmount and set status to 'billed'
      const updatedFields = {
        totalAmount: parsedAmount,
        status: 'billed',
        billedAt: new Date().toISOString()
      };

      if (!isLocal) {
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection(collectionName).doc(submissionId).update(updatedFields));
        } catch (dbErr) {
          console.warn("Firestore update in bill failed after retries, syncing locally:", dbErr);
          isLocal = true;
        }
      }

      if (isLocal) {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === submissionId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            ...updatedFields
          };
          saveLocalOrders(localOrders);
        }
      }

      // Sync Google Calendar Event in background if this is an order
      if (collectionName === 'orders') {
        syncGoogleCalendarEvent(submissionId).catch(err => {
          console.error("Background Google Calendar event sync error during billing:", err);
        });
      }

      // 3. Extract customer email, name, invoice details
      const customerEmail = data.customerEmail || data.email;
      const customerName = data.customerName || data.name || "Valued Customer";
      const invoiceNo = data.invoiceNo || `INV-${submissionId.substring(0, 6).toUpperCase()}`;
      const items = data.items || [];
      const lang = data.lang || 'en';

      if (!customerEmail) {
        return res.json({ 
          success: true, 
          message: "Document successfully updated to 'billed', but no customer email was found in the document to send an invoice." 
        });
      }

      // 4. Secure Email Delivery - Build styled HTML email
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        console.warn("SMTP credentials not configured. Please configure SMTP_USER and SMTP_PASS.");
        return res.json({
          success: true,
          message: "Document successfully updated to 'billed', but email could not be sent because SMTP is not configured on the server."
        });
      }

      // Build items list HTML table if present
      let itemsHtml = '';
      if (items && Array.isArray(items) && items.length > 0) {
        itemsHtml = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-family: sans-serif;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #4a5568; font-size: 13px;">
                <th style="padding: 10px 0;">Item</th>
                <th style="padding: 10px 0; text-align: center;">Qty</th>
                <th style="padding: 10px 0; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
        `;
        interface InvoiceItem {
          name?: string;
          title?: string;
          qty?: number;
          quantity?: number;
          price?: number | string;
        }
        (items as InvoiceItem[]).forEach((item) => {
          const name = item.name || item.title || 'Item';
          const qty = item.qty || item.quantity || 1;
          const price = item.price !== undefined ? `RM ${Number(item.price).toFixed(2)}` : '-';
          itemsHtml += `
            <tr style="border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: 14px;">
              <td style="padding: 12px 0; font-weight: 500;">${escapeHtml(name)}</td>
              <td style="padding: 12px 0; text-align: center; color: #718096;">${qty}</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 500;">${price}</td>
            </tr>
          `;
        });
        itemsHtml += `
            </tbody>
          </table>
        `;
      }

      // Styled HTML Template for the Invoice
      const emailSubject = lang === 'bm'
        ? `Invois Rasmi - ${invoiceNo} (Restoran Wawasan)`
        : `Official Invoice - ${invoiceNo} (Restoran Wawasan)`;

      const titleText = lang === 'bm' ? 'INVOIS RASMI' : 'OFFICIAL INVOICE';
      const billToText = lang === 'bm' ? 'Bil Kepada:' : 'Bill To:';
      const invoiceNoText = lang === 'bm' ? 'No. Invois:' : 'Invoice No:';
      const dateText = lang === 'bm' ? 'Tarikh:' : 'Date:';
      const totalAmountText = lang === 'bm' ? 'Jumlah Keseluruhan:' : 'Total Amount:';
      const thankYouText = lang === 'bm'
        ? 'Terima kasih atas kunjungan/pesanan anda di Restoran Wawasan! Sila dapati butiran bil anda di bawah.'
        : 'Thank you for your order/visit at Restoran Wawasan! Please find your billing details below.';
      const footerText = lang === 'bm'
        ? 'E-mel ini dijanakan secara automatik. Sila hubungi kami jika terdapat sebarang pertanyaan.'
        : 'This is an automatically generated email. Please contact us if you have any questions.';

      const formattedDate = new Date().toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f7fafc;
              margin: 0;
              padding: 20px;
              color: #2d3748;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              border: 1px solid #e2e8f0;
            }
            .header {
              background-color: #1a202c;
              padding: 30px;
              text-align: center;
              color: #ffffff;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 0.05em;
            }
            .header p {
              margin: 5px 0 0 0;
              color: #a0aec0;
              font-size: 14px;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #edf2f7;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
              font-size: 14px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .meta-row:last-child {
              margin-bottom: 0;
            }
            .meta-label {
              color: #718096;
              font-weight: 500;
            }
            .meta-value {
              color: #2d3748;
              font-weight: 600;
              text-align: right;
            }
            .total-box {
              background-color: #ebf8ff;
              border: 1px solid #bee3f8;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin-top: 20px;
              margin-bottom: 25px;
            }
            .total-label {
              font-size: 14px;
              color: #2b6cb0;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              font-weight: 700;
              margin-bottom: 5px;
            }
            .total-amount {
              font-size: 32px;
              font-weight: 800;
              color: #2b6cb0;
            }
            .footer {
              background-color: #f7fafc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #a0aec0;
              border-top: 1px solid #edf2f7;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RESTORAN WAWASAN</h1>
              <p>${titleText}</p>
            </div>
            <div class="content">
              <div class="greeting">
                <p style="margin-top:0; font-weight: 600; font-size: 18px;">${lang === 'bm' ? 'Salam' : 'Hello'} ${escapeHtml(customerName)},</p>
                <p style="color: #4a5568;">${thankYouText}</p>
              </div>
              
              <div class="meta-box">
                <div class="meta-row">
                  <span class="meta-label">${billToText}</span>
                  <span class="meta-value">${escapeHtml(customerName)} (${escapeHtml(customerEmail)})</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">${invoiceNoText}</span>
                  <span class="meta-value" style="color: #1a202c;">${invoiceNo}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">${dateText}</span>
                  <span class="meta-value">${formattedDate}</span>
                </div>
              </div>

              ${itemsHtml}

              <div class="total-box">
                <div class="total-label">${totalAmountText}</div>
                <div class="total-amount">RM ${parsedAmount.toFixed(2)}</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">${footerText}</p>
              <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Restoran Wawasan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 5. Send secure email
      const emailAttachments = [];
      if (pdfBase64) {
        emailAttachments.push({
          filename: fileName || `Invoice_${invoiceNo}.pdf`,
          content: pdfBase64,
          encoding: 'base64'
        });
      }

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${process.env.SENDER_EMAIL || 'madnor.noisy@gmail.com'}>`,
        to: customerEmail,
        subject: emailSubject,
        html: htmlBody,
        attachments: emailAttachments.length > 0 ? emailAttachments : undefined
      });

      console.log(`Invoice email sent successfully to ${customerEmail} for submission ${submissionId}`);
      res.json({ 
        success: true, 
        message: "Submission updated and invoice email sent successfully", 
        data: { 
          submissionId, 
          totalAmount: parsedAmount, 
          status: 'billed',
          emailSentTo: customerEmail
        } 
      });

    } catch (error) {
      console.error("Error billing submission:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to bill submission and send email" });
    }
  });

  app.post("/api/send-invoice", async (req, res) => {
    try {
      const { email, name, invoiceNo, pdfBase64, isFinal, lang, orderDetails } = req.body;

      if (!email || !pdfBase64) {
        return res.status(400).json({ error: "Missing required fields (email, pdfBase64)" });
      }

      // Ensure SMTP is configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Please configure SMTP_USER and SMTP_PASS.");
        return res.status(500).json({ error: "Email service not configured." });
      }

      const emailSubject = lang === 'bm' 
        ? (isFinal ? `Invois Muktamad - ${invoiceNo}` : `Invois Awal - ${invoiceNo}`)
        : (isFinal ? `Final Invoice - ${invoiceNo}` : `Preliminary Invoice - ${invoiceNo}`);

      let emailBody = "";
      let htmlBody: string | undefined = undefined;

      if (orderDetails) {
        const titleText = lang === 'bm' ? 'TEMPAHAN KATERING REKODED' : 'CATERING BOOKING RECORDED';
        const subtitleText = lang === 'bm' ? 'Butiran Tempahan & Invois Awal' : 'Booking Details & Preliminary Invoice';
        const thankYouText = lang === 'bm'
          ? `Terima kasih kerana memilih <strong>Restoran Wawasan</strong>! Butiran tempahan katering anda telah berjaya direkodkan. Sila dapati salinan butiran lengkap pesanan anda di bawah.`
          : `Thank you for choosing <strong>Restoran Wawasan</strong>! Your catering booking details have been successfully recorded. Please find a copy of your complete order details below.`;
        
        const footerText = lang === 'bm'
          ? 'E-mel ini dijanakan secara automatik. Sila hubungi kami jika terdapat sebarang pertanyaan.'
          : 'This is an automatically generated email. Please contact us if you have any questions.';

        const mealLabels: Record<string, string> = {
          'breakfast': lang === 'bm' ? 'Sarapan (Breakfast)' : 'Breakfast (Sarapan)',
          'lunch': lang === 'bm' ? 'Makan Tengahari (Lunch)' : 'Lunch (Makan Tengahari)',
          'tea_break': lang === 'bm' ? 'Minum Petang (High Tea)' : 'High Tea (Minum Petang)',
          'dinner': lang === 'bm' ? 'Makan Malam (Dinner)' : 'Dinner (Makan Malam)'
        };
        const formattedMeals = Array.isArray(orderDetails.meals)
          ? orderDetails.meals.map((m: string) => mealLabels[m] || m).join(', ')
          : (orderDetails.meals || 'N/A');

        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f7fafc;
                margin: 0;
                padding: 20px;
                color: #2d3748;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                border: 1px solid #e2e8f0;
              }
              .header {
                background-color: #1a202c;
                padding: 30px;
                text-align: center;
                color: #ffffff;
                border-bottom: 3px solid #D4AF37;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 0.05em;
                color: #D4AF37;
              }
              .header p {
                margin: 5px 0 0 0;
                color: #a0aec0;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
              }
              .content {
                padding: 30px;
              }
              .greeting {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 25px;
              }
              .section-title {
                font-size: 16px;
                font-weight: 700;
                color: #1a202c;
                border-bottom: 2px solid #edf2f7;
                padding-bottom: 8px;
                margin-top: 25px;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .detail-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                font-size: 14px;
              }
              .detail-table td {
                padding: 10px 12px;
                vertical-align: top;
                border-bottom: 1px solid #f7fafc;
              }
              .detail-table td.label {
                width: 35%;
                color: #718096;
                font-weight: 600;
                background-color: #fcfcfc;
              }
              .detail-table td.value {
                width: 65%;
                color: #2d3748;
                font-weight: 500;
              }
              .notes-box {
                background-color: #fffaf0;
                border: 1px solid #feebc8;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 25px;
                font-size: 14px;
              }
              .notes-title {
                color: #dd6b20;
                font-weight: 700;
                margin-bottom: 5px;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.05em;
              }
              .notes-content {
                color: #7b341e;
                line-height: 1.5;
              }
              .footer {
                background-color: #f7fafc;
                padding: 25px;
                text-align: center;
                font-size: 12px;
                color: #a0aec0;
                border-top: 1px solid #edf2f7;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>RESTORAN WAWASAN</h1>
                <p>${titleText}</p>
                <div style="font-size: 12px; color: #cbd5e0; margin-top: 4px;">${subtitleText}</div>
              </div>
              <div class="content">
                <div class="greeting">
                  <p style="margin-top: 0; font-weight: 700; font-size: 18px; color: #1a202c;">
                    ${lang === 'bm' ? 'Salam' : 'Hello'} ${escapeHtml(name || 'Customer')},
                  </p>
                  <p style="color: #4a5568; margin-bottom: 0;">${thankYouText}</p>
                </div>

                <div class="section-title">${lang === 'bm' ? 'BUTIRAN MAJLIS' : 'EVENT DETAILS'}</div>
                <table class="detail-table">
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Syarikat / Organisasi' : 'Company / Organization'}</td>
                    <td class="value">${escapeHtml(orderDetails.to) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Untuk Perhatian (Attn)' : 'Attention (Attn)'}</td>
                    <td class="value">${escapeHtml(orderDetails.attn) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Nama PIC' : 'PIC Name'}</td>
                    <td class="value">${escapeHtml(orderDetails.name) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Siri Hubungan' : 'Contact Number'}</td>
                    <td class="value">${escapeHtml(orderDetails.contact) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Alamat E-mel' : 'Email Address'}</td>
                    <td class="value">${escapeHtml(orderDetails.email) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Tarikh Majlis' : 'Event Date'}</td>
                    <td class="value" style="color: #2b6cb0; font-weight: 700;">${escapeHtml(orderDetails.date) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Masa Penghantaran' : 'Delivery Time'}</td>
                    <td class="value">${escapeHtml(orderDetails.time) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Lokasi / Alamat Majlis' : 'Event Venue'}</td>
                    <td class="value">${escapeHtml(orderDetails.location) || 'N/A'}</td>
                  </tr>
                </table>

                <div class="section-title">${lang === 'bm' ? 'PILIHAN MENU & HIDANGAN' : 'MENU & MEAL SELECTION'}</div>
                <table class="detail-table">
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Pakej Pilihan' : 'Selected Package'}</td>
                    <td class="value" style="font-weight: 700; color: #1a202c;">${escapeHtml(orderDetails.menu) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Bilangan Pax' : 'Quantity (Pax)'}</td>
                    <td class="value" style="font-weight: 700; color: #2b6cb0;">${escapeHtml(orderDetails.quantity) || 'N/A'} Pax</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Jenis Hidangan' : 'Meal Types'}</td>
                    <td class="value">${escapeHtml(formattedMeals)}</td>
                  </tr>
                </table>

                ${orderDetails.notes ? `
                  <div class="notes-box">
                    <div class="notes-title">${lang === 'bm' ? 'PERMINTAAN KHAS / NOTA' : 'SPECIAL REQUESTS / NOTES'}</div>
                    <div class="notes-content">${escapeHtml(orderDetails.notes).replace(/\\n/g, '<br>')}</div>
                  </div>
                ` : ''}

                <div style="background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 15px; text-align: center; font-size: 14px; color: #2b6cb0; font-weight: 600;">
                  ${lang === 'bm' 
                    ? `Salinan invois awal (${invoiceNo}) telah dilampirkan bersama e-mel ini.` 
                    : `A copy of your preliminary invoice (${invoiceNo}) has been attached to this email.`}
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0;">${footerText}</p>
                <p style="margin: 5px 0 0 0; font-weight: 600; color: #718096;">Restoran Wawasan Putrajaya</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Restoran Wawasan. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
      } else {
        emailBody = lang === 'bm'
          ? `Salam ${name || 'Pelanggan'},\n\nSila dapati lampiran invois untuk rujukan anda.\n\nTerima kasih.\nRestoran Wawasan`
          : `Dear ${name || 'Customer'},\n\nPlease find attached the invoice for your reference.\n\nThank you.\nRestoran Wawasan`;
      }

      // Convert base64 back to buffer
      const pdfBuffer = Buffer.from(pdfBase64.split(',')[1] || pdfBase64, 'base64');

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${process.env.SENDER_EMAIL || 'madnor.noisy@gmail.com'}>`,
        to: email,
        subject: emailSubject,
        text: htmlBody ? undefined : emailBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Invoice_${invoiceNo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      console.log(`Invoice email sent successfully to ${email}`);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Admin Login Endpoint
  // JWT secret for admin session tokens. This MUST be set in Render's
  // environment variables. The fallback below only exists so the server
  // doesn't crash if it's missing, but using the fallback means every
  // restart invalidates all issued tokens (weak, but not silently insecure
  // like a fixed default password would be).
  const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
  if (!ADMIN_JWT_SECRET) {
    console.warn(
      "[Admin Auth] ADMIN_JWT_SECRET is not set in environment variables. " +
      "Falling back to a random secret generated at server startup. " +
      "This means all admin sessions will be invalidated every time the " +
      "server restarts. Set ADMIN_JWT_SECRET in Render's dashboard to fix this."
    );
  }
  const effectiveJwtSecret = ADMIN_JWT_SECRET || crypto.randomBytes(32).toString("hex");

  // Express middleware: verifies the Authorization: Bearer <token> header
  // issued by /api/admin/login. Replaces the old pattern of resending the
  // raw admin password on every request.
  function verifyAdminToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing admin session token" });
    }

    try {
      jwt.verify(token, effectiveJwtSecret);
      next();
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired admin session token" });
    }
  }

  app.post("/api/admin/login", (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!password || password !== adminPassword) {
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid password" });
      }

      const token = jwt.sign({ role: "admin" }, effectiveJwtSecret, { expiresIn: "12h" });
      return res.json({ success: true, token });
    } catch (err) {
      console.error("Admin login API error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Gated Admin orders operations bypassing client-side security restrictions via Client SDK
  app.post("/api/admin/subscribe-to-topic", verifyAdminToken, async (req, res) => {
    try {
      const { token, topic } = req.body;
      if (!token || !topic) {
        return res.status(400).json({ error: "Missing token or topic" });
      }
      
      const app = getAdminApp();
      await getMessaging(app).subscribeToTopic(token, topic);
      console.log(`Successfully subscribed token to topic ${topic}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Error subscribing to topic:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  app.post("/api/admin/orders", verifyAdminToken, async (req, res) => {
    try {
      const { action, orderId, data } = req.body;

      if (action === "fetch") {
        const orders: Record<string, unknown>[] = [];
        try {
          const adminDb = getFirestore();
          const snapshot = await adminDb.collection("orders").orderBy("createdAt", "desc").get();
          snapshot.forEach((docSnap) => {
            const docData = docSnap.data();
            const createdAt = docData.createdAt as { seconds?: number; nanoseconds?: number } | null;
            orders.push({
              id: docSnap.id,
              ...docData,
              createdAt: createdAt ? {
                seconds: createdAt.seconds,
                nanoseconds: createdAt.nanoseconds
              } : null
            });
          });
        } catch (dbErr) {
          console.warn("Firestore fetch failed, relying on local backup:", dbErr);
        }

        // Merge with local orders
        const localOrders = getLocalOrders();
        localOrders.forEach((localOrder) => {
          if (!orders.some(o => o.id === localOrder.id)) {
            orders.push(localOrder);
          }
        });

        // Sort merged orders by createdAt descending
        orders.sort((a, b) => {
          interface OrderWithTimestamp {
            createdAt?: { seconds?: number; nanoseconds?: number } | null;
          }
          const secA = ((a as unknown) as OrderWithTimestamp).createdAt?.seconds || 0;
          const secB = ((b as unknown) as OrderWithTimestamp).createdAt?.seconds || 0;
          return secB - secA;
        });

        return res.json({ success: true, orders });
      }

      if (action === "update") {
        if (!orderId || !data) {
          return res.status(400).json({ error: "Missing orderId or data for update" });
        }

        // Capture the order's status BEFORE applying the update so we can detect
        // an actual status change and notify the customer. Read from Firestore
        // first, then fall back to the local backup. Never let this block the update.
        let previousOrder: Record<string, unknown> | undefined;
        try {
          const adminDb = getFirestore();
          const beforeSnap = await adminDb.collection("orders").doc(orderId).get();
          if (beforeSnap.exists) {
            previousOrder = beforeSnap.data() as Record<string, unknown>;
          }
        } catch (readErr) {
          console.warn("[StatusNotify] Could not read order before update (Firestore):", readErr);
        }
        if (!previousOrder) {
          const localOrdersBefore = getLocalOrders();
          previousOrder = localOrdersBefore.find(o => o.id === orderId);
        }
        const previousStatus = (previousOrder?.status as string | undefined) || "";

        let updatedInFirestore = false;
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).update(data));
          updatedInFirestore = true;
        } catch (dbErr) {
          console.warn("Firestore update failed after retries, relying on local backup:", dbErr);
        }

        // Also update in local orders
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            ...data
          };
          saveLocalOrders(localOrders);
        } else if (!updatedInFirestore) {
          const newLocalOrder = {
            id: orderId,
            ...data,
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
          };
          localOrders.push(newLocalOrder);
          saveLocalOrders(localOrders);
        }

        // Trigger Google Calendar sync for updated order
        syncGoogleCalendarEvent(orderId).catch(err => {
          console.error("Background Google Calendar event sync error during admin update:", err);
        });

        // Notify the customer if the order STATUS actually changed.
        // Fire-and-forget: this must never block or fail the admin update.
        const newStatus = (data as Record<string, unknown>)?.status as string | undefined;
        if (newStatus && newStatus !== previousStatus) {
          const mergedOrder = {
            ...(previousOrder || {}),
            ...(data as Record<string, unknown>),
            id: orderId,
          } as Partial<OrderData> & { id?: string; uid?: string; email?: string; name?: string; invoiceNo?: string; lang?: string };
          console.log(`[StatusNotify] Order ${orderId} status changed: "${previousStatus}" -> "${newStatus}". Notifying customer.`);
          notifyCustomerOfStatusChange(transporter, mergedOrder, newStatus).catch(err => {
            console.error("[StatusNotify] Background status notification error:", err);
          });
        }

        return res.json({ success: true });
      }

      if (action === "delete") {
        if (!orderId) {
          return res.status(400).json({ error: "Missing orderId for delete" });
        }

        // Detect if we need to send cancellation notification
        let previousOrder: OrderData | undefined;
        try {
          const adminDb = getFirestore();
          const docSnap = await adminDb.collection("orders").doc(orderId).get();
          if (docSnap.exists) {
            previousOrder = docSnap.data() as OrderData;
          }
        } catch (readErr) {
          console.warn("[DeleteNotify] Could not read order before delete (Firestore):", readErr);
        }
        if (!previousOrder) {
          const localOrdersBefore = getLocalOrders();
          previousOrder = localOrdersBefore.find(o => o.id === orderId);
        }

        const isCancellationApproval = previousOrder?.status === "cancel_requested";
        
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).delete());
        } catch (dbErr) {
          console.warn("Firestore delete failed after retries, relying on local backup:", dbErr);
        }

        // Also delete in local orders
        const localOrders = getLocalOrders();
        const filtered = localOrders.filter(o => o.id !== orderId);
        if (filtered.length !== localOrders.length) {
          saveLocalOrders(filtered);
        }

        // Notify customer that cancellation request has been approved and order is cancelled
        if (isCancellationApproval && previousOrder) {
          const mergedOrder = {
            ...previousOrder,
            id: orderId,
            status: 'cancelled'
          };
          console.log(`[StatusNotify] Order ${orderId} cancellation approved by admin. Notifying customer.`);
          notifyCustomerOfStatusChange(transporter, mergedOrder, "cancelled").catch(err => {
            console.error("[StatusNotify] Background cancellation notification error:", err);
          });
        }

        return res.json({ success: true });
      }

      return res.status(400).json({ error: "Invalid action" });
    } catch (err) {
      console.error("Admin orders API error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Admin branding settings update, routed through the Admin SDK (bypasses
  // Firestore client rules, which require Firebase Auth — admin sessions
  // here use the JWT scheme via verifyAdminToken instead).
  app.post("/api/admin/branding", verifyAdminToken, async (req, res) => {
    try {
      const { accent } = req.body;

      if (accent !== "sunshine" && accent !== "kiwi") {
        return res.status(400).json({ error: "Invalid accent value. Must be 'sunshine' or 'kiwi'." });
      }

      const adminDb = getFirestore();
      await adminDb.collection("settings").doc("branding").set({ accent }, { merge: true });

      return res.json({ success: true });
    } catch (err) {
      console.error("Admin branding API error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Vite middleware for development - check if we are in production
  const isProduction = process.env.NODE_ENV === "production" && fs.existsSync(path.join(process.cwd(), "dist/index.html"));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
