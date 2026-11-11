import { Router, type Request, type Response } from 'express';
import { verifyAdminToken, verifyAdminJwtWithRevocation } from '../adminAuth.js';
import { invoiceQueue } from '../services/invoiceQueue.js';
import {
  createInvoiceEmailPreview,
  readInvoicePreviewPdf,
  cleanExpiredInvoicePreviews,
} from '../services/invoiceEmailPreviews.js';
import type { InvoiceBatch } from '../../src/lib/invoiceBatch.js';
import { whatsappBusinessService } from '../services/whatsappBusinessService.js';
import { getFirestore, verifyFirebaseIdToken } from '../firebaseAdmin.js';
import {
  generateServerInvoicePdf,
  generateServerConsolidatedInvoicePdf,
  generateSavedInvoicePdf,
} from '../services/serverPdfService.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

import {
  consolidatedOrderIds,
  commitConsolidatedInvoice,
  reserveConsolidatedNumber,
  readInvoiceBatch,
  ConsolidatedInvoiceError,
} from '../services/consolidatedInvoices.js';

const router = Router();

const actorId = (req: Request): string =>
  (req as Request & { user?: { uid?: string } }).user?.uid || 'admin';
function invoiceError(res: Response, error: unknown) {
  console.error('[Invoice]', error instanceof Error ? error.message : error);
  return res.status(error instanceof ConsolidatedInvoiceError ? error.status : 503).json({
    success: false,
    error:
      error instanceof ConsolidatedInvoiceError
        ? error.message
        : 'Unable to prepare invoice. Please retry.',
  });
}

export interface InvoiceCallerAuth {
  isAdmin: boolean;
  uid: string | null;
  email: string | null;
}

export async function getInvoiceCallerAuth(req: Request): Promise<InvoiceCallerAuth | null> {
  const authHeader = req.headers.authorization;
  // Tokens must be carried in the Authorization header, not the URL.
  // Query-string credentials can leak through logs, copied links and browser history.
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return null;
  }

  // 1. Check if token is a valid server-signed Admin JWT
  const jwtPayload = await verifyAdminJwtWithRevocation(token);
  if (jwtPayload && jwtPayload.admin === true) {
    return {
      isAdmin: true,
      uid: jwtPayload.uid || 'admin',
      email: jwtPayload.email || null,
    };
  }

  // 2. Check Firebase ID Token (for Admin or Customer)
  const decoded = await verifyFirebaseIdToken(token);
  if (decoded) {
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    // An email claim is not proof of ownership until Firebase verifies it.
    const userEmail = decoded.email_verified === true ? decoded.email?.toLowerCase() || null : null;
    const isAdmin =
      decoded.admin === true || (userEmail !== null && adminEmails.includes(userEmail));

    return {
      isAdmin,
      uid: decoded.uid || null,
      email: userEmail,
    };
  }

  return null;
}

export function isOrderOwnedByCaller(order: Record<string, any>, auth: InvoiceCallerAuth): boolean {
  if (auth.isAdmin) return true;

  const ownerUid = order.userId || order.uid || null;
  const orderEmail = (order.email || order.customerEmail || '').toLowerCase().trim();

  if (ownerUid) return Boolean(auth.uid && auth.uid === ownerUid);
  const matchesEmail = Boolean(auth.email && orderEmail && auth.email === orderEmail);

  return matchesEmail;
}

// Rate limiter for order forwarding
const forwardOrderLimiter = createDistributedRateLimiter({
  prefix: 'forward_order',
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

// WhatsApp API Endpoint for Admin Invoice Sharing
router.post('/send-invoice-whatsapp', verifyAdminToken, async (req, res) => {
  const {
    recipientPhone,
    customerName,
    invoiceNo,
    eventDate,
    pax,
    totalAmount,
    pdfDownloadUrl,
    lang,
  } = req.body || {};

  if (!recipientPhone || !customerName || !invoiceNo) {
    return res.status(400).json({
      success: false,
      error: 'recipientPhone, customerName, and invoiceNo are required fields.',
    });
  }

  try {
    const result = await whatsappBusinessService.shareInvoiceToCustomer({
      recipientPhone,
      customerName,
      invoiceNo,
      eventDate: eventDate || 'Akan Dimaklumkan',
      pax: pax || '-',
      totalAmount: Number(totalAmount) || 0,
      pdfDownloadUrl,
      lang: lang === 'en' ? 'en' : 'bm',
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: String(err?.message || err) });
  }
});

// WhatsApp API Endpoint for Order Forwarding
router.post('/forward-order-whatsapp', forwardOrderLimiter, async (req, res) => {
  const orderPayload = req.body || {};

  if (!orderPayload.customerName || !orderPayload.contactNumber) {
    return res.status(400).json({
      success: false,
      error: 'customerName and contactNumber are required to forward order.',
    });
  }

  try {
    const result = await whatsappBusinessService.forwardOrderToAdmin({
      orderId: orderPayload.orderId || orderPayload.id,
      customerName: orderPayload.customerName || orderPayload.name,
      contactNumber: orderPayload.contactNumber || orderPayload.contact || orderPayload.phone,
      eventDate: orderPayload.eventDate || orderPayload.date || 'Akan Dimaklumkan',
      eventTime: orderPayload.eventTime || orderPayload.time || '12:00 PM',
      pax: orderPayload.pax || orderPayload.guests || orderPayload.quantity || '-',
      mealType: orderPayload.mealType || orderPayload.meal || 'Katering',
      totalAmount: Number(orderPayload.totalAmount) || 0,
      selectedDishes: orderPayload.selectedDishes || orderPayload.dishes || [],
      deliveryAddress: orderPayload.deliveryAddress || orderPayload.address,
      specialNotes: orderPayload.specialNotes || orderPayload.notes,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[invoiceRoutes] /forward-order-whatsapp:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/admin/invoice-email-preview', verifyAdminToken, async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const preview = await createInvoiceEmailPreview(req.body || {}, actorId(req));
    void cleanExpiredInvoicePreviews().catch((error) =>
      console.error('[Invoice preview cleanup]', error)
    );
    return res.json({
      success: true,
      preview: {
        id: preview.id,
        email: preview.email,
        subject: preview.subject,
        text: preview.text,
        html: preview.html,
        filename: preview.filename,
        invoiceNumbers: preview.invoiceNumbers,
        expiresAt: preview.expiresAt,
      },
    });
  } catch (error) {
    return invoiceError(res, error);
  }
});
router.get('/admin/invoice-email-preview/:id/pdf', verifyAdminToken, async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    res.type('application/pdf');
    return res.send(await readInvoicePreviewPdf(req.params.id, actorId(req)));
  } catch (error) {
    return invoiceError(res, error);
  }
});
router.post('/send-invoice', verifyAdminToken, async (req, res) => {
  try {
    const id = typeof req.body?.previewId === 'string' ? req.body.previewId : '';
    if (!id)
      throw new ConsolidatedInvoiceError('Prepare and review the email and PDF before sending.');
    await readInvoicePreviewPdf(id, actorId(req));
    const db = getFirestore();
    const result = await db.runTransaction(async (tx) => {
      const ref = db.collection('invoice_email_previews').doc(id),
        preview = (await tx.get(ref)).data();
      if (!preview || preview.actor !== actorId(req))
        throw new ConsolidatedInvoiceError('Preview not found.', 404);
      if (preview.expiresAt < Date.now())
        throw new ConsolidatedInvoiceError('Preview expired. Prepare a fresh preview.', 410);
      if (preview.status !== 'draft') return { status: preview.status, jobId: preview.jobId };
      const jobId = await invoiceQueue.service.enqueueInTransaction(tx, {
        orderId: preview.orderId || id,
        emailPreviewId: id,
        orderForPdf: {},
        invoiceNo: preview.invoiceNumbers[0],
        recipientEmail: preview.email,
        totalAmount: preview.total,
        companyName: preview.company,
        lang: preview.lang,
        idempotencyKey: `preview:${id}`,
      });
      tx.update(ref, { status: 'queued', jobId });
      return { status: 'queued', jobId };
    });
    return res.status(202).json({ success: true, ...result });
  } catch (error) {
    return invoiceError(res, error);
  }
});

// GET Endpoint for Server-Generated Single Invoice PDF
router.get('/invoice/:orderId/pdf', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'orderId parameter is required' });
    }

    const callerAuth = await getInvoiceCallerAuth(req);
    if (!callerAuth) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to access invoice PDF.',
      });
    }

    const db = getFirestore();
    const docSnap = await db.collection('orders').doc(orderId).get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order document not found' });
    }

    const orderData = { id: docSnap.id, ...docSnap.data() } as Record<string, any>;

    if (!isOrderOwnedByCaller(orderData, callerAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to access this invoice.',
      });
    }

    if (req.query.lang && (req.query.lang === 'en' || req.query.lang === 'bm')) {
      orderData.lang = req.query.lang;
    }
    const isFinal =
      req.query.final === 'true' ||
      (orderData.status !== 'pending' &&
        orderData.status !== 'rejected' &&
        orderData.status !== 'cancelled');
    let pdfBuffer: Buffer;
    if (orderData.invoiceBatchNo && isFinal) {
      const saved = (await readInvoiceBatch(orderData.invoiceBatchNo)) as InvoiceBatch;
      // Return the original complete PDF: its column widths and page grouping remain fixed.
      const snaps = await db.getAll(
        ...saved.orders.map((order) => db.collection('orders').doc(order.id!))
      );
      if (snaps.some((snap) => !snap.exists || !isOrderOwnedByCaller(snap.data()!, callerAuth)))
        return res.status(403).json({ error: 'Forbidden invoice PDF.' });
      pdfBuffer = await generateSavedInvoicePdf(saved);
    } else pdfBuffer = await generateServerInvoicePdf(orderData, isFinal);

    const invoiceNo =
      orderData.invoiceBatchNo ||
      orderData.invoiceNo ||
      `RW_${orderId.substring(0, 5).toUpperCase()}`;
    const filename = `${isFinal ? 'Invoice' : 'Quotation'}_${invoiceNo}.pdf`;

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[Invoice API] Failed to render server invoice PDF:', err);
    console.error('[invoiceRoutes] /invoice/:orderId/pdf:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST Endpoint for Server-Generated Consolidated Invoice PDF (Admin Only)
router.get('/admin/next-invoice-number', verifyAdminToken, async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const nextInvoiceNo = await reserveConsolidatedNumber((req as any).user?.uid || 'admin');
    return res.json({ success: true, nextInvoiceNo });
  } catch (error) {
    console.error('[Consolidated invoice] Reserve failed:', error);
    return res
      .status(503)
      .json({ success: false, error: 'Unable to reserve invoice number. Please retry.' });
  }
});

router.post('/admin/commit-consolidated-invoice', verifyAdminToken, async (req, res) => {
  try {
    const saved = await commitConsolidatedInvoice(
      req.body?.orderIds,
      req.body?.invoiceNo,
      actorId(req),
      req.body || {}
    );
    return res.json({
      success: true,
      invoiceNo: saved.invoiceNo,
      pages: saved.pages,
      recipient: saved.recipient,
    });
  } catch (error) {
    console.error('[Consolidated invoice] Commit failed:', error);
    return res.status(error instanceof ConsolidatedInvoiceError ? error.status : 503).json({
      success: false,
      error:
        error instanceof ConsolidatedInvoiceError
          ? error.message
          : 'Unable to save consolidated invoice.',
    });
  }
});

router.post('/admin/consolidated-invoice/pdf', verifyAdminToken, async (req, res) => {
  try {
    const { orderIds, invoiceNo, includeNotes, lang } = req.body || {};
    // Also protects older clients that call the PDF endpoint directly.
    const saved = orderIds
      ? await commitConsolidatedInvoice(orderIds, invoiceNo, actorId(req), req.body || {})
      : await readInvoiceBatch(invoiceNo);
    const pdfBuffer =
      [2, 3].includes(saved.layoutVersion)
        ? await generateSavedInvoicePdf(saved as InvoiceBatch)
        : await generateServerConsolidatedInvoicePdf(
            saved.orders,
            saved.invoiceNo,
            Boolean(includeNotes),
            lang === 'en' ? 'en' : 'bm'
          );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${saved.invoiceNo}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Consolidated invoice] PDF failed:', error);
    return res.status(error instanceof ConsolidatedInvoiceError ? error.status : 503).json({
      success: false,
      error:
        error instanceof ConsolidatedInvoiceError
          ? error.message
          : 'Unable to generate consolidated PDF.',
    });
  }
});

router.post('/invoice/combined/pdf', async (req: Request, res: Response) => {
  try {
    const { orderIds, includeNotes, lang } = req.body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of orderIds is required' });
    }

    const callerAuth = await getInvoiceCallerAuth(req);
    if (!callerAuth) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to generate combined invoice PDF.',
      });
    }

    const db = getFirestore();

    // Single batched round-trip via db.getAll() instead of one sequential
    // .get() per orderId.
    const validIds = consolidatedOrderIds(orderIds);
    const refs = validIds.map((id: string) => db.collection('orders').doc(id));
    const snaps = refs.length > 0 ? await db.getAll(...refs) : [];
    const orderDocs: Record<string, any>[] = snaps
      .filter((snap) => snap.exists)
      .map((snap) => ({ id: snap.id, ...snap.data() }));

    if (orderDocs.length !== validIds.length) {
      return res.status(404).json({ success: false, error: 'No matching order documents found' });
    }

    // Ownership check: Caller must be admin or own ALL requested orders
    const hasUnauthorizedOrder = orderDocs.some(
      (order) => !isOrderOwnedByCaller(order, callerAuth)
    );
    if (hasUnauthorizedOrder) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: One or more requested orders do not belong to your account.',
      });
    }

    const batchNo = orderDocs[0].invoiceBatchNo;
    if (!batchNo || orderDocs.some((order) => order.invoiceBatchNo !== batchNo))
      return res.status(409).json({
        error:
          'Sila hubungi restoran untuk invois gabungan rasmi / Contact the restaurant to issue a combined invoice.',
      });
    const saved = await readInvoiceBatch(batchNo);
    const allSnaps = await db.getAll(
      ...saved.orderIds.map((id: string) => db.collection('orders').doc(id))
    );
    if (allSnaps.some((snap) => !snap.exists || !isOrderOwnedByCaller(snap.data()!, callerAuth)))
      return res.status(403).json({ error: 'Forbidden invoice selection.' });
    const pdfBuffer =
      [2, 3].includes(saved.layoutVersion)
        ? await generateSavedInvoicePdf(saved as InvoiceBatch)
        : await generateServerConsolidatedInvoicePdf(
            saved.orders,
            saved.invoiceNo,
            Boolean(includeNotes),
            lang === 'en' ? 'en' : 'bm'
          );

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Combined_Invoice.pdf"`);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('[Invoice API] Combined PDF generation error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: errMsg });
  }
});

export default router;
