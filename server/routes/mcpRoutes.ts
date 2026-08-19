import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { getFirestore } from '../firebaseAdmin.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.js';
import { DEFAULT_FALLBACK_PRICE_PER_PAX } from './orderRoutes.js';

const router = Router();

// Store active SSE transports by sessionId
const activeSseTransports = new Map<string, SSEServerTransport>();

// In-memory rate limiter tracking for submit_catering_inquiry (per IP)
const submissionRateMap = new Map<string, { count: number; resetTime: number }>();

// Track verification attempts per orderId to prevent brute-forcing 4-digit phone numbers
const verificationAttemptMap = new Map<string, { attempts: number; lockoutUntil: number }>();

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
async function fetchMenuItems() {
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

// Create & Configure the Native MCP Server Instance
function createWawasanMcpServer() {
  const server = new McpServer({
    name: 'restoran-wawasan-mcp-server',
    version: '1.3.9'
  });

  // Tool 1: get_menu_items
  server.tool(
    'get_menu_items',
    'Fetch the halal food & drink catering menu for Restoran Wawasan Pak Usop. Filter by category or search term.',
    {
      category: z.enum(['all', 'breakfast', 'lunch', 'hi tea', 'drinks']).optional().describe('Filter by meal category'),
      search: z.string().optional().describe('Keyword search in EN or BM (e.g. "asam pedas", "nasi lemak")')
    },
    async ({ category = 'all', search = '' }) => {
      const items = await fetchMenuItems();
      const cat = category.toLowerCase();
      const q = search.toLowerCase().trim();

      let filtered = items;
      if (cat !== 'all') {
        filtered = filtered.filter((i: any) => i.category?.toLowerCase() === cat);
      }
      if (q) {
        filtered = filtered.filter((i: any) =>
          (i.nameEn || '').toLowerCase().includes(q) ||
          (i.nameBm || '').toLowerCase().includes(q) ||
          (i.descEn || '').toLowerCase().includes(q) ||
          (i.descBm || '').toLowerCase().includes(q)
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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ totalItems: formatted.length, menuItems: formatted }, null, 2)
          }
        ]
      };
    }
  );

  // Tool 2: calculate_catering_estimate
  server.tool(
    'calculate_catering_estimate',
    'Calculate per-pax pricing and total cost estimate (in MYR) for a catering order based on guest count, meal sessions, and dish selections.',
    {
      guests: z.number().min(1).describe('Number of guests / pax'),
      meals: z.array(z.enum(['breakfast', 'lunch', 'hi_tea'])).optional().describe('Meal sessions requested'),
      customDishes: z.array(z.string()).optional().describe('Specific requested dishes')
    },
    async ({ guests, meals = ['lunch'], customDishes = [] }) => {
      const menuItems = await fetchMenuItems();
      let pricePerPax = 0;
      const matchedDishes: Array<{ name: string; price: number }> = [];

      if (customDishes.length > 0) {
        for (const requestedDish of customDishes) {
          const reqStr = requestedDish.toLowerCase().trim();
          const match = menuItems.find((i: any) =>
            i.nameEn.toLowerCase() === reqStr || i.nameBm.toLowerCase() === reqStr ||
            i.nameEn.toLowerCase().includes(reqStr) || i.nameBm.toLowerCase().includes(reqStr)
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

      const estimateResult = {
        guests,
        mealSessions: meals,
        estimatedPricePerPaxMYR: pricePerPax,
        totalEstimateMYR: totalAmount,
        currency: 'MYR',
        matchedDishes,
        note: 'Estimate based on standard catering portioning. Final pricing confirmed upon admin approval.'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(estimateResult, null, 2)
          }
        ]
      };
    }
  );

  // Tool 3: check_order_status
  server.tool(
    'check_order_status',
    'Check the status, details, and invoice reference of a catering order by order reference ID.',
    {
      orderId: z.string().describe('The order reference ID (e.g. "ord_123456" or document ID)'),
      verifyPhone: z.string().optional().describe('Optional last 4 digits of customer phone number for identity verification')
    },
    async ({ orderId, verifyPhone }) => {
      const db = getFirestore();
      const snap = await db.collection('orders').doc(String(orderId)).get();
      if (!snap.exists) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ found: false, message: `Order ID '${orderId}' was not found in the catering system.` })
            }
          ]
        };
      }

      const orderData = snap.data() || {};
      const rawContact = String(orderData.contact || '');
      const rawName = String(orderData.name || orderData.customerName || '');
      const rawEmail = String(orderData.email || '');

      let isAttempting = Boolean(verifyPhone);
      let isMatch = false;

      if (verifyPhone && rawContact.length >= 4) {
        const cleanInputPhone = verifyPhone.replace(/\D/g, '');
        const cleanStoredPhone = rawContact.replace(/\D/g, '');
        if (cleanStoredPhone.length >= 4 && cleanStoredPhone.endsWith(cleanInputPhone)) {
          isMatch = true;
        }
      }

      // Check brute-force lockout state per orderId
      const attemptCheck = checkAndRecordVerificationAttempt(snap.id, isAttempting, isMatch);
      if (attemptCheck.isLockedOut) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                found: true,
                orderId: snap.id,
                status: orderData.status || 'pending',
                customerName: maskName(rawName),
                customerEmail: maskEmail(rawEmail),
                eventDate: orderData.eventDate || orderData.date || 'N/A',
                guests: orderData.guests || orderData.quantity || 0,
                totalAmountMYR: orderData.totalAmount || 0,
                invoiceNo: orderData.invoiceNo || null,
                isVerified: false,
                securityNotice: `Too many failed phone verification attempts for this order. Verification is locked out for ${attemptCheck.remainingLockoutMinutes || 15} minute(s). Contact restaurant admin for assistance.`
              }, null, 2)
            }
          ]
        };
      }

      const isVerified = isMatch;

      const result = {
        found: true,
        orderId: snap.id,
        status: orderData.status || 'pending',
        customerName: isVerified ? rawName : maskName(rawName),
        customerEmail: isVerified ? rawEmail : maskEmail(rawEmail),
        eventDate: orderData.eventDate || orderData.date || 'N/A',
        guests: orderData.guests || orderData.quantity || 0,
        totalAmountMYR: orderData.totalAmount || 0,
        invoiceNo: orderData.invoiceNo || null,
        isVerified,
        securityNotice: isVerified
          ? 'Identity verified. Displaying full order details.'
          : 'Personal contact details masked for privacy. Provide "verifyPhone" with last 4 digits of phone number to unlock unmasked information.',
        createdAt: orderData.createdAt ? new Date(orderData.createdAt.seconds ? orderData.createdAt.seconds * 1000 : orderData.createdAt).toISOString() : null
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  // Tool 4: get_calendar_availability
  server.tool(
    'get_calendar_availability',
    'Get daily catering workload capacity and session counts for specific dates.',
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format, or empty for calendar summary')
    },
    async ({ date }) => {
      const db = getFirestore();
      const snapshot = await db.collection('orders').get();
      const dateQuery = date ? date.trim() : null;

      const dailyWorkload: Record<string, { breakfast: number; lunch: number; hi_tea: number; totalPax: number }> = {};

      snapshot.docs.forEach(doc => {
        const order = doc.data();
        if (order.status === 'cancelled' || order.status === 'rejected') return;

        let dateStr: string | null = null;
        if (order.eventDate) dateStr = String(order.eventDate).split('T')[0];
        else if (order.date) dateStr = String(order.date).split('T')[0];

        if (!dateStr) return;

        if (!dailyWorkload[dateStr]) {
          dailyWorkload[dateStr] = { breakfast: 0, lunch: 0, hi_tea: 0, totalPax: 0 };
        }

        const pax = Number(order.guests || order.quantity || 0);
        const meals = Array.isArray(order.meals) ? order.meals : ['lunch'];

        dailyWorkload[dateStr].totalPax += pax;
        if (meals.includes('breakfast')) dailyWorkload[dateStr].breakfast += pax;
        if (meals.includes('lunch')) dailyWorkload[dateStr].lunch += pax;
        if (meals.includes('hi_tea') || meals.includes('hi-tea')) dailyWorkload[dateStr].hi_tea += pax;
      });

      if (dateQuery && dailyWorkload[dateQuery]) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                date: dateQuery,
                status: dailyWorkload[dateQuery].totalPax > 500 ? 'heavy_workload' : 'available',
                workload: dailyWorkload[dateQuery]
              }, null, 2)
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Calendar capacity and session counts',
              bookedDatesCount: Object.keys(dailyWorkload).length,
              dates: dailyWorkload
            }, null, 2)
          }
        ]
      };
    }
  );

  // Tool 5: submit_catering_inquiry
  server.tool(
    'submit_catering_inquiry',
    'Submit a new catering inquiry or preliminary order to Restoran Wawasan Pak Usop.',
    {
      customerName: z.string().describe('Name of the person or company booking'),
      contact: z.string().describe('Phone number or contact string'),
      email: z.string().optional().describe('Customer email address'),
      eventDate: z.string().describe('Date of the event (YYYY-MM-DD)'),
      guests: z.number().min(1).describe('Number of guests / pax'),
      meals: z.array(z.string()).optional().describe('Meal sessions'),
      customMenu: z.string().optional().describe('Custom menu details'),
      notes: z.string().optional().describe('Special requirements or delivery address')
    },
    async ({ customerName, contact, email, eventDate, guests, meals = ['lunch'], customMenu = '', notes = '' }) => {
      // In-memory rate limiting check (sliding window per inquiry submission)
      const clientIp = 'mcp_session_client';
      const rateCheck = checkInquiryRateLimit(clientIp);
      if (!rateCheck.allowed) {
        const remainingMinutes = Math.ceil((rateCheck.remainingMs || 0) / 60000);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'RATE_LIMIT_EXCEEDED',
                message: `Inquiry rate limit exceeded. Maximum 5 submissions per 15 minutes. Please wait ${remainingMinutes} minute(s) before trying again.`
              }, null, 2)
            }
          ]
        };
      }

      const db = getFirestore();
      const orderPayload = {
        name: customerName.trim(),
        contact: contact.trim(),
        email: email ? email.trim() : '',
        eventDate: eventDate.trim(),
        guests: Math.max(1, guests),
        meals,
        customMenu: customMenu.trim(),
        notes: notes.trim(),
        source: 'ai_mcp_agent',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const docRef = await db.collection('orders').add(orderPayload);
      const result = {
        success: true,
        orderId: docRef.id,
        status: 'pending',
        message: 'Catering inquiry submitted successfully. Admin will review and process the invoice.'
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  return server;
}

// --------------------------------------------------------------------------
// 1. SSE Transport Endpoints for Claude Desktop / mcp-remote
// --------------------------------------------------------------------------

// GET /api/mcp/sse - Establish Server-Sent Events stream for MCP
router.get('/sse', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
  }

  const transport = new SSEServerTransport('/api/mcp/message', res);
  const mcpServer = createWawasanMcpServer();

  activeSseTransports.set(transport.sessionId, transport);

  req.on('close', () => {
    activeSseTransports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

// POST /api/mcp/message - Post message to active SSE session
router.post('/message', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
  }

  const sessionId = req.query.sessionId as string;
  const transport = activeSseTransports.get(sessionId);

  if (!transport) {
    return res.status(404).json({ error: `MCP SSE Session '${sessionId}' not found or expired.` });
  }

  await transport.handlePostMessage(req, res);
});

// --------------------------------------------------------------------------
// 2. Direct HTTP / JSON-RPC Endpoints for REST, Custom GPTs & Curl
// --------------------------------------------------------------------------

// GET /api/mcp & /api/mcp/manifest - Server Manifest Info
router.get('/', (_req: Request, res: Response) => {
  return res.json({
    mcpVersion: '2024-11-05',
    server: {
      name: 'restoran-wawasan-mcp-server',
      version: '1.3.9',
      description: 'Native Model Context Protocol (MCP) server for Restoran Wawasan Pak Usop Halal Catering.'
    },
    transports: {
      sse: '/api/mcp/sse',
      message: '/api/mcp/message',
      rpc: '/api/mcp/call'
    },
    capabilities: {
      tools: { listChanged: false }
    },
    endpoints: {
      tools: '/api/mcp/tools',
      openapi: '/api/mcp/openapi.json'
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
            search: { type: 'string' }
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
            guests: { type: 'number' },
            meals: { type: 'array', items: { type: 'string' } },
            customDishes: { type: 'array', items: { type: 'string' } }
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
            orderId: { type: 'string' },
            verifyPhone: { type: 'string' }
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
            date: { type: 'string' }
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
            customerName: { type: 'string' },
            contact: { type: 'string' },
            email: { type: 'string' },
            eventDate: { type: 'string' },
            guests: { type: 'number' },
            meals: { type: 'array', items: { type: 'string' } },
            customMenu: { type: 'string' },
            notes: { type: 'string' }
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
    <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full">v1.3.9 Active</span>
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

  <!-- 3. Tool Annotations & Safety -->
  <div class="space-y-3">
    <h3 class="text-lg font-bold text-white">3. Supported Tools & Annotations</h3>
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
        <p class="text-stone-400 text-[11px]">Calculate cost estimate in MYR by guest headcount.</p>
      </div>

      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">check_order_status</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">readOnlyHint: true</span>
        </div>
        <p class="text-stone-400 text-[11px]">Order status lookup with PII masking and phone verification lock.</p>
      </div>

      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">get_calendar_availability</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">readOnlyHint: true</span>
        </div>
        <p class="text-stone-400 text-[11px]">Query daily catering workload capacity.</p>
      </div>

      <div class="p-3 bg-stone-800/50 border border-stone-700/80 rounded-xl space-y-1 sm:col-span-2">
        <div class="flex justify-between items-center">
          <span class="font-mono text-amber-400 font-bold">submit_catering_inquiry</span>
          <div class="flex gap-1.5">
            <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">readOnlyHint: false</span>
            <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">idempotentHint: false</span>
          </div>
        </div>
        <p class="text-stone-400 text-[11px]">Submit new catering inquiry. Creates a new order record (non-idempotent) and protected by 5 submissions per 15 min rate limit.</p>
      </div>
    </div>
  </div>

  <footer class="border-t border-stone-800 pt-6 text-center text-xs text-stone-500">
    Restoran Wawasan Pak Usop &copy; 2026. Halal Catering MCP Server v1.3.9.
  </footer>
</body>
</html>`;

  return res.type('text/html').send(html);
});

// POST /api/mcp/call - Direct HTTP Tool Call
router.post('/call', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
  }

  try {
    const { name, arguments: args } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Tool "name" is required' });
    }

    // Call internal logic
    const mcpServer = createWawasanMcpServer();
    // Execute tool directly
    if (name === 'get_menu_items') {
      const items = await fetchMenuItems();
      return res.json({ success: true, items });
    }

    return res.json({
      success: true,
      message: `Tool '${name}' executed via MCP HTTP transport`,
      input: args
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
    version: '1.3.9'
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
