import nodemailer from "nodemailer";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp, getFirestore, type OrderData } from "./firebaseAdmin.js";

export function createBrevoTransporter(): nodemailer.Transporter {
  const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT) || 2525;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
    family: 4,
  } as any);
}

export const ENABLE_ORDER_STATUS_NOTIFICATIONS =
  (process.env.ENABLE_ORDER_STATUS_NOTIFICATIONS || "true") !== "false";

export type NotifyLang = "en" | "bm";

export interface StatusCopy {
  subject: string;
  heading: string;
  message: string;
  pushTitle: string;
  pushBody: string;
}

export function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getStatusCopy(
  status: string,
  name: string,
  invoiceNo: string,
  lang: NotifyLang,
  rejectionReason?: string
): StatusCopy {
  const s = (status || "").toLowerCase();
  const who = name || (lang === "bm" ? "Pelanggan" : "Customer");
  const invoiceSuffix = invoiceNo ? (lang === "bm" ? ` (No. Invois: ${invoiceNo})` : ` (Invoice No: ${invoiceNo})`) : "";
  const reasonNote = rejectionReason ? (lang === "bm" ? ` Sebab penolakan: ${rejectionReason}.` : ` Reason for rejection: ${rejectionReason}.`) : "";

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
      message: `Great news ${who}! Your catering order${invoiceSuffix} has been approved and pricing has been set. We look forward to serving you.`,
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
      message: `Hi ${who}, unfortunately we were unable to confirm your catering order${invoiceSuffix} at this time.${reasonNote} Please contact us if you'd like to discuss alternatives.`,
      pushTitle: "Order update",
      pushBody: `There's an update on your order${invoiceSuffix}.`,
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
    in_transit: {
      subject: `Your catering order is on the way! 🚚${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Order In Transit 🚚",
      message: `Hi ${who}, exciting news! Your catering order${invoiceSuffix} is cooked, loaded, and currently on the way to your delivery location. Get ready to feast!`,
      pushTitle: "Order is on the way! 🚚",
      pushBody: `Your order${invoiceSuffix} is in transit.`,
    },
    delivered: {
      subject: `Your order has been delivered! Enjoy! 🍽️${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Order Delivered 🎉",
      message: `Hi ${who}, your catering order${invoiceSuffix} has been successfully delivered and set up. We hope you and your guests enjoy the feast! Thank you for choosing Restoran Wawasan.`,
      pushTitle: "Order delivered! 🎉",
      pushBody: `Your order${invoiceSuffix} has been delivered. Enjoy!`,
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
      message: `Berita baik ${who}! Tempahan katering anda${invoiceSuffix} telah diluluskan dan harga telah ditetapkan. Kami menantikan peluang untuk berkhidmat kepada anda.`,
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
      message: `Salam ${who}, malangnya kami tidak dapat mengesahkan tempahan katering anda${invoiceSuffix} pada masa ini.${reasonNote} Sila hubungi kami jika anda ingin membincangkan pilihan lain.`,
      pushTitle: "Kemas kini tempahan",
      pushBody: `Terdapat kemas kini pada tempahan anda${invoiceSuffix}.`,
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
    in_transit: {
      subject: `Tempahan katering anda dalam perjalanan! 🚚${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Pesanan Dalam Perjalanan 🚚",
      message: `Salam ${who}, berita gembira! Tempahan katering anda${invoiceSuffix} telah dimasak, dimuatkan, dan kini dalam perjalanan ke lokasi penghantaran anda. Sedia untuk dinikmati!`,
      pushTitle: "Pesanan dalam perjalanan! 🚚",
      pushBody: `Pesanan anda${invoiceSuffix} sedang dalam perjalanan.`,
    },
    delivered: {
      subject: `Tempahan anda telah dihantar! Selamat menjamu selera! 🍽️${invoiceNo ? ` — ${invoiceNo}` : ""}`,
      heading: "Pesanan Dihantar 🎉",
      message: `Salam ${who}, tempahan katering anda${invoiceSuffix} telah berjaya dihantar dan disediakan. Kami berharap anda dan para tetamu menikmati hidangan ini! Terima kasih kerana memilih Restoran Wawasan.`,
      pushTitle: "Pesanan dihantar! 🎉",
      pushBody: `Pesanan anda${invoiceSuffix} telah selamat dihantar. Selamat menjamu selera!`,
    },
  };

  const table = lang === "bm" ? bm : en;
  if (table[s]) return table[s];

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

export function buildStatusEmailHtml(copy: StatusCopy, lang: NotifyLang): string {
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

export async function sendOrderStatusEmail(
  transporter: nodemailer.Transporter,
  order: Partial<OrderData> & { email?: string; name?: string; invoiceNo?: string; lang?: string; rejectionReason?: string },
  newStatus: string,
  senderEmail: string,
  smtpUser?: string,
  smtpPass?: string
): Promise<boolean> {
  const to = order.email;
  if (!to) {
    console.warn("[StatusNotify] No customer email on order; skipping status email.");
    return false;
  }
  if (!smtpUser || !smtpPass) {
    console.warn("[StatusNotify] SMTP not configured (SMTP_USER/SMTP_PASS); skipping status email.");
    return false;
  }

  const lang: NotifyLang = order.lang === "bm" ? "bm" : "en";
  const copy = getStatusCopy(newStatus, order.name || "", order.invoiceNo || "", lang, order.rejectionReason);

  await transporter.sendMail({
    from: `"Restoran Wawasan" <${senderEmail}>`,
    to,
    subject: copy.subject,
    text: `${copy.heading}\n\n${copy.message}`,
    html: buildStatusEmailHtml(copy, lang),
  });
  console.log(`[StatusNotify] Status email (${newStatus}) sent to ${to}.`);
  return true;
}

export async function resolveCustomerFcmToken(order: Partial<OrderData> & { uid?: string; userId?: string | null; email?: string }): Promise<string | null> {
  try {
    const db = getFirestore();
    const customerUid = order.userId || order.uid;
    if (customerUid) {
      const snap = await db.collection("users").doc(customerUid).get();
      const token = snap.exists ? (snap.data()?.fcmToken as string | undefined) : undefined;
      if (token) return token;
    }
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

export async function sendOrderStatusPush(
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
      // F-CHAN (audit 2026-08-11): must match the channel id created
      // client-side in useNativeNotifications.ts (PushNotifications.createChannel).
      // Without this, Android silently routes the notification to the
      // manifest default channel (com.google.firebase.messaging.default_notification_channel_id)
      // instead of the dedicated order_status channel, meaning the customer
      // has no way to control sound/vibration/importance for order updates
      // separately from any other notification type the app may add later.
      android: {
        notification: {
          channelId: 'order_status',
        },
      },
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

export async function notifyCustomerOfStatusChange(
  transporter: nodemailer.Transporter,
  order: Partial<OrderData> & { id?: string; uid?: string; email?: string; name?: string; invoiceNo?: string; lang?: string },
  newStatus: string,
  senderEmail: string,
  smtpUser?: string,
  smtpPass?: string
): Promise<void> {
  if (!ENABLE_ORDER_STATUS_NOTIFICATIONS) {
    console.log("[StatusNotify] Disabled via ENABLE_ORDER_STATUS_NOTIFICATIONS=false; skipping.");
    return;
  }
  await Promise.allSettled([
    sendOrderStatusEmail(transporter, order, newStatus, senderEmail, smtpUser, smtpPass).catch((err) =>
      console.error("[StatusNotify] Email send failed:", err)
    ),
    sendOrderStatusPush(order, newStatus).catch((err) =>
      console.error("[StatusNotify] Push send failed:", err)
    ),
  ]);
}
