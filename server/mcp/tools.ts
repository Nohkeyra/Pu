import { z } from 'zod/v4';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, generateSequentialInvoiceNo } from '../firebaseAdmin.js';
import { createBrevoTransporter } from '../emailService.js';
import { generateServerInvoicePdf } from '../services/serverPdfService.js';
import { isValidStatusTransition } from '../services/orderValidator.js';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

type McpAuthInfo = {
  clientId?: string;
  scopes?: string[];
};

function jsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const v = value as any;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (Array.isArray(value)) return value.map(jsonSafe);
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, x]) => [k, jsonSafe(x)]));
  }
  return value;
}

function result(data: unknown): ToolResult {
  const safe = jsonSafe(data);
  return {
    content: [{ type: 'text', text: JSON.stringify(safe, null, 2) }],
    structuredContent: safe && typeof safe === 'object' && !Array.isArray(safe) ? safe as Record<string, unknown> : { result: safe },
  };
}

function errorResult(message: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: message }) }] };
}

function hasWriteAccess(authInfo?: McpAuthInfo): boolean {
  return Boolean(authInfo?.scopes?.includes('wawasan'));
}

const menuSchema = z.object({});
const orderSchema = z.object({ orderId: z.string().min(1).max(200) });
const listOrdersSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.string().min(1).max(50).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
const unbilledOrdersSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
const salesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const calendarSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
const statusSchema = z.object({
  orderId: z.string().min(1).max(200),
  status: z.enum(['pending', 'approved', 'billed', 'in_transit', 'delivered', 'completed', 'cancel_requested', 'cancelled', 'rejected']),
});
const billSchema = z.object({
  orderId: z.string().min(1).max(200),
  prices: z.record(z.string().min(1).max(50), z.number().finite().positive().max(100000)),
  sendInvoiceEmail: z.boolean().default(true),
});
const sendInvoiceSchema = z.object({
  orderId: z.string().min(1).max(200),
  email: z.string().email().optional(),
});
const findOrdersSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(20),
});

export const MCP_TOOLS = [
  { name: 'get_menu', title: 'Get menu', description: 'Read the current Wawasan menu from Firestore.', inputSchema: menuSchema, readOnly: true },
  { name: 'get_order', title: 'Get order', description: 'Read one Wawasan order by Firestore document ID.', inputSchema: orderSchema, readOnly: true },
  { name: 'list_orders', title: 'List orders', description: 'List recent Wawasan orders, optionally filtered by event date and status.', inputSchema: listOrdersSchema, readOnly: true },
  { name: 'list_unbilled_orders', title: 'List unbilled orders', description: 'List active Wawasan orders that have not been billed yet. Useful for finding orders that still need pricing/invoicing.', inputSchema: unbilledOrdersSchema, readOnly: true },
  { name: 'find_orders', title: 'Find orders', description: 'Find recent orders by customer/company name, email, invoice number, phone, or Firestore order ID.', inputSchema: findOrdersSchema, readOnly: true },
  { name: 'get_sales_summary', title: 'Get sales summary', description: 'Calculate order count and MYR totals for an optional event-date range.', inputSchema: salesSchema, readOnly: true },
  { name: 'get_calendar_events', title: 'Get calendar events', description: 'List orders/events scheduled for a specific date in Asia/Kuala_Lumpur.', inputSchema: calendarSchema, readOnly: true },
  { name: 'update_order_status', title: 'Update order status', description: 'Admin action: change an order status using the same validated status-transition rules as the Wawasan admin panel.', inputSchema: statusSchema, readOnly: false },
  { name: 'bill_order', title: 'Bill order', description: 'Admin action: set meal pricing, calculate the total, generate the official invoice number, mark the order billed, and optionally email the final invoice PDF to the customer. Only call after the user explicitly asks to bill the order.', inputSchema: billSchema, readOnly: false },
  { name: 'send_invoice_email', title: 'Send invoice email', description: 'Admin action: generate the final invoice PDF for an order and email it to the order email address or the supplied address.', inputSchema: sendInvoiceSchema, readOnly: false },
] as const;

async function getOrder(orderId: string) {
  const db = getFirestore();
  const snap = await db.collection('orders').doc(orderId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Record<string, any>;
}

function activeOrder(data: Record<string, any>): boolean {
  const status = String(data.status || 'pending').toLowerCase();
  return data.deletedByAdmin !== true && !['cancelled', 'rejected'].includes(status);
}

function calculatePrices(order: Record<string, any>, prices: Record<string, number>) {
  const quantity = Number(order.quantity || order.guests || order.pax || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Order has an invalid quantity/pax value.');

  const meals: string[] = Array.isArray(order.meals) ? order.meals : (order.meals ? [String(order.meals)] : []);
  const finalPrices: Record<string, number> = {};
  let totalAmount = 0;

  if (meals.length === 0) {
    const defaultPrice = prices.default;
    if (!defaultPrice) throw new Error('No meal types are stored on this order. Provide a positive prices.default value.');
    finalPrices.default = Math.round(defaultPrice * 100) / 100;
    totalAmount = finalPrices.default * quantity;
  } else {
    for (const meal of meals) {
      const normalized = meal.replace('_', '');
      const price = prices[meal] ?? prices[normalized];
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        throw new Error(`Missing positive price for meal '${meal}'. Provide a price for every meal on the order.`);
      }
      finalPrices[meal] = Math.round(price * 100) / 100;
      totalAmount += finalPrices[meal] * quantity;
    }
  }

  return { quantity, finalPrices, totalAmount: Math.round(totalAmount * 100) / 100 };
}

async function sendFinalInvoiceEmail(order: Record<string, any>, invoiceNo: string, totalAmount: number, pdfBuffer: Buffer, recipientEmail?: string) {
  const email = (recipientEmail || order.email || order.customerEmail || '').trim();
  if (!email || !email.includes('@')) throw new Error('Order has no valid customer email.');
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error('SMTP is not configured on the server.');

  const transporter = createBrevoTransporter();
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;
  const lang = order.lang === 'en' ? 'en' : 'bm';
  const companyName = order.to || 'Pelanggan';

  await transporter.sendMail({
    from: `"Restoran Wawasan Pak Usop" <${senderEmail}>`,
    to: email,
    subject: lang === 'bm'
      ? `[Restoran Wawasan] Invois Rasmi ${invoiceNo} - ${companyName}`
      : `[Restoran Wawasan] Official Invoice ${invoiceNo} - ${companyName}`,
    text: lang === 'bm'
      ? `Salam hormat,\n\nSila rujuk invois rasmi kami ${invoiceNo} yang dilampirkan bersama emel ini.\n\nJumlah: RM ${totalAmount.toFixed(2)}\n\nTerima kasih atas kepercayaan anda.\n\nRestoran Wawasan Pak Usop`
      : `Dear ${order.attn || companyName},\n\nPlease find our official invoice ${invoiceNo} attached to this email.\n\nTotal: RM ${totalAmount.toFixed(2)}\n\nThank you for your continued trust.\n\nRestoran Wawasan Pak Usop`,
    attachments: [{ filename: `Invoice_${invoiceNo}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
  });

  return email;
}

export async function executeMcpTool(name: string, rawArgs: unknown, authInfo?: McpAuthInfo): Promise<ToolResult> {
  try {
    if (!hasWriteAccess(authInfo) && ['update_order_status', 'bill_order', 'send_invoice_email'].includes(name)) {
      return errorResult('This action requires an authorized Wawasan MCP connection with write access. Reconnect the connector after updating its OAuth authorization.');
    }

    const db = getFirestore();

    switch (name) {
      case 'get_menu': {
        menuSchema.parse(rawArgs ?? {});
        const snap = await db.collection('menu').get();
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return result({ items, count: items.length });
      }
      case 'get_order': {
        const { orderId } = orderSchema.parse(rawArgs);
        const order = await getOrder(orderId);
        if (!order) return errorResult(`Order not found: ${orderId}`);
        return result(order);
      }
      case 'list_orders': {
        const args = listOrdersSchema.parse(rawArgs ?? {});
        let query: FirebaseFirestore.Query = db.collection('orders');
        if (args.date) query = query.where('eventDate', '==', args.date);
        if (args.status) query = query.where('status', '==', args.status);
        query = query.orderBy('createdAt', 'desc').limit(args.limit);
        const snap = await query.get();
        const orders = snap.docs.filter(d => d.data().deletedByAdmin !== true).map(d => ({ id: d.id, ...d.data() }));
        return result({ orders, count: orders.length });
      }
      case 'list_unbilled_orders': {
        const args = unbilledOrdersSchema.parse(rawArgs ?? {});
        let query: FirebaseFirestore.Query = db.collection('orders');
        if (args.from) query = query.where('eventDate', '>=', args.from);
        if (args.to) query = query.where('eventDate', '<=', args.to);
        const snap = await query.limit(Math.min(500, Math.max(args.limit * 4, 100))).get();
        const orders = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Record<string, any>))
          .filter(activeOrder)
          .filter(o => String(o.status || 'pending').toLowerCase() !== 'billed')
          .sort((a, b) => String(a.eventDate || a.date || '').localeCompare(String(b.eventDate || b.date || '')))
          .slice(0, args.limit);
        return result({ orders, count: orders.length });
      }
      case 'find_orders': {
        const args = findOrdersSchema.parse(rawArgs);
        const needle = args.query.trim().toLowerCase();
        const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(300).get();
        const orders = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Record<string, any>))
          .filter(d => d.deletedByAdmin !== true)
          .filter(d => [d.id, d.invoiceNo, d.name, d.to, d.attn, d.email, d.customerEmail, d.contact, d.phone].some(v => String(v || '').toLowerCase().includes(needle)))
          .slice(0, args.limit);
        return result({ orders, count: orders.length });
      }
      case 'get_sales_summary': {
        const args = salesSchema.parse(rawArgs ?? {});
        let query: FirebaseFirestore.Query = db.collection('orders');
        if (args.from) query = query.where('eventDate', '>=', args.from);
        if (args.to) query = query.where('eventDate', '<=', args.to);
        const snap = await query.get();
        let totalAmount = 0, billedAmount = 0, paidAmount = 0, orderCount = 0;
        for (const doc of snap.docs) {
          const data = doc.data() as any;
          if (data.deletedByAdmin === true) continue;
          orderCount++;
          const amount = Number(data.totalAmount ?? 0) || 0;
          totalAmount += amount;
          if (String(data.status || '').toLowerCase() === 'billed') billedAmount += amount;
          if (String(data.paymentStatus ?? '').toLowerCase() === 'paid') paidAmount += amount;
        }
        return result({ currency: 'MYR', from: args.from ?? null, to: args.to ?? null, orderCount, totalAmount, billedAmount, paidAmount, unpaidAmount: billedAmount - paidAmount });
      }
      case 'get_calendar_events': {
        const args = calendarSchema.parse(rawArgs ?? {});
        const date = args.date ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
        const snap = await db.collection('orders').where('eventDate', '==', date).get();
        const events = snap.docs.filter(d => d.data().deletedByAdmin !== true).map(d => ({ id: d.id, ...d.data() }));
        return result({ date, events, count: events.length });
      }
      case 'update_order_status': {
        const args = statusSchema.parse(rawArgs);
        const orderRef = db.collection('orders').doc(args.orderId);
        const snap = await orderRef.get();
        if (!snap.exists) return errorResult(`Order not found: ${args.orderId}`);
        const oldData = snap.data() as Record<string, any>;
        const oldStatus = String(oldData.status || 'pending');
        if (!isValidStatusTransition(oldStatus, args.status)) return errorResult(`Invalid status transition from '${oldStatus}' to '${args.status}'.`);

        const updates: Record<string, unknown> = { status: args.status, updatedAt: FieldValue.serverTimestamp() };
        if (args.status === 'approved' || args.status === 'billed') {
          if (!oldData.invoiceNo) updates.invoiceNo = await generateSequentialInvoiceNo(false);
          else if (String(oldData.invoiceNo).startsWith('QT')) updates.invoiceNo = String(oldData.invoiceNo).replace(/^QT\s*/i, 'RW ');
        }
        if (args.status === 'approved') updates.approvedAt = oldData.approvedAt || new Date().toISOString();
        if (args.status === 'billed') updates.billedAt = oldData.billedAt || new Date().toISOString();
        await orderRef.update(updates);
        return result({ success: true, orderId: args.orderId, previousStatus: oldStatus, status: args.status, invoiceNo: updates.invoiceNo || oldData.invoiceNo || null });
      }
      case 'bill_order': {
        const args = billSchema.parse(rawArgs);
        const orderRef = db.collection('orders').doc(args.orderId);
        const snap = await orderRef.get();
        if (!snap.exists) return errorResult(`Order not found: ${args.orderId}`);
        const order = { id: snap.id, ...snap.data() } as Record<string, any>;
        const currentStatus = String(order.status || 'pending').toLowerCase();
        if (['billed', 'cancelled', 'rejected'].includes(currentStatus)) return errorResult(`Order is already '${currentStatus}' and cannot be billed again.`);
        if (!['pending', 'approved'].includes(currentStatus)) return errorResult(`Order is '${currentStatus}'. Only pending or approved orders can be billed.`);

        const pricing = calculatePrices(order, args.prices);
        const invoiceNo = String(order.invoiceNo || '').startsWith('QT')
          ? String(order.invoiceNo).replace(/^QT\s*/i, 'RW ')
          : (order.invoiceNo || await generateSequentialInvoiceNo(false));
        const orderForPdf = { ...order, prices: pricing.finalPrices, totalAmount: pricing.totalAmount, invoiceNo, status: 'billed' };
        const pdfBuffer = await generateServerInvoicePdf(orderForPdf, true);

        let emailedTo: string | null = null;
        if (args.sendInvoiceEmail) {
          emailedTo = await sendFinalInvoiceEmail(orderForPdf, invoiceNo, pricing.totalAmount, pdfBuffer);
        }

        await orderRef.update({
          status: 'billed',
          prices: pricing.finalPrices,
          totalAmount: pricing.totalAmount,
          invoiceNo,
          officialInvoiceNo: invoiceNo,
          approvedAt: order.approvedAt || new Date().toISOString(),
          billedAt: new Date().toISOString(),
          invoiceGeneratedAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return result({ success: true, orderId: args.orderId, invoiceNo, status: 'billed', quantity: pricing.quantity, prices: pricing.finalPrices, totalAmount: pricing.totalAmount, invoiceEmailSent: Boolean(emailedTo), emailedTo });
      }
      case 'send_invoice_email': {
        const args = sendInvoiceSchema.parse(rawArgs);
        const order = await getOrder(args.orderId);
        if (!order) return errorResult(`Order not found: ${args.orderId}`);
        if (!activeOrder(order)) return errorResult(`Order '${args.orderId}' is not active and cannot receive an invoice.`);
        const invoiceNo = String(order.invoiceNo || '');
        if (!invoiceNo) return errorResult('Order has no invoice number. Bill the order first.');
        const pdfBuffer = await generateServerInvoicePdf(order, true);
        const emailedTo = await sendFinalInvoiceEmail(order, invoiceNo, Number(order.totalAmount || 0), pdfBuffer, args.email);
        return result({ success: true, orderId: args.orderId, invoiceNo, emailedTo });
      }
      default:
        return errorResult(`Unknown MCP tool: ${name}`);
    }
  } catch (err) {
    console.error(`[MCP] Tool ${name} failed:`, err);
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
