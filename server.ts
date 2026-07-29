import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

import {
  firebaseConfig,
  ENABLE_LOCAL_FALLBACK,
  clean,
} from "./server/config.js";

import {
  getAdminApp,
  getFirestore,
  verifyCustomerIdToken,
  sendNotificationToTopic,
  runWithRetry,
  getLocalOrders,
  saveLocalOrders,
  createOrderWithSequentialInvoice,
  generateSequentialInvoiceNo,
  type OrderData,
} from "./server/firebaseAdmin.js";

import {
  escapeHtml,
  notifyCustomerOfStatusChange,
} from "./server/emailService.js";

import { logAuditEvent } from "./server/auditLogger.js";
import { generateOrdersWorkbook, generateOrdersCSV } from "./server/exportService.js";

import {
  getGoogleCalendarClient,
  syncGoogleCalendarEvent,
} from "./server/calendarService.js";

import {
  effectiveJwtSecret,
  revokeJti,
  verifyAdminToken,
} from "./server/adminAuth.js";

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  // Middleware
  const DEFAULT_ORIGINS = [
    "https://restoran-wawasan-bio.onrender.com",
    "capacitor://localhost",
    "https://localhost",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://10.0.2.2",
    "http://10.0.2.2:3000",
  ];
  const ENV_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const ALLOWED_ORIGINS = [...DEFAULT_ORIGINS, ...ENV_ORIGINS];

  app.use(cors({
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
      if (!origin || origin === "null") return cb(null, true);
      if (
        ALLOWED_ORIGINS.includes(origin) ||
        origin.startsWith("https://localhost") ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("capacitor://") ||
        origin.startsWith("file://") ||
        origin.endsWith(".run.app") ||
        origin.endsWith(".onrender.com") ||
        origin.endsWith(".google.com") ||
        origin.endsWith(".googleusercontent.com")
      ) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    credentials: false,
    maxAge: 600,
  }));

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'", "https://aistudio.google.com", "https://*.google.com", "https://*.googleusercontent.com", "https://*.run.app"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https://restoran-wawasan-bio.onrender.com",
          "https://firestore.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://*.firebaseio.com",
          "https://*.firebasestorage.app",
          "https://fcm.googleapis.com",
          "wss:",
        ],
        frameSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));

  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: "Too many login attempts. Please try again later." },
  });
  const adminOpsLimiter = rateLimit({
    windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many admin operations. Slow down." },
  });
  const orderSubmissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many submissions. Please try again later." },
  });
  const widgetLimiter = rateLimit({
    windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many widget requests." },
  });
  const publicEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many emails sent. Please try again later." },
  });
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false,
  });
  app.use(globalLimiter);

  app.use(express.json({ limit: '25mb' }));

  // SMTP configuration — Brevo relay (smtp-relay.brevo.com:2525)
  const smtpHost   = clean(process.env.SMTP_HOST) || "smtp-relay.brevo.com";
  const smtpPort   = Number(clean(process.env.SMTP_PORT) || "2525");
  const smtpSecure = clean(process.env.SMTP_SECURE).toLowerCase() === "true";
  const smtpUser   = clean(process.env.SMTP_USER);
  const smtpPass   = clean(process.env.SMTP_PASS);
  const senderEmail = clean(process.env.SENDER_EMAIL) || "wawasan.orders@gmail.com";

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  console.log("[SMTP] Host:        ", smtpHost);
  console.log("[SMTP] Port:        ", smtpPort);
  console.log("[SMTP] Secure:      ", smtpSecure);
  console.log("[SMTP] User:        ", smtpUser);
  console.log("[SMTP] Sender email:", senderEmail);

  transporter.verify((error) => {
    if (error) {
      console.error("[SMTP] Connection error:", error);
    } else {
      console.log("[SMTP] Connection verified — ready to send emails.");
    }
  });

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Company Presets: GET /api/presets
  app.get("/api/presets", async (req, res) => {
    try {
      const uid = await verifyCustomerIdToken(req);
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const db = getFirestore();
      const snap = await db.collection("company_presets").where("userId", "==", uid).get();
      const presets: Record<string, unknown>[] = [];
      snap.forEach((doc) => {
        presets.push({ id: doc.id, ...doc.data() });
      });
      return res.json({ success: true, presets });
    } catch (err) {
      console.error("Error fetching presets:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Company Presets: POST /api/presets
  app.post("/api/presets", async (req, res) => {
    try {
      const uid = await verifyCustomerIdToken(req);
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { presetName, companyName, department, billingAddress, deliveryAddress, contactName, contactPhone, contactEmail } = req.body;
      if (!presetName || !companyName) {
        return res.status(400).json({ error: "Preset Name and Company Name are required" });
      }
      const db = getFirestore();
      const docRef = db.collection("company_presets").doc();
      const presetData = {
        id: docRef.id,
        userId: uid,
        presetName,
        companyName,
        department: department || "",
        billingAddress: billingAddress || "",
        deliveryAddress: deliveryAddress || "",
        contactName: contactName || "",
        contactPhone: contactPhone || "",
        contactEmail: contactEmail || "",
        createdAt: new Date().toISOString(),
      };
      await docRef.set(presetData);
      await logAuditEvent({
        action: "preset_created",
        performedBy: uid,
        targetType: "preset",
        targetId: docRef.id,
        details: `Created company preset: ${presetName} (${companyName})`,
      });
      return res.json({ success: true, preset: presetData });
    } catch (err) {
      console.error("Error creating preset:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Company Presets: DELETE /api/presets/:id
  app.delete("/api/presets/:id", async (req, res) => {
    try {
      const uid = await verifyCustomerIdToken(req);
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const presetId = req.params.id;
      const db = getFirestore();
      const docRef = db.collection("company_presets").doc(presetId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: "Preset not found" });
      }
      const data = snap.data();
      if (data?.userId !== uid) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await docRef.delete();
      await logAuditEvent({
        action: "preset_deleted",
        performedBy: uid,
        targetType: "preset",
        targetId: presetId,
        details: `Deleted preset: ${data?.presetName || presetId}`,
      });
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting preset:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Admin Next Sequential Invoice Number: GET /api/admin/next-invoice-number
  app.get("/api/admin/next-invoice-number", verifyAdminToken, async (_req, res) => {
    try {
      const db = getFirestore();
      const counterSnap = await db.collection("meta").doc("invoiceCounter").get();
      let nextCount = 1;
      if (counterSnap.exists) {
        const data = counterSnap.data();
        if (data && typeof data.count === "number") {
          nextCount = data.count + 1;
        }
      }
      const nextInvoiceNo = `RW${String(nextCount).padStart(4, "0")}`;
      return res.json({ success: true, nextInvoiceNo });
    } catch (err) {
      console.error("Error fetching next invoice number:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Admin Check Invoice Unique: POST /api/admin/check-invoice-unique
  app.post("/api/admin/check-invoice-unique", verifyAdminToken, async (req, res) => {
    try {
      const { invoiceNo, orderId } = req.body;
      if (!invoiceNo) {
        return res.status(400).json({ error: "Missing invoiceNo" });
      }
      const db = getFirestore();
      const snap = await db.collection("orders").where("invoiceNo", "==", invoiceNo).get();
      let isUnique = true;
      snap.forEach((doc) => {
        if (doc.id !== orderId) {
          isUnique = false;
        }
      });

      let suggestedNext: string | undefined = undefined;
      if (!isUnique) {
        const counterSnap = await db.collection("meta").doc("invoiceCounter").get();
        let nextCount = 1;
        if (counterSnap.exists) {
          const data = counterSnap.data();
          if (data && typeof data.count === "number") {
            nextCount = data.count + 1;
          }
        }
        suggestedNext = `RW${String(nextCount).padStart(4, "0")}`;
      }

      return res.json({ success: true, isUnique, suggestedNext });
    } catch (err) {
      console.error("Error checking invoice uniqueness:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Data Export: GET /api/exports/orders
  app.get("/api/exports/orders", async (req, res) => {
    try {
      const format = (req.query.format as string) || "csv";
      const statusFilter = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const clientCompanyId = req.query.clientCompanyId as string;

      const db = getFirestore();
      const query = db.collection("orders").orderBy("createdAt", "desc");
      const snap = await query.get();

      let orders: OrderData[] = [];
      snap.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as OrderData);
      });

      // Also check local orders if available
      const localOrders = getLocalOrders() as unknown as OrderData[];
      localOrders.forEach((l) => {
        if (!orders.some((o) => o.id === l.id)) {
          orders.push(l);
        }
      });

      // Apply Filters
      if (statusFilter && statusFilter !== "all") {
        orders = orders.filter((o) => String(o.status || "").toLowerCase() === statusFilter.toLowerCase());
      }
      if (clientCompanyId) {
        orders = orders.filter((o) => String(o.presetId || o.to || "").toLowerCase().includes(clientCompanyId.toLowerCase()));
      }
      if (dateFrom) {
        const fromTs = new Date(dateFrom).getTime();
        orders = orders.filter((o) => {
          const dt = o.date ? new Date(o.date).getTime() : 0;
          return dt >= fromTs;
        });
      }
      if (dateTo) {
        const toTs = new Date(dateTo).getTime();
        orders = orders.filter((o) => {
          const dt = o.date ? new Date(o.date).getTime() : 0;
          return dt <= toTs;
        });
      }

      await logAuditEvent({
        action: "export_performed",
        performedBy: "admin",
        targetType: "export",
        details: `Exported ${orders.length} orders in ${format.toUpperCase()} format`,
      });

      const timestampStr = new Date().toISOString().slice(0, 10);

      if (format === "xlsx") {
        const workbook = await generateOrdersWorkbook(orders);
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="Orders_Export_${timestampStr}.xlsx"`);
        return res.send(buffer);
      } else {
        const csv = generateOrdersCSV(orders);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="Orders_Export_${timestampStr}.csv"`);
        return res.send(csv);
      }
    } catch (err) {
      console.error("Error exporting orders:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Admin Audit Logs: GET /api/admin/audit-logs
  app.get("/api/admin/audit-logs", verifyAdminToken, async (_req, res) => {
    try {
      const db = getFirestore();
      const snap = await db.collection("audit_logs").orderBy("createdAt", "desc").limit(100).get();
      const logs: Record<string, unknown>[] = [];
      snap.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      return res.json({ success: true, logs });
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Diagnostics: Firebase
  app.get("/api/diagnostics/firebase", adminOpsLimiter, verifyAdminToken, async (_req, res) => {
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

  // Diagnostics: Calendar
  app.get("/api/diagnostics/calendar", adminOpsLimiter, verifyAdminToken, async (_req, res) => {
    try {
      const calendar = getGoogleCalendarClient();
      if (!calendar) {
        return res.status(500).json({
          ok: false,
          error: "Google Calendar client not configured (missing GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY).",
        });
      }

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

  // Diagnostics: Email
  app.post("/api/diagnostics/email", verifyAdminToken, async (req, res) => {
    try {
      const { testEmail } = req.body;

      if (!testEmail) {
        return res.status(400).json({ error: "Missing testEmail" });
      }

      if (!smtpUser || !smtpPass) {
        return res.status(500).json({ 
          ok: false, 
          error: "SMTP is not fully configured (missing SMTP_USER or SMTP_PASS environment variables)." 
        });
      }

      const info = await transporter.sendMail({
        from: `"Restoran Wawasan (Test)" <${senderEmail}>`,
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

  // Widget: Upcoming Orders
  app.get("/api/widget/upcoming-orders", widgetLimiter, async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "5", 10), 20);
      const now = new Date();
      const results: { id: string; date: string; time?: string; quantity?: number; meals?: string; location?: string; menu?: string }[] = [];

      try {
        const adminDb = getFirestore();
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

  // Widget: KWGT
  app.get("/api/widget/kwgt", widgetLimiter, async (_req, res) => {
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

      const eventDate = nextOrder.eventTimestamp?.toDate?.() ||
        (nextOrder.dateTime ? new Date(nextOrder.dateTime) : nextOrder.date ? new Date(`${nextOrder.date}T${nextOrder.time || "12:00"}:00+08:00`) : null);

      let timeStr = "--:--";
      if (eventDate && !isNaN(eventDate.getTime())) {
        const utc = eventDate.getTime() + eventDate.getTimezoneOffset() * 60000;
        const myTime = new Date(utc + (3600000 * 8));
        
        let hours = myTime.getHours();
        const minutes = myTime.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        
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

  // Debug Endpoint
  if (process.env.ENABLE_DEBUG_ENDPOINTS === "true") {
    app.get("/api/widget/debug-all-orders", verifyAdminToken, async (_req, res) => {
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

  // Submit Order
  app.post("/api/orders", orderSubmissionLimiter, async (req, res) => {
    try {
      const rawOrderData = req.body as OrderData;
      const orderData: OrderData = {
        ...rawOrderData,
        status: (rawOrderData.status as string)?.toLowerCase() || "pending",
        invoiceNo: undefined,
        unitPrice: rawOrderData.unitPrice ?? null,
        totalAmount: rawOrderData.totalAmount ?? null,
      };

      let orderId = "";
      try {
        const created = await runWithRetry(() => createOrderWithSequentialInvoice(orderData));
        orderId = created.orderId;
      } catch (firestoreErr) {
        if (ENABLE_LOCAL_FALLBACK) {
          console.warn("Firestore order submission failed; ENABLE_LOCAL_FALLBACK=true so saving locally:", firestoreErr);
          orderId = "order_" + Math.random().toString(36).substring(2, 10);
          const localOrders = getLocalOrders();
          localOrders.push({
            id: orderId,
            ...orderData,
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          });
          saveLocalOrders(localOrders);
        } else {
          throw firestoreErr;
        }
      }

      syncGoogleCalendarEvent(orderId, orderData).catch(err => {
        console.error("Background Google Calendar event creation error:", err);
      });

      sendNotificationToTopic("new_orders", "New Catering Request!", `New request from ${orderData.name || 'Customer'} - ${orderData.quantity || '0'} pax. Needs Pricing.`).catch(err => {
        console.error("Background push notification error:", err);
      });

      logAuditEvent({
        action: "order_submitted",
        performedBy: orderData.userId || "guest",
        performedByName: orderData.name || "Customer",
        targetType: "order",
        targetId: orderId,
        details: `Submitted order for ${orderData.quantity || 0} pax (${orderData.preparationType || 'N/A'})`,
      }).catch(err => console.error("Audit log error:", err));

      res.json({ success: true, id: orderId });
    } catch (err) {
      console.error("Order submission endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Cancel Order
  app.post("/api/orders/cancel", orderSubmissionLimiter, async (req, res) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, error: "Missing orderId" });
      }

      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid session token" });
      }

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
          data = found as OrderData;
          isLocal = true;
        }
      }

      if (!data) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      const orderUserId = data.userId || data.uid;
      if (orderUserId !== callerUid) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order" });
      }

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

      syncGoogleCalendarEvent(orderId).catch(err => {
        console.error("Background Google Calendar event sync error during cancel request:", err);
      });

      const mergedOrder = {
        ...data,
        ...updatedFields,
        id: orderId,
      } as unknown as OrderData;
      notifyCustomerOfStatusChange(transporter, mergedOrder, "cancel_requested", senderEmail, smtpUser, smtpPass).catch(err => {
        console.error("[StatusNotify] Background cancel requested notification error:", err);
      });

      sendNotificationToTopic("new_orders", "Order Cancellation Requested", `Cancellation requested for order ${data.invoiceNo || orderId} by ${data.name || 'Customer'}`).catch(err => {
        console.error("Background push notification error for cancellation request:", err);
      });

      return res.json({ success: true, message: "Cancellation request submitted successfully" });
    } catch (err) {
      console.error("Order cancel endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Poke / Request Invoice Email Endpoint
  app.post("/api/orders/poke", orderSubmissionLimiter, async (req, res) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, error: "Missing orderId" });
      }

      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid session token" });
      }

      let data: OrderData | null = null;
      let isLocal = false;

      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) {
          data = docSnap.data() as OrderData;
        }
      } catch (dbErr) {
        console.warn("Firestore fetch in order poke failed, trying local backup:", dbErr);
      }

      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === orderId);
        if (found) {
          data = found as OrderData;
          isLocal = true;
        }
      }

      if (!data) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      const orderUserId = data.userId || data.uid;
      if (orderUserId && orderUserId !== callerUid) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order" });
      }

      const updatedFields = {
        invoiceEmailRequested: true,
        invoiceEmailRequestedAt: new Date().toISOString(),
        invoiceEmailHandled: false,
      };

      if (!isLocal) {
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).update(updatedFields));
        } catch (dbErr) {
          console.warn("Firestore update in order poke failed, syncing locally:", dbErr);
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

      sendNotificationToTopic(
        "new_orders",
        "🔔 Invoice Email Requested",
        `Customer ${data.name || data.to || 'Customer'} requested invoice email delivery for ${data.invoiceNo || orderId}`
      ).catch(err => {
        console.error("Background push notification error for poke request:", err);
      });

      return res.json({ success: true, message: "Invoice email delivery request sent to restaurant" });
    } catch (err) {
      console.error("Order poke endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Archive Order
  app.post("/api/orders/archive", orderSubmissionLimiter, async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ success: false, error: "Missing orderId" });

      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid session token" });
      }

      let data: OrderData | null = null;
      let isLocal = false;
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) data = docSnap.data() as OrderData;
      } catch (dbErr) {
        console.warn("Firestore fetch in archive failed, trying local backup:", dbErr);
      }
      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === orderId);
        if (found) { data = found as OrderData; isLocal = true; }
      }
      if (!data) return res.status(404).json({ success: false, error: "Order not found" });

      const orderUserId = data.userId || data.uid;
      if (orderUserId !== callerUid) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order" });
      }
      if (data.status !== "billed") {
        return res.status(400).json({ success: false, error: "Only billed orders can be archived" });
      }

      const archivedAt = new Date().toISOString();
      if (!isLocal) {
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb
            .collection("orders_archive").doc(orderId)
            .set({ ...data, archivedAt, originalId: orderId }));
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).update({
            status: "archived", archivedAt,
          }));
        } catch (dbErr) {
          console.warn("Firestore archive failed, marking locally only:", dbErr);
          isLocal = true;
        }
      }
      if (isLocal) {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex], status: "archived", archivedAt,
          };
          saveLocalOrders(localOrders);
        }
      }
      return res.json({ success: true, message: "Order archived successfully" });
    } catch (err) {
      console.error("Order archive endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Legacy delete alias
  app.post("/api/orders/delete", orderSubmissionLimiter, async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ success: false, error: "Missing orderId" });
      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid session token" });
      }
      const adminDb = getFirestore();
      let data: OrderData | null = null;
      let isLocal = false;
      try {
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) data = docSnap.data() as OrderData;
      } catch { isLocal = true; }
      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === orderId);
        if (found) { data = found as OrderData; isLocal = true; }
      }
      if (!data) return res.status(404).json({ success: false, error: "Order not found" });
      const orderUserId = data.userId || data.uid;
      if (orderUserId !== callerUid) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order" });
      }
      if (data.status !== "billed") {
        return res.status(400).json({ success: false, error: "Only billed orders can be archived" });
      }
      const archivedAt = new Date().toISOString();
      if (!isLocal) {
        try {
          await runWithRetry(() => adminDb.collection("orders_archive").doc(orderId).set({ ...data, archivedAt, originalId: orderId }));
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).update({ status: "archived", archivedAt }));
        } catch { isLocal = true; }
      }
      if (isLocal) {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = { ...localOrders[localIndex], status: "archived", archivedAt };
          saveLocalOrders(localOrders);
        }
      }
      return res.json({ success: true, message: "Order archived (legacy delete alias)" });
    } catch (err) {
      console.error("Order archive (legacy) endpoint error:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Invoice Billing & Delivery
  app.post("/api/submissions/bill", adminOpsLimiter, verifyAdminToken, async (req, res) => {
    try {
      const { submissionId, totalAmount, pdfBase64, fileName, collectionName = 'submissions' } = req.body;

      if (!submissionId) {
        return res.status(400).json({ error: "Missing submissionId" });
      }

      const ALLOWED_BILL_COLLECTIONS = new Set(["submissions", "orders"]);
      if (!ALLOWED_BILL_COLLECTIONS.has(collectionName)) {
        return res.status(400).json({ error: "Invalid collectionName" });
      }

      if (totalAmount === undefined || totalAmount === null || isNaN(Number(totalAmount))) {
        return res.status(400).json({ error: "Invalid or missing totalAmount" });
      }

      const parsedAmount = Number(totalAmount);

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

      if (collectionName === 'orders') {
        syncGoogleCalendarEvent(submissionId).catch(err => {
          console.error("Background Google Calendar event sync error during billing:", err);
        });
      }

      const rawEmail = data.customerEmail ?? data.email;
      const customerEmail = typeof rawEmail === "string" ? rawEmail.trim() : "";
      const customerName = (data.customerName as string) || (data.name as string) || "Valued Customer";
      const invoiceNo = (data.invoiceNo as string) || `INV-${submissionId.substring(0, 6).toUpperCase()}`;
      const items = data.items || [];
      const lang = (data.lang as string) || 'en';

      if (!customerEmail) {
        return res.json({ 
          success: true, 
          message: "Document successfully updated to 'billed', but no customer email was found in the document to send an invoice." 
        });
      }

      if (!smtpUser || !smtpPass) {
        console.warn("SMTP credentials not configured. Please configure SMTP_USER and SMTP_PASS.");
        return res.json({
          success: true,
          message: "Document successfully updated to 'billed', but email could not be sent because SMTP is not configured on the server."
        });
      }

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

      const emailSubject = `Invois Rasmi ${invoiceNo} - Restoran Wawasan Putrajaya`;

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
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; color: #2d3748; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
            .header { background-color: #1a202c; padding: 30px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.05em; }
            .header p { margin: 5px 0 0 0; color: #a0aec0; font-size: 14px; }
            .content { padding: 30px; }
            .greeting { font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
            .meta-box { background-color: #f8fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 15px; margin-bottom: 25px; font-size: 14px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .meta-row:last-child { margin-bottom: 0; }
            .meta-label { color: #718096; font-weight: 500; }
            .meta-value { color: #2d3748; font-weight: 600; text-align: right; }
            .total-box { background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px; margin-bottom: 25px; }
            .total-label { font-size: 14px; color: #2b6cb0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 5px; }
            .total-amount { font-size: 32px; font-weight: 800; color: #2b6cb0; }
            .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; }
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

      const emailAttachments = [];
      if (pdfBase64) {
        emailAttachments.push({
          filename: fileName || `Invois_${invoiceNo}.pdf`,
          content: pdfBase64,
          encoding: 'base64'
        });
      }

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${senderEmail}>`,
        to: customerEmail,
        subject: emailSubject,
        html: htmlBody,
        attachments: emailAttachments.length > 0 ? emailAttachments : undefined
      });

      await logAuditEvent({
        action: "invoice_email_sent",
        performedBy: "admin",
        targetType: "invoice",
        targetId: submissionId,
        details: `Sent official invoice email to ${customerEmail} (Invoice: ${invoiceNo}, Total: RM ${parsedAmount.toFixed(2)})`,
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

  // Public send invoice endpoint
  app.post("/api/send-invoice", publicEmailLimiter, async (req, res) => {
    try {
      const { email, name, invoiceNo, pdfBase64, isFinal, lang, orderDetails, orderId } = req.body;

      if (!email || !pdfBase64) {
        return res.status(400).json({ error: "Missing required fields (email, pdfBase64)" });
      }

      const emailStr = typeof email === "string" ? email.trim() : "";
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_RE.test(emailStr) || emailStr.length > 254) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      if (typeof pdfBase64 !== "string" || pdfBase64.length > 1_400_000) {
        return res.status(400).json({ error: "Invalid or oversized pdfBase64 payload" });
      }

      if (!smtpUser || !smtpPass) {
        console.warn("SMTP credentials not configured. Skipping email send.");
        return res.status(500).json({ error: "SMTP credentials not configured" });
      }

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      const isBM = lang === 'bm';
      const emailSubject = isBM 
        ? `${isFinal ? 'Invois' : 'Sebutharga'} Rasmi - ${invoiceNo || 'RW'} (Restoran Wawasan)`
        : `Official ${isFinal ? 'Invoice' : 'Quotation'} - ${invoiceNo || 'RW'} (Restoran Wawasan)`;

      const emailBody = isBM
        ? `Salam ${name || 'Pelanggan'},\n\nTerima kasih kerana memilih Restoran Wawasan Pak Usop.\nSila dapati lampiran PDF ${isFinal ? 'invois' : 'sebutharga'} anda.\n\nSekiranya ada sebarang pertanyaan, sila hubungi kami.\n\nTerima kasih,\nRestoran Wawasan Pak Usop`
        : `Hello ${name || 'Customer'},\n\nThank you for choosing Restoran Wawasan Pak Usop.\nPlease find attached the PDF for your official ${isFinal ? 'invoice' : 'quotation'}.\n\nIf you have any questions, feel free to reply to this email.\n\nBest regards,\nRestoran Wawasan Pak Usop`;

      let htmlBody: string | undefined = undefined;
      if (orderDetails) {
        const details = orderDetails;
        const paxText = details.pax ? `${details.pax} Pax` : '';
        const dateText = details.date || '';
        const locationText = details.location || '';
        const itemsList = Array.isArray(details.items) ? details.items : [];

        let itemsHtml = '';
        if (itemsList.length > 0) {
          itemsHtml = `<div style="margin: 15px 0; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <strong style="color: #1e293b;">${isBM ? 'Ringkasan Pesanan:' : 'Order Summary:'}</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #475569;">`;
          itemsList.forEach((item: { name?: string; title?: string; qty?: number; quantity?: number; price?: number | string }) => {
            const itemName = item.name || item.title || 'Item';
            const itemQty = item.qty || item.quantity || 1;
            itemsHtml += `<li>${escapeHtml(itemName)} x ${itemQty}</li>`;
          });
          itemsHtml += `</ul></div>`;
        }

        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fbbf24; letter-spacing: 0.05em;">RESTORAN WAWASAN PAK USOP</h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase;">${isBM ? (isFinal ? 'Invois Rasmi' : 'Sebutharga Rasmi') : (isFinal ? 'Official Invoice' : 'Official Quotation')}</p>
            </div>
            <div style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6;">
              <p style="margin-top: 0;">${isBM ? 'Salam' : 'Hello'} <strong>${escapeHtml(name || 'Pelanggan')}</strong>,</p>
              <p>${isBM ? 'Terima kasih kerana memilih Restoran Wawasan Pak Usop. Sila dapati lampiran PDF bagi' : 'Thank you for choosing Restoran Wawasan Pak Usop. Please find attached the PDF for your'} <strong>${isBM ? (isFinal ? 'invois' : 'sebutharga') : (isFinal ? 'invoice' : 'quotation')} (${escapeHtml(invoiceNo || 'RW')})</strong>.</p>
              
              ${(paxText || dateText || locationText) ? `
                <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
                  ${dateText ? `<div>📅 <strong>${isBM ? 'Tarikh' : 'Date'}:</strong> ${escapeHtml(dateText)}</div>` : ''}
                  ${paxText ? `<div style="margin-top: 4px;">👥 <strong>${isBM ? 'Jumlah Pax' : 'Pax'}:</strong> ${escapeHtml(paxText)}</div>` : ''}
                  ${locationText ? `<div style="margin-top: 4px;">📍 <strong>${isBM ? 'Lokasi' : 'Location'}:</strong> ${escapeHtml(locationText)}</div>` : ''}
                </div>
              ` : ''}

              ${itemsHtml}

              <p style="margin-bottom: 0;">${isBM ? 'Sekiranya ada sebarang pertanyaan, sila balas e-mel ini.' : 'If you have any questions, feel free to reply directly to this email.'}</p>
            </div>
            <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              Restoran Wawasan Pak Usop &bull; Putrajaya &bull; Contact: 019-382 7212
            </div>
          </div>
        `;
      }

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${senderEmail}>`,
        to: emailStr,
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

      console.log(`Invoice email sent successfully to ${emailStr}`);

      if (orderId && isFinal) {
        const billedAt = new Date().toISOString();
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).update({
            status: 'billed',
            billedAt,
          }));
        } catch (dbErr) {
          console.warn("Could not update order status in Firestore during send-invoice:", dbErr);
        }
        const localOrders = getLocalOrders();
        const localIdx = localOrders.findIndex(o => o.id === orderId);
        if (localIdx !== -1) {
          localOrders[localIdx] = { ...localOrders[localIdx], status: 'billed', billedAt };
          saveLocalOrders(localOrders);
        }
      }

      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Admin Revoke JTI
  app.post("/api/admin/revoke", adminOpsLimiter, verifyAdminToken, (req: express.Request, res: express.Response) => {
    const { jti } = (req.body || {}) as { jti?: string };
    if (!jti) return res.status(400).json({ error: "Missing jti" });
    revokeJti(jti);
    res.json({ success: true });
  });

  // Admin Login
  app.post("/api/admin/login", adminLoginLimiter, async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!password || !adminPassword) {
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid password" });
      }

      let passwordMatches = false;
      const looksLikeBcryptHash = /^\$2[aby]\$\d{2}\$/.test(adminPassword);
      if (looksLikeBcryptHash) {
        passwordMatches = await bcrypt.compare(password, adminPassword);
      } else {
        passwordMatches = (password === adminPassword);
      }

      if (!passwordMatches) {
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid password" });
      }

      const jti = crypto.randomUUID();
      const token = jwt.sign(
        { role: "admin", sub: "admin:wawasan", admin: true, jti },
        effectiveJwtSecret,
        { expiresIn: "1h", algorithm: "HS256" }
      );

      let firebaseCustomToken: string | null = null;
      try {
        firebaseCustomToken = await getAuth(getAdminApp()).createCustomToken(
          "admin-wawasan",
          { admin: true }
        );
      } catch (claimErr) {
        console.warn(
          "[Admin Auth] Failed to mint Firebase custom token (admin JWT still issued):",
          claimErr instanceof Error ? claimErr.message : claimErr
        );
      }

      return res.json({
        success: true,
        token,
        jti,
        expiresInSeconds: 3600,
        firebaseCustomToken,
      });
    } catch (err) {
      console.error("Admin login API error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Admin Topic Subscription
  app.post("/api/admin/subscribe-to-topic", adminOpsLimiter, verifyAdminToken, async (req, res) => {
    try {
      const { token, topic } = req.body;
      if (!token || !topic) {
        return res.status(400).json({ error: "Missing token or topic" });
      }
      
      const appInstance = getAdminApp();
      await getMessaging(appInstance).subscribeToTopic(token, topic);
      console.log(`Successfully subscribed token to topic ${topic}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Error subscribing to topic:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Admin Orders Operation
  app.post("/api/admin/orders", adminOpsLimiter, verifyAdminToken, async (req, res) => {
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

        const localOrders = getLocalOrders();
        localOrders.forEach((localOrder) => {
          if (!orders.some(o => o.id === localOrder.id)) {
            orders.push(localOrder);
          }
        });

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

      if (action === "update" || action === "generate_invoice") {
        if (!orderId || !data) {
          return res.status(400).json({ error: "Missing orderId or data for update" });
        }

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

        // If transitioning to approved or billed and no invoice number exists yet, generate one
        const targetStatus = (data.status as string | undefined)?.toLowerCase();
        if ((targetStatus === "approved" || targetStatus === "billed" || action === "generate_invoice") && !previousOrder?.invoiceNo && !data.invoiceNo) {
          const newInvoiceNo = await generateSequentialInvoiceNo();
          data.invoiceNo = newInvoiceNo;
          data.approvedAt = data.approvedAt || new Date().toISOString();
          if (!data.status) {
            data.status = "approved";
          }
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

        syncGoogleCalendarEvent(orderId).catch(err => {
          console.error("Background Google Calendar event sync error during admin update:", err);
        });

        const newStatus = (data as Record<string, unknown>)?.status as string | undefined;
        if (newStatus && newStatus !== previousStatus) {
          const mergedOrder = {
            ...(previousOrder || {}),
            ...(data as Record<string, unknown>),
            id: orderId,
          } as Partial<OrderData> & { id?: string; uid?: string; email?: string; name?: string; invoiceNo?: string; lang?: string; rejectionReason?: string };
          console.log(`[StatusNotify] Order ${orderId} status changed: "${previousStatus}" -> "${newStatus}". Notifying customer.`);
          notifyCustomerOfStatusChange(transporter, mergedOrder, newStatus, senderEmail, smtpUser, smtpPass).catch(err => {
            console.error("[StatusNotify] Background status notification error:", err);
          });

          const normStatus = newStatus.toLowerCase();
          let auditAction = `order_status_${normStatus}`;
          if (normStatus === "approved") auditAction = "order_approved";
          if (normStatus === "rejected") auditAction = "order_rejected";
          if (normStatus === "cancelled") auditAction = "order_cancelled";

          logAuditEvent({
            action: auditAction,
            performedBy: "admin",
            targetType: "order",
            targetId: orderId,
            details: `Status changed from '${previousStatus}' to '${newStatus}'${mergedOrder.rejectionReason ? ` (Reason: ${mergedOrder.rejectionReason})` : ''}${mergedOrder.invoiceNo ? ` (Invoice: ${mergedOrder.invoiceNo})` : ''}`,
          }).catch(err => console.error("Audit log error:", err));
        }

        return res.json({ success: true });
      }

      if (action === "delete") {
        if (!orderId) {
          return res.status(400).json({ error: "Missing orderId for delete" });
        }

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
          previousOrder = localOrdersBefore.find(o => o.id === orderId) as OrderData | undefined;
        }

        const isCancellationApproval = previousOrder?.status === "cancel_requested";
        
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).delete());
        } catch (dbErr) {
          console.warn("Firestore delete failed after retries, relying on local backup:", dbErr);
        }

        const localOrders = getLocalOrders();
        const filtered = localOrders.filter(o => o.id !== orderId);
        if (filtered.length !== localOrders.length) {
          saveLocalOrders(filtered);
        }

        if (isCancellationApproval && previousOrder) {
          const mergedOrder = {
            ...previousOrder,
            id: orderId,
            status: 'cancelled'
          };
          console.log(`[StatusNotify] Order ${orderId} cancellation approved by admin. Notifying customer.`);
          notifyCustomerOfStatusChange(transporter, mergedOrder, "cancelled", senderEmail, smtpUser, smtpPass).catch(err => {
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

  // Admin Branding Settings
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

  // Vite middleware for development
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
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
