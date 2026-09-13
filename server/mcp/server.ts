import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { MCP_TOOLS, executeMcpTool } from './tools.js';

export const MCP_SERVER_NAME = 'wawasan';
export const MCP_SERVER_VERSION = '2.0.0';

export function createWawasanMcpHandler() {
  return createMcpHandler(({ authInfo }) => {
    const scopes = authInfo?.scopes || [];
    const server = new McpServer(
      { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      {
        capabilities: { tools: {} },
        instructions: 'Wawasan Hub admin tools. Read tools retrieve current Firestore data. Write tools can change order status, bill orders, generate invoices, and send invoice email. Only perform write actions when the user explicitly asks for them.',
      },
    );

    for (const tool of MCP_TOOLS) {
      // The current OAuth scope is vendor-neutral and already represents an
      // authenticated Wawasan administrator. Keep the filter here so future
      // scoped tokens can be introduced without changing tool code.
      if (tool.readOnly || scopes.includes('wawasan')) {
        server.registerTool(tool.name, {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.readOnly
            ? { readOnlyHint: true, openWorldHint: false }
            : { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        }, async (args: Record<string, any>) => executeMcpTool(tool.name, args, { scopes }));
      }
    }
    return server;
  });
}
