import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { getFirestore } from './firebaseAdmin.js';
import { DEFAULT_MENU_ITEMS } from '../src/constants/menu.js';
import { DEFAULT_FALLBACK_PRICE_PER_PAX } from './routes/orderRoutes.js';
import { AsyncLocalStorage } from 'async_hooks';

// Context storage to share request-specific information (like client IP) down to tool handlers
export const mcpContextStorage = new AsyncLocalStorage<{ clientIp: string }>();

// In-memory rate limiter tracking for submit_catering_inquiry (per client IP)
const submissionRateMap = new Map<string, { count: number; resetTime: number }>();

// Track verification attempts per orderId to prevent brute-forcing 4-digit phone numbers
const verificationAttemptMap = new Map<string, { attempts: number; lockoutUntil: number }>();

// Cleanup stale rate limit & verification entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of submissionRateMap.entries()) {
    if (now > value.resetTime) {
      submissionRateMap.delete(key);
    }
  }
  for (const [key, value] of verificationAttemptMap.entries()) {
    if (now > value.lockoutUntil) {
      verificationAttemptMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkAndRecordVerificationAttempt(orderId: string, isAttempting: boolean, isSuccessful: boolean): { isLockedOut: boolean; remainingLockoutMinutes?: number; attemptsLeft?: number } {
  const now = Date.now();
  const lockoutDurationMs = 15 * 60 * 1000; // 15-minute lockout
  const maxAttempts = 3;

  const record = verificationAttemptMap.get(orderId);

  if (record && now < record.lockoutUntil) {
    const remainingMinutes = Math.ceil((record.lockoutUntil - now) / 60000);
    return { isLockedOut: true, remainingLockoutMinutes: remainingMinutes };
  }

  if (!isAttempting) {
    return { isLockedOut: false };
  }

  if (isSuccessful) {
    verificationAttemptMap.delete(orderId);
    return { isLockedOut: false };
  }

  const currentAttempts = (record && now > record.lockoutUntil) ? 1 : ((record?.attempts || 0) + 1);
  if (currentAttempts >= maxAttempts) {
    verificationAttemptMap.set(orderId, { attempts: currentAttempts, lockoutUntil: now + lockoutDurationMs });
    return { isLockedOut: true, remainingLockoutMinutes: 15 };
  }

  verificationAttemptMap.set(orderId, { attempts: currentAttempts, lockoutUntil: now + (5 * 60 * 1000) });
  return { isLockedOut: false, attemptsLeft: maxAttempts - currentAttempts };
}

export function checkInquiryRateLimit(clientIp: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxSubmissions = 5;

  const current = submissionRateMap.get(clientIp);
  if (!current || now > current.resetTime) {
    submissionRateMap.set(clientIp, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= maxSubmissions) {
    return { allowed: false, remainingMs: current.resetTime - now };
  }

  current.count += 1;
  return { allowed: true };
}

// Helpers for PII masking
export function maskName(name: string): string {
  if (!name) return 'Customer';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2) + '***';
  }
  return `${parts[0]} ${parts[parts.length - 1].substring(0, 1)}.***`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

// Helper: Fetch menu items from Firestore or fallback
async function fetchMenuItems(): Promise<any[]> {
  try {
    const db = getFirestore();
    const snap = await db.collection('menu').get();
    if (snap.empty) {
      return DEFAULT_MENU_ITEMS.map(i => ({ available: true, ...i }));
    }
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        available: data.available !== undefined ? Boolean(data.available) : true,
        ...data
      };
    });
  } catch {
    return DEFAULT_MENU_ITEMS.map(i => ({ available: true, ...i }));
  }
}

// --------------------------------------------------------------------------
// Core Modular Tool Execution Handlers
// --------------------------------------------------------------------------

export async function executeGetMenuItems(args: { category?: string; search?: string }) {
  const category = (args.category || 'all').toLowerCase();
  const search = (args.search || '').toLowerCase().trim();

  const items = await fetchMenuItems();

  let filtered = items;
  if (category !== 'all') {
    filtered = filtered.filter((i: any) => i.category?.toLowerCase() === category);
  }
  if (search) {
    filtered = filtered.filter((i: any) =>
      (i.nameEn || '').toLowerCase().includes(search) ||
      (i.nameBm || '').toLowerCase().includes(search) ||
      (i.descEn || '').toLowerCase().includes(search) ||
      (i.descBm || '').toLowerCase().includes(search)
    );
  }

  const formatted = filtered.map((i: any) => ({
    id: i.id,
    nameEn: i.nameEn,
    nameBm: i.nameBm,
    category: i.category,
    priceMYR: i.price,
    descriptionEn: i.descEn,
    descriptionBm: i.descBm,
    available: i.available !== false
  }));

  return { totalItems: formatted.length, menuItems: formatted };
}

export async function executeCalculateEstimate(args: { guests: number; meals?: string[]; customDishes?: string[] }) {
  const guests = Math.max(1, args.guests || 1);
  const meals = Array.isArray(args.meals) && args.meals.length > 0 ? args.meals : ['lunch'];
  const customDishes = Array.isArray(args.customDishes) ? args.customDishes : [];

  const menuItems = await fetchMenuItems();
  let pricePerPax = 0;
  const matchedDishes: Array<{ name: string; price: number }> = [];

  if (customDishes.length > 0) {
    for (const requestedDish of customDishes) {
      const reqStr = String(requestedDish).toLowerCase().trim();
      if (!reqStr) continue;
      const match = menuItems.find((i: any) =>
        (i.nameEn || '').toLowerCase() === reqStr || (i.nameBm || '').toLowerCase() === reqStr ||
        (i.nameEn || '').toLowerCase().includes(reqStr) || (i.nameBm || '').toLowerCase().includes(reqStr)
      );
      if (match) {
        pricePerPax += match.price;
        matchedDishes.push({ name: `${match.nameEn} (${match.nameBm})`, price: match.price });
      }
    }
  }

  if (pricePerPax === 0) {
    pricePerPax = DEFAULT_FALLBACK_PRICE_PER_PAX;
  }

  const mealCount = meals.length;
  const totalAmount = Number((pricePerPax * guests * mealCount).toFixed(2));

  return {
    guests,
    mealSessions: meals,
    estimatedPricePerPaxMYR: pricePerPax,
    totalEstimateMYR: totalAmount,
    currency: 'MYR',
    matchedDishes,
    note: 'Calculation formula: (Price per pax) × (Guest headcount) × (Number of meal sessions). Final menu & pricing subject to admin confirmation.'
  };
}

export async function executeCheckOrderStatus(args: { orderId: string; verifyPhone?: string }) {
  const orderId = String(args.orderId || '').trim();
  if (!orderId) {
    return { found: false, message: 'Order ID is required.' };
  }

  const verifyPhone = args.verifyPhone ? String(args.verifyPhone).trim() : '';
  const db = getFirestore();
  const snap = await db.collection('orders').doc(orderId).get();

  if (!snap.exists) {
    return { found: false, message: `Order ID '${orderId}' was not found in the catering system.` };
  }

  const orderData = snap.data() || {};
  const rawContact = String(orderData.contact || orderData.phone || '');
  const rawName = String(orderData.name || orderData.customerName || '');
  const rawEmail = String(orderData.email || '');

  const cleanInputPhone = verifyPhone.replace(/\D/g, '');
  const cleanStoredPhone = rawContact.replace(/\D/g, '');

  const isAttempting = Boolean(verifyPhone);
  let isMatch = false;
  if (isAttempting && cleanInputPhone.length === 4 && cleanStoredPhone.length >= 4) {
    isMatch = cleanStoredPhone.endsWith(cleanInputPhone);
  }

  const attemptCheck = checkAndRecordVerificationAttempt(snap.id, isAttempting, isMatch);

  if (attemptCheck.isLockedOut) {
    return {
      found: true,
      orderId: snap.id,
      isLockedOut: true,
      error: 'VERIFICATION_LOCKED_OUT',
      securityNotice: `Too many failed phone verification attempts. Phone verification is locked out for ${attemptCheck.remainingLockoutMinutes || 15} minute(s). Contact restaurant admin for assistance.`
    };
  }

  if (!isMatch) {
    return {
      found: true,
      orderId: snap.id,
      status: orderData.status || 'pending',
      customerName: maskName(rawName),
      customerEmail: maskEmail(rawEmail),
      isVerified: false,
      securityNotice: 'Personal contact details and invoice information are protected. Provide "verifyPhone" with the exact 4 digits of the customer phone number to unlock full order details.'
    };
  }

  return {
    found: true,
    orderId: snap.id,
    status: orderData.status || 'pending',
    customerName: rawName,
    customerEmail: rawEmail,
    customerContact: rawContact,
    eventDate: orderData.eventDate || orderData.date || 'N/A',
    guests: orderData.guests || orderData.quantity || 0,
    meals: orderData.meals || ['lunch'],
    customMenu: orderData.customMenu || null,
    notes: orderData.notes || null,
    totalAmountMYR: orderData.totalAmount || 0,
    invoiceNo: orderData.invoiceNo || null,
    isVerified: true,
    securityNotice: 'Identity verified. Displaying unmasked order and invoice details.',
    createdAt: orderData.createdAt ? new Date(orderData.createdAt.seconds ? orderData.createdAt.seconds * 1000 : orderData.createdAt).toISOString() : null
  };
}

export async function executeGetCalendarAvailability(args: { date?: string }) {
  const dateStr = args.date ? String(args.date).trim() : '';
  const db = getFirestore();

  if (dateStr) {
    let snapshot = await db.collection('orders').where('eventDate', '==', dateStr).get();
    if (snapshot.empty) {
      snapshot = await db.collection('orders').where('date', '==', dateStr).get();
    }

    let totalPax = 0;
    const sessions = { breakfast: 0, lunch: 0, hi_tea: 0 };

    snapshot.docs.forEach(doc => {
      const order = doc.data();
      if (order.status === 'cancelled' || order.status === 'rejected') return;
      const pax = Number(order.guests || order.quantity || 0);
      totalPax += pax;

      const meals = Array.isArray(order.meals) ? order.meals : ['lunch'];
      if (meals.includes('breakfast')) sessions.breakfast += pax;
      if (meals.includes('lunch')) sessions.lunch += pax;
      if (meals.includes('hi_tea') || meals.includes('hi-tea') || meals.includes('tea_break')) sessions.hi_tea += pax;
    });

    const workloadStatus = totalPax > 500 ? 'heavy_workload' : totalPax > 250 ? 'moderate_workload' : 'available';

    return {
      date: dateStr,
      status: workloadStatus,
      totalPax,
      mealSessions: sessions,
      orderCount: snapshot.docs.filter(d => d.data().status !== 'cancelled' && d.data().status !== 'rejected').length
    };
  }

  const snapshot = await db.collection('orders').get();
  const dailyWorkload: Record<string, { breakfast: number; lunch: number; hi_tea: number; totalPax: number; count: number }> = {};

  snapshot.docs.forEach(doc => {
    const order = doc.data();
    if (order.status === 'cancelled' || order.status === 'rejected') return;

    let d: string | null = null;
    if (order.eventDate) d = String(order.eventDate).split('T')[0];
    else if (order.date) d = String(order.date).split('T')[0];

    if (!d) return;

    if (!dailyWorkload[d]) {
      dailyWorkload[d] = { breakfast: 0, lunch: 0, hi_tea: 0, totalPax: 0, count: 0 };
    }

    const pax = Number(order.guests || order.quantity || 0);
    const meals = Array.isArray(order.meals) ? order.meals : ['lunch'];

    dailyWorkload[d].count += 1;
    dailyWorkload[d].totalPax += pax;
    if (meals.includes('breakfast')) dailyWorkload[d].breakfast += pax;
    if (meals.includes('lunch')) dailyWorkload[d].lunch += pax;
    if (meals.includes('hi_tea') || meals.includes('hi-tea')) dailyWorkload[d].hi_tea += pax;
  });

  return {
    summary: 'Calendar workload capacity',
    bookedDatesCount: Object.keys(dailyWorkload).length,
    dates: dailyWorkload
  };
}

export async function executeSubmitInquiry(args: {
  customerName: string;
  contact: string;
  email?: string;
  eventDate: string;
  guests: number;
  meals?: string[];
  customMenu?: string;
  notes?: string;
}, clientIp: string) {
  const rateCheck = checkInquiryRateLimit(clientIp);
  if (!rateCheck.allowed) {
    const remainingMinutes = Math.ceil((rateCheck.remainingMs || 0) / 60000);
    return {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Inquiry rate limit exceeded. Maximum 5 submissions per 15 minutes per client IP. Please wait ${remainingMinutes} minute(s) before trying again.`
    };
  }

  const db = getFirestore();
  const orderPayload = {
    name: args.customerName.trim(),
    contact: args.contact.trim(),
    email: args.email ? args.email.trim() : '',
    eventDate: args.eventDate.trim(),
    guests: Math.max(1, args.guests),
    meals: Array.isArray(args.meals) && args.meals.length > 0 ? args.meals : ['lunch'],
    customMenu: args.customMenu ? args.customMenu.trim() : '',
    notes: args.notes ? args.notes.trim() : '',
    source: 'ai_mcp_agent',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const docRef = await db.collection('orders').add(orderPayload);

  return {
    success: true,
    orderId: docRef.id,
    status: 'pending',
    message: 'Catering inquiry submitted successfully. Restaurant admin will review and process the invoice.'
  };
}

// --------------------------------------------------------------------------
// Initialize McpServer & Streamable HTTP Transport
// --------------------------------------------------------------------------

export const mcpServer = new McpServer({
  name: 'restoran-wawasan-mcp-server',
  version: '1.3.10'
});

// Tool 1: get_menu_items
mcpServer.tool(
  'get_menu_items',
  'Fetch the halal food & drink catering menu for Restoran Wawasan Pak Usop. Filter by category or search term.',
  {
    category: z.enum(['all', 'breakfast', 'lunch', 'hi tea', 'drinks']).optional().describe('Filter by meal category'),
    search: z.string().max(100).optional().describe('Keyword search in EN or BM (e.g. "asam pedas", "nasi lemak")')
  },
  async (args) => {
    const res = await executeGetMenuItems(args);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
);

// Tool 2: calculate_catering_estimate
mcpServer.tool(
  'calculate_catering_estimate',
  'Calculate per-pax pricing and total cost estimate (in MYR) for a catering order based on guest count, meal sessions, and dish selections.',
  {
    guests: z.number().min(1).max(10000).describe('Number of guests / pax'),
    meals: z.array(z.enum(['breakfast', 'lunch', 'hi_tea'])).optional().describe('Meal sessions requested'),
    customDishes: z.array(z.string().max(100)).optional().describe('Specific requested dishes')
  },
  async (args) => {
    const res = await executeCalculateEstimate(args);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
);

// Tool 3: check_order_status
mcpServer.tool(
  'check_order_status',
  'Check the status, details, and invoice reference of a catering order by order reference ID.',
  {
    orderId: z.string().min(1).max(100).describe('The order reference ID (e.g. "ord_123456" or document ID)'),
    verifyPhone: z.string().regex(/^\d{4}$/, "Must be exactly 4 digits").optional().describe('Exact last 4 digits of customer phone number for identity verification')
  },
  async (args) => {
    const res = await executeCheckOrderStatus(args);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
);

// Tool 4: get_calendar_availability
mcpServer.tool(
  'get_calendar_availability',
  'Get daily catering workload capacity and session counts for specific dates.',
  {
    date: z.string().max(20).optional().describe('Date in YYYY-MM-DD format, or empty for calendar summary')
  },
  async (args) => {
    const res = await executeGetCalendarAvailability(args);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
);

// Tool 5: submit_catering_inquiry
mcpServer.tool(
  'submit_catering_inquiry',
  'Submit a new catering inquiry or preliminary order to Restoran Wawasan Pak Usop.',
  {
    customerName: z.string().min(2).max(100).describe('Name of the person or company booking'),
    contact: z.string().min(3).max(30).describe('Phone number or contact string'),
    email: z.string().email().max(100).optional().or(z.literal('')).describe('Customer email address'),
    eventDate: z.string().min(8).max(20).describe('Date of the event (YYYY-MM-DD)'),
    guests: z.number().min(1).max(10000).describe('Number of guests / pax'),
    meals: z.array(z.enum(['breakfast', 'lunch', 'hi_tea'])).optional().describe('Meal sessions'),
    customMenu: z.string().max(1000).optional().describe('Custom menu details'),
    notes: z.string().max(1000).optional().describe('Special requirements or delivery address')
  },
  async (args) => {
    const store = mcpContextStorage.getStore();
    const clientIp = store?.clientIp || 'unknown_ip';
    const res = await executeSubmitInquiry(args, clientIp);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  }
);

// Instantiate transport
export const mcpTransport = new StreamableHTTPServerTransport();

// Bind the server to the transport
mcpServer.connect(mcpTransport).then(() => {
  console.log('[MCP] Server successfully connected to StreamableHTTPServerTransport');
}).catch((err) => {
  console.error('[MCP] Failed to connect to StreamableHTTPServerTransport:', err);
});
