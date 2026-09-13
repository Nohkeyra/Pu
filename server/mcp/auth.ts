import type { NextFunction, Request, Response } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getFirestore } from '../firebaseAdmin.js';

export const MCP_SCOPE = 'wawasan.read';
export const MCP_ACCESS_TOKEN_TTL_SECONDS = 3600;
export const MCP_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_TRANSACTION_TTL_MS = 10 * 60_000;
const OAUTH_CODE_TTL_MS = 5 * 60_000;
const CIMD_TIMEOUT_MS = 5_000;
const CLAUDE_REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

function normalizeIssuer(value: string): string {
  return value.replace(/\/$/, '');
}

function isHttpsHost(hostname: string, exact: string): boolean {
  return hostname === exact || hostname.endsWith(`.${exact}`);
}

function isTrustedClaudeHost(hostname: string): boolean {
  return isHttpsHost(hostname, 'claude.ai')
    || isHttpsHost(hostname, 'claude.com')
    || isHttpsHost(hostname, 'anthropic.com');
}

function safeRedirectUri(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && value === CLAUDE_REDIRECT_URI;
  } catch {
    return false;
  }
}

function isAllowedScope(scope: string): boolean {
  return scope.split(/\s+/).filter(Boolean).every(value => value === MCP_SCOPE);
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getMcpIssuer(req: Request): string {
  const configured = process.env.MCP_OAUTH_ISSUER?.trim();
  if (configured) return normalizeIssuer(configured);

  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
    .split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '')
    .split(',')[0].trim();

  if (!host) throw new Error('MCP OAuth issuer cannot be determined. Set MCP_OAUTH_ISSUER.');
  return normalizeIssuer(`${proto}://${host}`);
}

export function protectedResourceMetadata(issuer: string) {
  const normalized = normalizeIssuer(issuer);
  return {
    resource: `${normalized}/mcp`,
    authorization_servers: [normalized],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'Wawasan MCP',
  };
}

export function authorizationServerMetadata(issuer: string) {
  const normalized = normalizeIssuer(issuer);
  return {
    issuer: normalized,
    authorization_endpoint: `${normalized}/oauth/authorize`,
    token_endpoint: `${normalized}/oauth/token`,
    revocation_endpoint: `${normalized}/oauth/revoke`,
    registration_endpoint: `${normalized}/oauth/register`,
    scopes_supported: [MCP_SCOPE],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    client_id_metadata_document_supported: true,
  };
}

async function verifyAdminIdToken(idToken: string) {
  const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
  const email = decoded.email?.toLowerCase();
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (decoded.admin === true || (!!email && allowed.includes(email))) {
    return decoded;
  }

  throw new Error('This Firebase account is not authorized for Wawasan MCP.');
}

async function firebasePasswordLogin(email: string, password: string): Promise<string> {
  const apiKey = (process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '').trim();
  if (!apiKey) throw new Error('FIREBASE_API_KEY is not configured on the server.');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof (body.error as Record<string, unknown> | undefined)?.message === 'string'
      ? String((body.error as Record<string, unknown>).message)
      : 'Firebase sign-in failed.');
  }

  const idToken = String(body.idToken || '');
  if (!idToken) throw new Error('Firebase sign-in did not return an ID token.');
  return idToken;
}

type ClientMetadata = {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
};

function parseClientMetadata(value: unknown): ClientMetadata {
  if (!value || typeof value !== 'object') throw new Error('Invalid OAuth client metadata.');
  const raw = value as Record<string, unknown>;
  if (typeof raw.client_id !== 'string' || !raw.client_id) throw new Error('OAuth client metadata is missing client_id.');
  if (!Array.isArray(raw.redirect_uris) || raw.redirect_uris.some(item => typeof item !== 'string')) {
    throw new Error('OAuth client metadata is missing redirect_uris.');
  }

  return {
    client_id: raw.client_id,
    client_name: typeof raw.client_name === 'string' ? raw.client_name : undefined,
    redirect_uris: raw.redirect_uris as string[],
    grant_types: Array.isArray(raw.grant_types) ? raw.grant_types.filter((x): x is string => typeof x === 'string') : undefined,
    response_types: Array.isArray(raw.response_types) ? raw.response_types.filter((x): x is string => typeof x === 'string') : undefined,
    token_endpoint_auth_method: typeof raw.token_endpoint_auth_method === 'string' ? raw.token_endpoint_auth_method : undefined,
  };
}

async function fetchClientMetadata(clientId: string): Promise<ClientMetadata> {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    throw new Error('OAuth client_id must be an HTTPS URL.');
  }

  if (url.protocol !== 'https:' || !url.pathname || !isTrustedClaudeHost(url.hostname)) {
    throw new Error('Unsupported OAuth client.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CIMD_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`OAuth client metadata returned HTTP ${response.status}.`);
    const metadata = parseClientMetadata(await response.json());
    if (metadata.client_id !== clientId) throw new Error('OAuth client metadata client_id does not match the requested client_id.');
    if (!metadata.redirect_uris.includes(CLAUDE_REDIRECT_URI)) throw new Error('OAuth client metadata does not authorize the Claude callback.');
    if (metadata.grant_types && !metadata.grant_types.includes('authorization_code')) throw new Error('OAuth client does not support authorization_code.');
    if (metadata.response_types && !metadata.response_types.includes('code')) throw new Error('OAuth client does not support response_type=code.');
    if (metadata.token_endpoint_auth_method && metadata.token_endpoint_auth_method !== 'none') throw new Error('OAuth client must use public-client token authentication.');
    return metadata;
  } finally {
    clearTimeout(timer);
  }
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char);
}

export function createMcpOAuthHelpers() {
  const db = getFirestore();
  const now = () => Date.now();

  async function validateClient(clientId: string, redirectUri: string): Promise<void> {
    if (!safeRedirectUri(redirectUri)) throw new Error('Invalid redirect_uri.');

    if (clientId.startsWith('https://')) {
      const metadata = await fetchClientMetadata(clientId);
      if (!metadata.redirect_uris.includes(redirectUri)) throw new Error('redirect_uri is not registered for this client.');
      return;
    }

    const snap = await db.collection('mcp_oauth_clients').doc(sha256(clientId)).get();
    if (!snap.exists) throw new Error('Unknown OAuth client.');
    const client = snap.data() as Record<string, unknown>;
    if (client.redirectUri !== redirectUri) throw new Error('redirect_uri is not registered for this client.');
  }

  async function createAuthorizationTransaction(params: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state?: string;
    scope?: string;
    resource?: string;
    issuer: string;
  }) {
    const scope = params.scope?.trim() || MCP_SCOPE;
    const expectedResource = `${normalizeIssuer(params.issuer)}/mcp`;

    if (!params.codeChallenge) throw new Error('Missing PKCE code_challenge.');
    if (!isAllowedScope(scope)) throw new Error('Unsupported scope.');
    if (params.resource && normalizeIssuer(params.resource) !== expectedResource) throw new Error('Invalid resource.');
    await validateClient(params.clientId, params.redirectUri);

    const id = randomToken();
    await db.collection('mcp_oauth_transactions').doc(sha256(id)).set({
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      scope,
      state: params.state || '',
      resource: expectedResource,
      createdAt: new Date(),
      expiresAt: new Date(now() + OAUTH_TRANSACTION_TTL_MS),
    });
    return id;
  }

  async function completeAuthorization(id: string, email: string, uid: string) {
    const ref = db.collection('mcp_oauth_transactions').doc(sha256(id));
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Authorization session expired.');

    const data = snap.data() as Record<string, any>;
    const expiresAt = data.expiresAt?.toMillis?.() ?? new Date(data.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt < now()) {
      await ref.delete();
      throw new Error('Authorization session expired.');
    }

    await ref.delete();
    const code = randomToken();
    await db.collection('mcp_oauth_codes').doc(sha256(code)).set({
      clientId: data.clientId,
      redirectUri: data.redirectUri,
      codeChallenge: data.codeChallenge,
      scope: data.scope || MCP_SCOPE,
      resource: data.resource,
      uid,
      email,
      createdAt: new Date(),
      expiresAt: new Date(now() + OAUTH_CODE_TTL_MS),
    });

    return { code, redirectUri: data.redirectUri, state: data.state || '' };
  }

  async function issueTokens(uid: string, email: string, clientId: string, scope: string, resource: string) {
    const accessToken = randomToken();
    const refreshToken = randomToken();
    const base = { uid, email, clientId, scope, resource, createdAt: new Date() };

    await db.collection('mcp_oauth_access_tokens').doc(sha256(accessToken)).set({
      ...base,
      expiresAt: new Date(now() + MCP_ACCESS_TOKEN_TTL_SECONDS * 1000),
    });
    await db.collection('mcp_oauth_refresh_tokens').doc(sha256(refreshToken)).set({
      ...base,
      expiresAt: new Date(now() + MCP_REFRESH_TOKEN_TTL_SECONDS * 1000),
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: MCP_ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope,
    };
  }

  async function exchangeCode(code: string, clientId: string, redirectUri: string, verifier: string, resource: string, issuer: string) {
    const ref = db.collection('mcp_oauth_codes').doc(sha256(code));
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Invalid authorization code.');

    const data = snap.data() as Record<string, any>;
    await ref.delete();

    const expiresAt = data.expiresAt?.toMillis?.() ?? new Date(data.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt < now()) throw new Error('Authorization code expired.');
    if (data.clientId !== clientId || data.redirectUri !== redirectUri) throw new Error('OAuth client or redirect_uri mismatch.');

    const expected = createHash('sha256').update(verifier).digest('base64url');
    if (!constantTimeEqual(expected, data.codeChallenge)) throw new Error('PKCE verification failed.');

    const expectedResource = `${normalizeIssuer(issuer)}/mcp`;
    if (normalizeIssuer(resource) !== expectedResource || data.resource !== expectedResource) throw new Error('Invalid resource.');

    return issueTokens(data.uid, data.email, clientId, data.scope || MCP_SCOPE, expectedResource);
  }

  async function refresh(refreshToken: string, clientId: string, resource: string, issuer: string) {
    const ref = db.collection('mcp_oauth_refresh_tokens').doc(sha256(refreshToken));
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Invalid refresh token.');

    const data = snap.data() as Record<string, any>;
    const expiresAt = data.expiresAt?.toMillis?.() ?? new Date(data.expiresAt).getTime();
    const expectedResource = `${normalizeIssuer(issuer)}/mcp`;
    if (!Number.isFinite(expiresAt) || expiresAt < now() || data.clientId !== clientId || data.resource !== expectedResource) {
      throw new Error('Invalid refresh token.');
    }
    if (normalizeIssuer(resource) !== expectedResource) throw new Error('Invalid resource.');

    // Rotate the refresh token after a successful redemption.
    const token = await issueTokens(data.uid, data.email, clientId, data.scope || MCP_SCOPE, expectedResource);
    await ref.delete();
    return token;
  }

  async function verifyAccessToken(token: string, issuer: string) {
    const snap = await db.collection('mcp_oauth_access_tokens').doc(sha256(token)).get();
    if (!snap.exists) return null;

    const data = snap.data() as Record<string, any>;
    const expiresAt = data.expiresAt?.toMillis?.() ?? new Date(data.expiresAt).getTime();
    const expectedResource = `${normalizeIssuer(issuer)}/mcp`;
    if (!Number.isFinite(expiresAt) || expiresAt < now()) return null;
    if (data.resource !== expectedResource) return null;
    if (data.scope !== MCP_SCOPE) return null;
    return data;
  }

  async function revoke(token: string) {
    const hash = sha256(token);
    await db.collection('mcp_oauth_access_tokens').doc(hash).delete().catch(() => undefined);
    await db.collection('mcp_oauth_refresh_tokens').doc(hash).delete().catch(() => undefined);
  }

  async function registerClient(body: unknown, issuer: string) {
    if (!body || typeof body !== 'object') throw new Error('Invalid client registration request.');
    const raw = body as Record<string, unknown>;
    const redirectUris = Array.isArray(raw.redirect_uris) ? raw.redirect_uris : [];
    if (redirectUris.length !== 1 || typeof redirectUris[0] !== 'string' || !safeRedirectUri(redirectUris[0])) {
      throw new Error('Only the Claude MCP callback is supported.');
    }

    const clientId = `wawasan-${randomToken()}`;
    await db.collection('mcp_oauth_clients').doc(sha256(clientId)).set({
      clientId,
      clientName: typeof raw.client_name === 'string' ? raw.client_name.slice(0, 200) : 'MCP client',
      redirectUri: redirectUris[0],
      issuer: normalizeIssuer(issuer),
      createdAt: new Date(),
    });

    return {
      client_id: clientId,
      client_name: typeof raw.client_name === 'string' ? raw.client_name : 'MCP client',
      redirect_uris: [redirectUris[0]],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      client_secret_expires_at: 0,
    };
  }

  return {
    createAuthorizationTransaction,
    completeAuthorization,
    exchangeCode,
    refresh,
    verifyAccessToken,
    revoke,
    registerClient,
    firebasePasswordLogin,
    verifyAdminIdToken,
  };
}

export function mountMcpOAuth(app: import('express').Express): void {
  const helpers = createMcpOAuthHelpers();

  const protectedResourceHandler = (req: Request, res: Response) => {
    res.json(protectedResourceMetadata(getMcpIssuer(req)));
  };
  app.get('/.well-known/oauth-protected-resource', protectedResourceHandler);
  app.get('/.well-known/oauth-protected-resource/mcp', protectedResourceHandler);

  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    res.json(authorizationServerMetadata(getMcpIssuer(req)));
  });

  app.get('/oauth/authorize', async (req, res) => {
    try {
      const issuer = getMcpIssuer(req);
      const clientId = String(req.query.client_id || '');
      const redirectUri = String(req.query.redirect_uri || '');
      const responseType = String(req.query.response_type || '');
      const codeChallenge = String(req.query.code_challenge || '');
      const method = String(req.query.code_challenge_method || '');
      const scope = String(req.query.scope || MCP_SCOPE);
      const state = String(req.query.state || '');
      const resource = String(req.query.resource || `${issuer}/mcp`);

      if (responseType !== 'code' || method !== 'S256') {
        return res.status(400).send('OAuth requires response_type=code and PKCE S256.');
      }

      const tx = await helpers.createAuthorizationTransaction({
        clientId,
        redirectUri,
        codeChallenge,
        state,
        scope,
        resource,
        issuer,
      });

      const clientName = clientId.startsWith('https://') ? 'Claude' : 'MCP client';
      return res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Wawasan MCP sign in</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:440px;margin:0 auto;padding:32px 20px;background:#f7f7f5;color:#1d1d1b}
main{background:#fff;border:1px solid #ddd;border-radius:16px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
h1{font-size:22px;margin:0 0 8px}p{line-height:1.5;color:#555}label{display:block;font-size:14px;font-weight:600;margin:14px 0 6px}input,button{width:100%;padding:12px;border-radius:10px;box-sizing:border-box;font:inherit}input{border:1px solid #bbb}button{margin-top:18px;border:0;background:#1d1d1b;color:#fff;font-weight:700;cursor:pointer}small{color:#777}
</style>
</head>
<body><main>
<h1>Sign in to Wawasan</h1>
<p><strong>${htmlEscape(clientName)}</strong> is requesting read access to your Wawasan data.</p>
<form method="post" action="/oauth/authorize/login">
<input type="hidden" name="tx" value="${htmlEscape(tx)}">
<label for="email">Email</label>
<input id="email" name="email" type="email" autocomplete="username" required>
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Sign in and authorize</button>
</form>
<p><small>Your password is sent over HTTPS to Firebase Authentication and is not stored by Wawasan.</small></p>
</main></body></html>`);
    } catch (err) {
      return res.status(400).send(htmlEscape(err instanceof Error ? err.message : 'OAuth authorization request failed.'));
    }
  });

  app.post('/oauth/authorize/login', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim();
      const password = String(req.body?.password || '');
      const tx = String(req.body?.tx || '');
      if (!email || !password || !tx) return res.status(400).send('Missing login information.');

      const idToken = await helpers.firebasePasswordLogin(email, password);
      const decoded = await helpers.verifyAdminIdToken(idToken);
      const completed = await helpers.completeAuthorization(tx, decoded.email || email, decoded.uid);
      const url = new URL(completed.redirectUri);
      url.searchParams.set('code', completed.code);
      if (completed.state) url.searchParams.set('state', completed.state);
      url.searchParams.set('iss', getMcpIssuer(req));
      return res.redirect(url.toString());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      return res.status(401).type('html').send(`<h2>Wawasan sign-in failed</h2><p>${htmlEscape(message)}</p><p>Return to Claude and try again.</p>`);
    }
  });

  app.post('/oauth/token', async (req, res) => {
    try {
      const issuer = getMcpIssuer(req);
      const grantType = String(req.body?.grant_type || '');
      const clientId = String(req.body?.client_id || '');
      const resource = String(req.body?.resource || '');
      if (!clientId) return res.status(400).json({ error: 'invalid_request', error_description: 'client_id is required.' });

      if (grantType === 'authorization_code') {
        const token = await helpers.exchangeCode(
          String(req.body?.code || ''),
          clientId,
          String(req.body?.redirect_uri || ''),
          String(req.body?.code_verifier || ''),
          resource,
          issuer,
        );
        return res.json(token);
      }

      if (grantType === 'refresh_token') {
        const token = await helpers.refresh(String(req.body?.refresh_token || ''), clientId, resource, issuer);
        return res.json(token);
      }

      return res.status(400).json({ error: 'unsupported_grant_type' });
    } catch (err) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: err instanceof Error ? err.message : 'Invalid OAuth request.',
      });
    }
  });

  app.post('/oauth/register', async (req, res) => {
    try {
      const registration = await helpers.registerClient(req.body, getMcpIssuer(req));
      return res.status(201).json(registration);
    } catch (err) {
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: err instanceof Error ? err.message : 'Invalid client registration request.',
      });
    }
  });

  app.post('/oauth/revoke', async (req, res) => {
    await helpers.revoke(String(req.body?.token || ''));
    return res.status(200).end();
  });
}

export async function mcpBearerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const match = /^Bearer\s+(.+)$/i.exec(req.header('authorization') || '');
  const supplied = match?.[1]?.trim() || '';
  const issuer = getMcpIssuer(req);
  const metadataUrl = `${issuer}/.well-known/oauth-protected-resource/mcp`;

  if (!supplied) {
    res.setHeader('WWW-Authenticate', `Bearer realm="Wawasan MCP", resource_metadata="${metadataUrl}", scope="${MCP_SCOPE}"`);
    res.status(401).json({ error: 'invalid_token', error_description: 'Bearer token required.' });
    return;
  }

  const data = await createMcpOAuthHelpers().verifyAccessToken(supplied, issuer);
  if (!data) {
    res.setHeader('WWW-Authenticate', `Bearer realm="Wawasan MCP", resource_metadata="${metadataUrl}", scope="${MCP_SCOPE}", error="invalid_token"`);
    res.status(401).json({ error: 'invalid_token', error_description: 'The access token is invalid or expired.' });
    return;
  }

  (req as any).mcpUser = data;
  next();
}
