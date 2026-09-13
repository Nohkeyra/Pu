# MCP OAuth replacement — change summary

## Server integration

- Mounted the Wawasan MCP endpoint at `/mcp`.
- Mounted OAuth discovery and authorization endpoints before the SPA fallback.
- Added URL-encoded request parsing required by OAuth token/form requests.
- Added rate limits to `/oauth/*` and `/mcp`.

## OAuth endpoints

- `GET /.well-known/oauth-protected-resource`
- `GET /.well-known/oauth-protected-resource/mcp`
- `GET /.well-known/oauth-authorization-server`
- `GET /oauth/authorize`
- `POST /oauth/authorize/login`
- `POST /oauth/token`
- `POST /oauth/register`
- `POST /oauth/revoke`
- `POST /mcp`

## Security properties

- PKCE S256 required.
- Exact Claude redirect URI validation.
- Claude/Anthropic Client ID Metadata Document host allowlist.
- Client metadata `client_id` and redirect URI validation.
- Resource indicator validation.
- Access tokens are stored only as SHA-256 hashes.
- Authorization codes are single-use.
- Refresh tokens rotate on redemption.
- Access tokens are audience/resource-bound to `/mcp`.
- Firebase ID tokens are verified server-side before an authorization code is issued.

## Firebase identity

This implementation uses the Wawasan project's existing Firebase Authentication email/password sign-in as the identity source. It does not require a new third-party identity provider configuration.
