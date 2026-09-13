# Wawasan MCP — Claude OAuth replacement

This is the **replacement package** for the temporary bearer-token MCP deployment.
It adds a remote MCP endpoint with OAuth authorization backed by the existing Wawasan Firebase Authentication and Firestore setup.

## Architecture

```text
Claude
  │ OAuth 2.1 / PKCE
  ▼
https://restoran-wawasan-bio.onrender.com/oauth/*
  │ Firebase Authentication
  ▼
Wawasan Express backend
  │
  ├── /mcp  ← MCP Streamable HTTP
  └── Firebase / Firestore
```

The Android APK does **not** need to become an MCP server.

## What is included

Replace these files in the existing Wawasan project:

- `package.json`
- `server.ts`
- `.env.example`
- `server/mcp/auth.ts`
- `server/mcp/index.ts`
- `server/mcp/server.ts`
- `server/mcp/tools.ts`

## OAuth implementation

The package provides:

- OAuth Protected Resource Metadata at both the root and path-aware well-known locations.
- OAuth Authorization Server Metadata.
- Authorization Code flow with PKCE S256.
- Resource Indicators: tokens are bound to `https://restoran-wawasan-bio.onrender.com/mcp`.
- Short-lived access tokens and rotating refresh tokens stored as hashes in Firestore.
- Single-use authorization codes.
- Claude Client ID Metadata Document validation.
- Dynamic Client Registration as a backwards-compatible fallback.
- Firebase Authentication email/password login for the authorization screen.
- Existing Wawasan admin authorization using `ADMIN_EMAIL` / `ADMIN_EMAILS` or the Firebase `admin` custom claim.
- No passwords stored in Wawasan.
- Read-only MCP tools only.

## Render environment

Keep the existing Firebase Admin and Wawasan environment variables.
Add:

```env
MCP_OAUTH_ISSUER=https://restoran-wawasan-bio.onrender.com
FIREBASE_API_KEY=your_firebase_web_api_key
```

`FIREBASE_API_KEY` is the Firebase **web API key**, not a service-account private key. The OAuth login page sends the entered password directly to Firebase Authentication over HTTPS and uses the returned Firebase ID token only for server-side verification.

The old `MCP_ACCESS_TOKEN` is not used by this replacement and can be removed after the OAuth deployment is confirmed.

## Build

Use the project's normal Render build command:

```bash
npm install --include=dev
npm run build
```

Start command:

```bash
npm start
```

## Verify before connecting Claude

These endpoints should return HTTP 200 JSON:

```text
https://restoran-wawasan-bio.onrender.com/.well-known/oauth-protected-resource
https://restoran-wawasan-bio.onrender.com/.well-known/oauth-protected-resource/mcp
https://restoran-wawasan-bio.onrender.com/.well-known/oauth-authorization-server
```

Opening the MCP endpoint without an access token should return HTTP 401 and a `WWW-Authenticate` header containing the protected-resource metadata URL and `scope="wawasan.read"`. That is expected.

## Claude Custom Connector

Use:

- Name: `Wawasan`
- URL: `https://restoran-wawasan-bio.onrender.com/mcp`
- Authentication: `Sign in now`
- OAuth client: `Use Claude's published identity`

Claude's hosted callback is:

```text
https://claude.ai/api/mcp/auth_callback
```

The Wawasan authorization page will ask for the existing Firebase account credentials. Only accounts authorized as Wawasan administrators are accepted.

## MCP tools

- `get_menu`
- `get_order`
- `list_orders`
- `get_sales_summary`
- `get_calendar_events`

No write tools are exposed.
