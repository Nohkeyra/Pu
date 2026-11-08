import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import diagnosticRoutes from './diagnosticRoutes.js';
import { signAdminJwt } from '../adminAuth.js';

describe('Non-destructive PDF diagnostics', () => {
  let server: Server;
  let baseUrl = '';
  let token = '';
  const originalSecret = process.env.ADMIN_JWT_SECRET;

  beforeEach(async () => {
    process.env.ADMIN_JWT_SECRET = 'diagnostic-route-test-secret';
    token = signAdminJwt({ uid: 'diagnostic_admin', admin: true });
    const app = express();
    app.use('/api', diagnosticRoutes);
    server = app.listen(0);
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (originalSecret === undefined) delete process.env.ADMIN_JWT_SECRET;
    else process.env.ADMIN_JWT_SECRET = originalSecret;
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('refuses unauthenticated PDF diagnostics', async () => {
    const res = await fetch(`${baseUrl}/api/diagnostics/pdf`);
    expect(res.status).toBe(401);
  });

  it('generates a disposable in-memory PDF with authenticated admin access', async () => {
    const res = await fetch(`${baseUrl}/api/diagnostics/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('Server PDF engine');
  });
});
