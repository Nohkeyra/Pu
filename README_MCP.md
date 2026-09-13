# Wawasan MCP integration

Copy these files into the Wawasan project at the same paths.

## Included

- `server/mcp/auth.ts`
- `server/mcp/index.ts`
- `server/mcp/server.ts`
- `server/mcp/tools.ts`
- `server.ts` — MCP mount already added
- `package.json` — MCP SDK/Zod dependencies already added
- `.env.example`

## Deploy

Run `npm install`, then deploy normally to Render.

MCP endpoint:
`https://restoran-wawasan-bio.onrender.com/mcp`

Current tools are read-only:
- `get_menu`
- `get_order`
- `list_orders`
- `get_sales_summary`
- `get_calendar_events`

## Authentication

For initial protocol testing, leave `MCP_ACCESS_TOKEN` unset.

The included bearer middleware is for direct testing. Claude Custom Connectors are designed around OAuth, so this should be replaced/extended with MCP OAuth before exposing private business data publicly.
