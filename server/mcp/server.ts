import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { MCP_TOOLS, executeMcpTool } from './tools.js';

export const MCP_SERVER_NAME = 'wawasan';
export const MCP_SERVER_VERSION = '1.0.0';

export function createWawasanMcpHandler() {
  return createMcpHandler(() => {
    const server = new McpServer(
      { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      { capabilities: { tools: {} } },
    );
    for (const tool of MCP_TOOLS) {
      server.registerTool(tool.name, {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }, async (args: Record<string, any>) => executeMcpTool(tool.name, args));
    }
    return server;
  });
}
