import type { Express } from 'express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { mcpBearerAuth } from './auth.js';
import { createWawasanMcpHandler } from './server.js';

export function mountWawasanMcp(app: Express): void {
  const handler = createWawasanMcpHandler();
  const nodeHandler = toNodeHandler(handler);
  app.all('/mcp', mcpBearerAuth, (req, res) => {
    void nodeHandler(req, res, req.body);
  });
}
