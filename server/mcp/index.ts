import type { Express } from 'express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { mcpBearerAuth, mountMcpOAuth } from './auth.js';
import { createWawasanMcpHandler } from './server.js';

export function mountWawasanMcp(app: Express): void {
  mountMcpOAuth(app);
  const handler = createWawasanMcpHandler();
  const nodeHandler = toNodeHandler(handler);
  app.all('/mcp', mcpBearerAuth, (req, res) => {
    void nodeHandler(req, res, req.body);
  });
}
