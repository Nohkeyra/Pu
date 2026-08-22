import { Router, type Request, type Response } from 'express';
import {
  mcpTransport,
  mcpContextStorage,
  executeGetMenuItems,
  executeCalculateEstimate,
  executeCheckOrderStatus,
  executeGetCalendarAvailability,
  executeSubmitInquiry
} from '../mcpServer.js';

const router = Router();

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

// Add this at the very top of mcpRoutes.ts, before any other routes
router.all('/', (req: Request, res: Response) => {
  const accept = req.headers.accept || '';

  // Handle both POST requests and GET text/event-stream connection requests for Streamable HTTP transport
  if (req.method === 'POST' || accept.includes('text/event-stream')) {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown_ip').split(',')[0].trim();
    return mcpContextStorage.run({ clientIp }, () => {
      mcpTransport.handleRequest(req, res, req.body);
    });
  }

  // Otherwise, fallback to a clean discovery endpoint
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  return res.status(200).json({
    status: 'ok',
    service: 'Wawasan Hub MCP',
    auth_required: false,
    auth_type: 'none',
    endpoints: {
      mcp: `${baseUrl}/api/mcp`,
      health: `${baseUrl}/api/health`,
      tools: `${baseUrl}/api/mcp/tools`
    },
    message: 'Wawasan Hub MCP server operates in no-auth mode'
  });
});

// Public health route for MCP connectors and health checkers
router.get(['/health', '/healthz'], (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    service: 'Wawasan Hub MCP',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// Direct HTTP / JSON-RPC Endpoints for REST, Custom GPTs & Claude Connectors
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
      url: `${baseUrl}/api/mcp`,
      mcp_version: '2025-03-26'
    },
    mcpVersion: '2025-03-26',
    transport: 'http',
    endpoints: {
      mcp: `${baseUrl}/api/mcp`,
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
router.use(['/oauth-protected-resource*'], (req: Request, res: Response) => {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  return res.status(200).json({
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [],
    scopes_supported: [],
    bearer_methods_supported: [],
    auth_required: false,
    auth_type: 'none',
    message: 'Wawasan Hub MCP server operates in no-auth mode. No sign-in required.'
  });
});

// GET /manifest - Server Manifest Info
router.get('/manifest', (req: Request, res: Response) => {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  return res.json({
    mcpVersion: '2025-03-26',
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
      mcp: `${baseUrl}/api/mcp`,
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
  const mcpUrl = `${baseUrl}/api/mcp`;

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
      <span class="text-xs font-bold uppercase tracking-wider text-amber-500">MCP Protocol 2025-03-26</span>
      <h1 class="text-2xl sm:text-3xl font-extrabold text-white mt-1">Restoran Wawasan MCP Server</h1>
      <p class="text-stone-400 text-sm mt-1">Self-configuration guide for Claude Desktop, Claude Code & AI Agents</p>
    </div>
    <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full">v1.3.10 Active</span>
  </div>

  <!-- Streamable HTTP Endpoint Card -->
  <div class="bg-stone-800/80 border border-stone-700 rounded-2xl p-6 space-y-3">
    <h2 class="text-base font-bold text-white flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
      Streamable HTTP Endpoint (Latest spec)
    </h2>
    <p class="text-xs text-stone-300">Use this endpoint URL to connect your MCP clients:</p>
    <div class="bg-stone-950 p-3.5 rounded-xl border border-stone-800 font-mono text-xs text-emerald-300 break-all select-all">
      ${mcpUrl}
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
        "--transport",
        "http",
        "${mcpUrl}"
      ]
    }
  }
}</pre>
  </div>

  <!-- 2. Claude Code CLI -->
  <div class="space-y-3">
    <h3 class="text-lg font-bold text-white">2. Claude Code CLI Command</h3>
    <p class="text-xs text-stone-400">To quickly connect from Claude Code, execute:</p>
    <pre class="bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-emerald-300 overflow-x-auto">claude mcp add restoran-wawasan npx -y mcp-remote --transport http ${mcpUrl}</pre>
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

  <!-- 4. Supported Tools & Safety -->
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
    '/api/mcp': {
      post: {
        summary: 'Connect to MCP Server Streamable HTTP JSON-RPC endpoint',
        description: 'Post JSON-RPC messages and establish streaming connection.'
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
