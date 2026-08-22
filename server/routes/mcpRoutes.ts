import { Router, type Request, type Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { getFirestore } from '../firebaseAdmin.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.js';
import { DEFAULT_FALLBACK_PRICE_PER_PAX } from './orderRoutes.js';

const router = Router();

// Store active SSE transports by sessionId
const activeSseTransports = new Map<string, SSEServerTransport>();

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

function checkAndRecordVerificationAttempt(orderId: string, isAttempting: boolean, isSuccessful: boolean): { isLockedOut: boolean; remainingLockoutMinutes?: number; attemptsLeft?: number } {
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

function checkInquiryRateLimit(clientIp: string): { allowed: boolean; remainingMs?: number } {
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
function maskName(name: string): string {
  if (!name) return 'Customer';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2) + '***';
  }
  return `${parts[0]} ${parts[parts.length - 1].substring(0, 1)}.***`;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

// Helper: Verify API Key if process.env.AI_API_KEY is defined
function isAuthorized(req: Request): boolean {
  const configuredKey = process.env.AI_API_KEY;
  if (!configuredKey) return true;

  const apiKeyHeader = req.headers['x-ai-api-key'] || req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const queryApiKey = req.query.apiKey || req.query.api_key;

  let token = apiKeyHeader ? String(apiKeyHeader).trim() : '';
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token && queryApiKey) {
    token = String(queryApiKey).trim();
  }

  return token === configuredKey;
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
// Core Modular Tool Execution Handlers (Shared between MCP SSE & HTTP Direct)
// --------------------------------------------------------------------------

async function executeGetMenuItems(args: { category?: string; search?: string }) {
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

async function executeCalculateEstimate(args: { guests: number; meals?: string[]; customDishes?: string[] }) {
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

async function executeCheckOrderStatus(args: { orderId: string; verifyPhone?: string }) {
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
  // STRICT PHONE VERIFICATION (Finding 1): Must be non-empty, exactly 4 digits, and match end of stored contact
  let isMatch = false;
  if (isAttempting && cleanInputPhone.length === 4 && cleanStoredPhone.length >= 4) {
    isMatch = cleanStoredPhone.endsWith(cleanInputPhone);
  }

  // Check brute-force lockout state per orderId
  const attemptCheck = checkAndRecordVerificationAttempt(snap.id, isAttempting, isMatch);

  // Finding 3 Fix: When locked out, return ONLY lockout status — DO NOT leak order details or totals!
  if (attemptCheck.isLockedOut) {
    return {
      found: true,
      orderId: snap.id,
      isLockedOut: true,
      error: 'VERIFICATION_LOCKED_OUT',
      securityNotice: `Too many failed phone verification attempts. Phone verification is locked out for ${attemptCheck.remainingLockoutMinutes || 15} minute(s). Contact restaurant admin for assistance.`
    };
  }

  // Finding 2 Fix: When unverified, return ONLY status, masked name, masked email, and security notice!
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

  // Fully Verified Response
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

async function executeGetCalendarAvailability(args: { date?: string }) {
  const dateStr = args.date ? String(args.date).trim() : '';
  const db = getFirestore();

  // Finding 12 Fix: Targeted Firestore Query when date parameter is provided
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

  // Summary Query across all booked dates
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

async function executeSubmitInquiry(args: {
  customerName: string;
  contact: string;
  email?: string;
  eventDate: string;
  guests: number;
  meals?: string[];
  customMenu?: string;
  notes?: string;
}, clientIp: string) {
  // Finding 4 Fix: Per-IP sliding window rate limiting
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
// Create & Configure the Native MCP Server Instance
// --------------------------------------------------------------------------

function createWawasanMcpServer(clientIp: string) {
  const server = new McpServer({
    name: 'restoran-wawasan-mcp-server',
    version: '1.3.10'
  });

  // Tool 1: get_menu_items
  server.tool(
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
  server.tool(
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
  server.tool(
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
  server.tool(
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
  server.tool(
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
      const res = await executeSubmitInquiry(args, clientIp);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
  );

  return server;
}

// --------------------------------------------------------------------------
// 1. SSE Transport Endpoints for Claude Desktop / mcp-remote
// --------------------------------------------------------------------------

// GET /api/mcp/sse - Establish Server-Sent Events stream for MCP
router.get(['/sse', '/sse/'], async (req: Request, res: Response) => {
  // Authorization check bypassed for public MCP SSE stream
  // if (!isAuthorized(req)) {
  //   return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
  // }

  // Disable proxy/response buffering so the stream flushes immediately.
  // Render (and most reverse proxies) will silently drop an SSE connection
  // that goes quiet for ~55s with no bytes sent, which looks like a
  // "connects then dies" or "never connects" failure on the client side.
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx-style proxy buffering

  const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown_client').split(',')[0].trim();
  const transport = new SSEServerTransport('/api/mcp/message', res);
  const mcpServer = createWawasanMcpServer(clientIp);

  activeSseTransports.set(transport.sessionId, transport);

  // Heartbeat: send an SSE comment line every 20s to keep the connection
  // alive through idle-timeout proxies. Comments (lines starting with ':')
  // are ignored by SSE clients/parsers, so this is safe for mcp-remote too.
  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20 * 1000);

  const cleanup = () => {
    clearInterval(heartbeat);
    activeSseTransports.delete(transport.sessionId);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);

  try {
    await mcpServer.connect(transport);
  } catch (err) {
    cleanup();
    console.error('[MCP SSE] Failed to connect transport:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish MCP SSE connection.' });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

// POST /api/mcp/message - Post message to active SSE session
router.post('/message', async (req: Request, res: Response) => {
  // Authorization check bypassed for MCP SSE active session messages
  // if (!isAuthorized(req)) {
  //   return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
  // }

  const sessionId = req.query.sessionId as string;
  const transport = activeSseTransports.get(sessionId);

  if (!transport) {
    // Most common cause: the server process restarted (deploy, crash, or
    // Render free-tier recycling) between the SSE handshake and this POST,
    // since sessions live in memory only. The client should reconnect via
    // a fresh GET /api/mcp/sse rather than retrying this sessionId.
    return res.status(404).json({
      error: `MCP SSE Session '${sessionId}' not found or expired.`,
      reason: 'Session store is in-memory; a server restart invalidates all active sessions.',
      action: 'Reconnect by opening a new GET /api/mcp/sse stream.'
    });
  }

  await transport.handlePostMessage(req, res);
});

// --------------------------------------------------------------------------
// 2. Direct HTTP / JSON-RPC Endpoints for REST, Custom GPTs & Claude Connectors
// --------------------------------------------------------------------------

// GET /.well-known/mcp.json & /.well-known/mcp - MCP Discovery for Claude Connectors
const getMcpDiscoveryJson = (req: Request) => {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  return {
    schema_version: 'v1',
    name_for_human: 'Wawasan Hub',
    name_for_model: 'wawasan_hub',
    description_for_human: 'Restoran Wawasan Pak Usop Halal Catering & Order Management Hub.',
    description_for_model: 'API and MCP server for fetching menu items, calculating catering estimates, checking order status, and submitting catering inquiries.',
    auth: {
      type: 'none'
    },
    auth_type: 'none',
    api: {
      type: 'mcp',
      url: `${baseUrl}/api/mcp/sse`,
      mcp_version: '2024-11-05'
    },
    mcpVersion: '2024-11-05',
    transport: 'sse',
    endpoints: {
      sse: `${baseUrl}/api/mcp/sse`,
      message: `${baseUrl}/api/mcp/message`,
      rpc: `${baseUrl}/api/mcp/call`,
      tools: `${baseUrl}/api/mcp/tools`,
      openapi: `${baseUrl}/api/mcp/openapi.json`
    }
  };
};

router.get(['/mcp.json', '/mcp'], (req: Request, res: Response) => {
  return res.json(getMcpDiscoveryJson(req));
});

// OAuth probe fallback handlers - explicit confirmation that no sign-in / OAuth is required
router.use(['/oauth-authorization-server*', '/openid-configuration*'], (_req: Request, res: Response) => {
  return res.status(200).json({
    auth_required: false,
    auth_type: 'none',
    authorization_servers: [],
    message: 'Wawasan Hub MCP server operates in no-auth mode. No sign-in required.'
  });
});

// RFC 9728 Protected Resource Metadata probe - Claude.ai's connector setup checks
// /.well-known/oauth-protected-resource(<path>) to decide whether a connector needs
// sign-in. Without this route it 404s and the UI shows a spurious "asked for
// sign-in" warning even when auth is set to None. Match both the bare path and any
// resource-scoped variant (e.g. /oauth-protected-resource/api/mcp/sse).
router.use(['/oauth-protected-resource*'], (req: Request, res: Response) => {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  return res.status(200).json({
    resource: `${baseUrl}/api/mcp/sse`,
    authorization_servers: [],
    scopes_supported: [],
    bearer_methods_supported: [],
    auth_required: false,
    auth_type: 'none',
    message: 'Wawasan Hub MCP server operates in no-auth mode. No sign-in required.'
  });
});

// GET /api/mcp & /api/mcp/manifest - Server Manifest Info
router.get('/', (req: Request, res: Response) => {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  return res.json({
    mcpVersion: '2024-11-05',
    server: {
      name: 'restoran-wawasan-mcp-server',
      version: '1.3.10',
      description: 'Native Model Context Protocol (MCP) server for Restoran Wawasan Pak Usop Halal Catering.'
    },
    auth: {
      type: 'none'
    },
    auth_type: 'none',
    transports: {
      sse: `${baseUrl}/api/mcp/sse`,
      message: `${baseUrl}/api/mcp/message`,
      rpc: `${baseUrl}/api/mcp/call`
    },
    capabilities: {
      tools: { listChanged: false }
    },
    endpoints: {
      tools: `${baseUrl}/api/mcp/tools`,
      openapi: `${baseUrl}/api/mcp/openapi.json`
    }
  });
});

router.get('/manifest', (_req: Request, res: Response) => {
  return res.redirect('/api/mcp');
});

// GET /api/mcp/tools - Tool Definitions List with Annotations
router.get('/tools', (_req: Request, res: Response) => {
  return res.json({
    tools: [
      {
        name: 'get_menu_items',
        description: 'Fetch the halal food & drink catering menu for Restoran Wawasan Pak Usop.',
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true
        },
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['all', 'breakfast', 'lunch', 'hi tea', 'drinks'] },
            search: { type: 'string', maxLength: 100 }
          }
        }
      },
      {
        name: 'calculate_catering_estimate',
        description: 'Calculate per-pax pricing and total cost estimate (in MYR) for a catering order.',
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true
        },
        inputSchema: {
          type: 'object',
          properties: {
            guests: { type: 'number', minimum: 1, maximum: 10000 },
            meals: { type: 'array', items: { type: 'string', enum: ['breakfast', 'lunch', 'hi_tea'] } },
            customDishes: { type: 'array', items: { type: 'string', maxLength: 100 } }
          },
          required: ['guests']
        }
      },
      {
        name: 'check_order_status',
        description: 'Check order status and details by order reference ID.',
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true
        },
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', minLength: 1, maxLength: 100 },
            verifyPhone: { type: 'string', pattern: '^\\d{4}$', description: 'Exact last 4 digits of customer phone number' }
          },
          required: ['orderId']
        }
      },
      {
        name: 'get_calendar_availability',
        description: 'Get daily catering workload capacity and session counts.',
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true
        },
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', maxLength: 20 }
          }
        }
      },
      {
        name: 'submit_catering_inquiry',
        description: 'Submit a new catering inquiry or preliminary order.',
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false
        },
        inputSchema: {
          type: 'object',
          properties: {
            customerName: { type: 'string', minLength: 2, maxLength: 100 },
            contact: { type: 'string', minLength: 3, maxLength: 30 },
            email: { type: 'string', maxLength: 100 },
            eventDate: { type: 'string', minLength: 8, maxLength: 20 },
            guests: { type: 'number', minimum: 1, maximum: 10000 },
            meals: { type: 'array', items: { type: 'string', enum: ['breakfast', 'lunch', 'hi_tea'] } },
            customMenu: { type: 'string', maxLength: 1000 },
            notes: { type: 'string', maxLength: 1000 }
          },
          required: ['customerName', 'contact', 'eventDate', 'guests']
        }
      }
    ]
  });
});

// GET /api/mcp/docs - Public HTML documentation page for self-configuring Claude Desktop & Claude Code
router.get('/docs', (req: Request, res: Response) => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  const sseUrl = `${baseUrl}/api/mcp/sse`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restoran Wawasan Pak Usop - Model Context Protocol (MCP) Setup</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-stone-900 text-stone-100 font-sans min-h-screen p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
  <div class="border-b border-stone-800 pb-6 flex items-center justify-between">
    <div>
      <span class="text-xs font-bold uppercase tracking-wider text-amber-500">MCP Protocol 2024-11-05</span>
      <h1 class="text-2xl sm:text-3xl font-extrabold text-white mt-1">Restoran Wawasan MCP Server</h1>
      <p class="text-stone-400 text-sm mt-1">Self-configuration guide for Claude Desktop, Claude Code & AI Agents</p>
    </div>
    <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full">v1.3.10 Active</span>
  </div>

  <!-- SSE Endpoint Card -->
  <div class="bg-stone-800/80 border border-stone-700 rounded-2xl p-6 space-y-3">
    <h2 class="text-base font-bold text-white flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
      Server-Sent Events (SSE) Endpoint
    </h2>
    <p class="text-xs text-stone-300">Use this stream URL to connect <code class="text-amber-400">mcp-remote</code> or Claude Desktop directly:</p>
    <div class="bg-stone-950 p-3.5 rounded-xl border border-stone-800 font-mono text-xs text-emerald-300 break-all select-all">
      ${sseUrl}
    </div>
  </div>

  <!-- 1. Claude Desktop Config -->
  <div class="space-y-3">
    <h3 class="text-lg font-bold text-white">1. Claude Desktop Configuration</h3>
    <p class="text-xs text-stone-400">Add the following block to your <code class="text-amber-300">claude_desktop_config.json</code> file:</p>
    <pre class="bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-amber-300 overflow-x-auto">
{
  "mcpServers": {
    "restoran-wawasan": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${sseUrl}"
      ]
    }
  }
}</pre>
  </div>

  <!-- 2. Claude Code CLI -->
  <div class="space-y-3">
    <h3 class="text-lg font-bold text-white">2. Claude Code CLI Command</h3>
    <p class="text-xs text-stone-400">To quickly connect from Claude Code, execute:</p>
    <pre class="bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-emerald-300 overflow-x-auto">claude mcp add restoran-wawasan npx -y mcp-remote ${sseUrl}</pre>
  </div>

  <!-- 3. Security & Authentication -->
  <div class="bg-stone-800/50 border border-stone-700/80 rounded-2xl p-6 space-y-3">
    <h3 class="text-lg font-bold text-white">3. Security & Authentication Header</h3>
    <p class="text-xs text-stone-300">If <code class="text-amber-400">AI_API_KEY</code> is configured on the server, include either of the following HTTP headers with requests:</p>
    <div class="space-y-2 font-mono text-xs text-stone-300">
      <div class="bg-stone-950 p-3 rounded-lg border border-stone-800"><span class="text-amber-400">X-AI-API-KEY:</span> &lt;YOUR_API_KEY&gt;</div>
      <div class="bg-stone-950 p-3 rounded-lg border border-stone-800"><span class="text-amber-400">Authorization:</span> Bearer &lt;YOUR_API_KEY&gt;</div>
    </div>
  </div>

  <!-- 4. Tool Annotations & Safety -->
  <div class="space-y-3">
    <h3 class="text-lg font-bold text-white">4. Supported Tools & Security Controls</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">get_menu_items</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">readOnlyHint: true</span>
        </div>
        <p class="text-stone-400 text-[11px]">Fetch halal food and drink catering items and pricing.</p>
      </div>

      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">calculate_catering_estimate</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">readOnlyHint: true</span>
        </div>
        <p class="text-stone-400 text-[11px]">Calculate cost estimate in MYR by guest headcount and meals.</p>
      </div>

      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">check_order_status</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">readOnlyHint: true</span>
        </div>
        <p class="text-stone-400 text-[11px]">Status lookup with strict 4-digit phone verification, PII masking & 3-strike lockout.</p>
      </div>

      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">get_calendar_availability</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">readOnlyHint: true</span>
        </div>
        <p class="text-stone-400 text-[11px]">Targeted date query and daily workload capacity summary.</p>
      </div>

      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1 sm:col-span-2">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">submit_catering_inquiry</span>
          <div class="flex gap-1.5">
            <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">readOnlyHint: false</span>
            <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">idempotentHint: false</span>
          </div>
        </div>
        <p class="text-stone-400 text-[11px]">Submit new catering inquiry. Protected by per-client IP rate limit (5 submissions per 15 min).</p>
      </div>
    </div>
  </div>

  <footer class="border-t border-stone-800 pt-6 text-center text-xs text-stone-500">
    Restoran Wawasan Pak Usop &copy; 2026. Halal Catering MCP Server v1.3.10.
  </footer>
</body>
</html>`;

  return res.type('text/html').send(html);
});

// POST /api/mcp/call - Direct HTTP Tool Call (Finding 6 & 7 Fix)
router.post('/call', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
  }

  try {
    const { name, arguments: args = {} } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Tool "name" is required in request body.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown_ip').split(',')[0].trim();

    if (name === 'get_menu_items') {
      const result = await executeGetMenuItems(args);
      return res.json({ success: true, result });
    }
    if (name === 'calculate_catering_estimate') {
      const result = await executeCalculateEstimate(args);
      return res.json({ success: true, result });
    }
    if (name === 'check_order_status') {
      const result = await executeCheckOrderStatus(args);
      return res.json({ success: true, result });
    }
    if (name === 'get_calendar_availability') {
      const result = await executeGetCalendarAvailability(args);
      return res.json({ success: true, result });
    }
    if (name === 'submit_catering_inquiry') {
      const result = await executeSubmitInquiry(args, clientIp);
      return res.json({ success: true, result });
    }

    return res.status(404).json({
      error: `Unknown tool '${name}'.`,
      supportedTools: [
        'get_menu_items',
        'calculate_catering_estimate',
        'check_order_status',
        'get_calendar_availability',
        'submit_catering_inquiry'
      ]
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

// GET /api/mcp/openapi.json & /api/docs/openapi.json
const getOpenApiSpec = (hostUrl: string) => ({
  openapi: '3.0.3',
  info: {
    title: 'Restoran Wawasan Pak Usop - AI & MCP API',
    description: 'Complete OpenAPI 3.0 specification for Restoran Wawasan Pak Usop Halal Catering.',
    version: '1.3.10'
  },
  servers: [{ url: hostUrl }],
  paths: {
    '/api/mcp/sse': {
      get: {
        summary: 'Connect to MCP Server SSE Stream',
        description: 'Server-Sent Events endpoint for Claude Desktop and mcp-remote clients.'
      }
    },
    '/api/mcp/tools': {
      get: {
        summary: 'List MCP Tools',
        description: 'Returns available function calling schemas.'
      }
    },
    '/api/mcp/call': {
      post: {
        summary: 'Execute MCP Tool',
        description: 'Direct tool execution endpoint.'
      }
    }
  }
});

router.get('/openapi.json', (req: Request, res: Response) => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return res.json(getOpenApiSpec(`${protocol}://${host}`));
});

export default router;
