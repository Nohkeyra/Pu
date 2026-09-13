import { z } from 'zod';
import { getFirestore } from '../firebaseAdmin.js';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
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
    structuredContent: safe && typeof safe === 'object' && !Array.isArray(safe)
      ? safe as Record<string, unknown>
      : { result: safe },
  };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }] };
}

const menuSchema = z.object({});
const orderSchema = z.object({ orderId: z.string().min(1).max(200) });
const listOrdersSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.string().min(1).max(50).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
const salesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const calendarSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const MCP_TOOLS = [
  { name: 'get_menu', title: 'Get menu', description: 'Read the current Wawasan menu from Firestore.', inputSchema: menuSchema },
  { name: 'get_order', title: 'Get order', description: 'Read one Wawasan order by Firestore document ID.', inputSchema: orderSchema },
  { name: 'list_orders', title: 'List orders', description: 'List recent Wawasan orders, optionally filtered by event date and status.', inputSchema: listOrdersSchema },
  { name: 'get_sales_summary', title: 'Get sales summary', description: 'Calculate total and paid sales for an optional event-date range. Currency is MYR.', inputSchema: salesSchema },
  { name: 'get_calendar_events', title: 'Get calendar events', description: 'List orders/events scheduled for a specific date in Asia/Kuala_Lumpur.', inputSchema: calendarSchema },
] as const;

export async function executeMcpTool(name: string, rawArgs: unknown): Promise<ToolResult> {
  try {
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
        const snap = await db.collection('orders').doc(orderId).get();
        if (!snap.exists) return errorResult(`Order not found: ${orderId}`);
        return result({ id: snap.id, ...snap.data() });
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
      case 'get_sales_summary': {
        const args = salesSchema.parse(rawArgs ?? {});
        let query: FirebaseFirestore.Query = db.collection('orders');
        if (args.from) query = query.where('eventDate', '>=', args.from);
        if (args.to) query = query.where('eventDate', '<=', args.to);
        const snap = await query.get();
        let totalAmount = 0, paidAmount = 0, orderCount = 0;
        for (const doc of snap.docs) {
          const data = doc.data() as any;
          if (data.deletedByAdmin === true) continue;
          orderCount++;
          const amount = Number(data.totalAmount ?? 0) || 0;
          totalAmount += amount;
          if (String(data.paymentStatus ?? '').toLowerCase() === 'paid') paidAmount += amount;
        }
        return result({ currency: 'MYR', from: args.from ?? null, to: args.to ?? null, orderCount, totalAmount, paidAmount, unpaidAmount: totalAmount - paidAmount });
      }
      case 'get_calendar_events': {
        const args = calendarSchema.parse(rawArgs ?? {});
        const date = args.date ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
        const snap = await db.collection('orders').where('eventDate', '==', date).get();
        const events = snap.docs.filter(d => d.data().deletedByAdmin !== true).map(d => ({ id: d.id, ...d.data() }));
        return result({ date, events, count: events.length });
      }
      default:
        return errorResult(`Unknown MCP tool: ${name}`);
    }
  } catch (err) {
    console.error(`[MCP] Tool ${name} failed:`, err);
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}
