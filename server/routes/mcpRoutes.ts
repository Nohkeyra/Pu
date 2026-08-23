import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
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

// SECURITY FIX: Added rate limiter to MCP direct HTTP call endpoint
const mcpCallLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many MCP tool calls. Please try again later.' },
});

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

router.all('/', (req: Request, res: Response) => {
  const accept = req.headers.accept || '';

  if (req.method === 'POST' || accept.includes('text/event-stream')) {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-AI-API-KEY' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown_ip').split(',')[0].trim();
    return mcpContextStorage.run({ clientIp }, () => {
      mcpTransport.handleRequest(req, res, req.body);
    });
  }

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

router.get(['/health', '/healthz'], (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    service: 'Wawasan Hub MCP',
    timestamp: new Date().toISOString()
  });
});

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

router.use(['/oauth-authorization-server*', '/openid-configuration*'], (_req: Request, res: Response) => {
  return res.status(200).json({
    auth_required: false,
    auth_type: 'none',
    authorization_servers: [],
    message: 'Wawasan Hub MCP server operates in no-auth mode. No sign-in required.'
  });
});

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
            email: { type: 'string', format: 'email', maxLength: 100 },
            phone: { type: 'string', maxLength: 20 },
            eventDate: { type: 'string', maxLength: 20 },
            guests: { type: 'number', minimum: 1, maximum: 10000 },
            location: { type: 'string', maxLength: 200 },
            meals: { type: 'array', items: { type: 'string', enum: ['breakfast', 'lunch', 'hi_tea'] } },
            customMenu: { type: 'string', maxLength: 500 }
          },
          required: ['customerName', 'eventDate', 'guests']
        }
      }
    ]
  });
});

// SECURITY FIX: Added mcpCallLimiter rate limiter to the /call endpoint
router.post('/call', mcpCallLimiter, async (req: Request, res: Response) => {
  const { tool, args } = req.body || {};

  if (!tool || typeof tool !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "tool" parameter' });
  }

  try {
    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown_ip').split(',')[0].trim();

    let result: any;
    switch (tool) {
      case 'get_menu_items':
        result = await mcpContextStorage.run({ clientIp }, () => executeGetMenuItems(args || {}));
        break;
      case 'calculate_catering_estimate':
        result = await mcpContextStorage.run({ clientIp }, () => executeCalculateEstimate(args || {}));
        break;
      case 'check_order_status':
        result = await mcpContextStorage.run({ clientIp }, () => executeCheckOrderStatus(args || {}));
        break;
      case 'get_calendar_availability':
        result = await mcpContextStorage.run({ clientIp }, () => executeGetCalendarAvailability(args || {}));
        break;
      case 'submit_catering_inquiry':
        result = await mcpContextStorage.run({ clientIp }, () => executeSubmitInquiry(args || {}, clientIp));
        break;
      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    return res.json({ success: true, result });
  } catch (err: any) {
    console.error(`[MCP Tool Error] ${tool}:`, err);
    return res.status(500).json({ success: false, error: err?.message || 'Tool execution failed' });
  }
});

router.get('/openapi.json', (_req: Request, res: Response) => {
  return res.json({
    openapi: '3.1.0',
    info: {
      title: 'Restoran Wawasan Pak Usop - MCP API',
      version: '1.3.10',
      description: 'Native Model Context Protocol (MCP) server for Restoran Wawasan Pak Usop Halal Catering.'
    },
    servers: [{ url: 'https://restoran-wawasan-bio.onrender.com', description: 'Production' }],
    paths: {
      '/api/mcp': {
        get: {
          summary: 'MCP Server Discovery',
          responses: {
            '200': { description: 'MCP server discovery JSON' }
          }
        }
      },
      '/api/mcp/tools': {
        get: {
          summary: 'List Available MCP Tools',
          responses: {
            '200': { description: 'List of available tools' }
          }
        }
      },
      '/api/mcp/call': {
        post: {
          summary: 'Execute MCP Tool',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tool: { type: 'string', description: 'Tool name to execute' },
                    args: { type: 'object', description: 'Tool arguments' }
                  },
                  required: ['tool']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Tool execution result' }
          }
        }
      }
    }
  });
});

export default router;
