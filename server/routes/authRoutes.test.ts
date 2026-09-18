import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import authRoutes, { secureCompare } from './authRoutes.js';
import { signAdminJwt, verifyAdminJwt, verifyAdminToken } from '../adminAuth.js';

describe('Admin Authentication & Security', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ADMIN_PASSWORD = 'test-secure-admin-password-123';
    process.env.ADMIN_JWT_SECRET = 'test-jwt-secret-key-456';
    process.env.ADMIN_EMAILS = 'admin@wawasan.test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('secureCompare (constant-time string comparison)', () => {
    it('returns true for matching strings', () => {
      expect(secureCompare('secretPass123', 'secretPass123')).toBe(true);
    });

    it('returns false for non-matching strings', () => {
      expect(secureCompare('secretPass123', 'wrongPass')).toBe(false);
    });

    it('returns false for non-string types safely', () => {
      expect(secureCompare(null as any, 'secret')).toBe(false);
      expect(secureCompare(undefined as any, 'secret')).toBe(false);
      expect(secureCompare(123 as any, '123')).toBe(false);
    });
  });

  describe('signAdminJwt & verifyAdminJwt', () => {
    it('mints and verifies a valid admin JWT with admin: true claim', () => {
      const token = signAdminJwt({ uid: 'admin_123', email: 'admin@wawasan.test' });
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyAdminJwt(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.admin).toBe(true);
      expect(decoded?.role).toBe('admin');
      expect(decoded?.uid).toBe('admin_123');
      expect(decoded?.email).toBe('admin@wawasan.test');
    });

    it('rejects tampered or corrupted JWTs', () => {
      const token = signAdminJwt({ uid: 'admin_123' });
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      expect(verifyAdminJwt(tamperedToken)).toBeNull();
    });

    it('rejects expired JWTs', () => {
      // Create a token expired 10 seconds ago
      const token = signAdminJwt({ uid: 'admin_123' }, -10);
      expect(verifyAdminJwt(token)).toBeNull();
    });

    it('rejects tokens signed with a different secret', () => {
      const token = signAdminJwt({ uid: 'admin_123' });
      process.env.ADMIN_JWT_SECRET = 'different-secret-key';
      expect(verifyAdminJwt(token)).toBeNull();
    });
  });

  describe('HTTP Endpoints /api/admin/*', () => {
    let server: Server;
    let baseUrl: string;

    beforeEach(async () => {
      const app = express();
      app.use(express.json());
      app.use('/api', authRoutes);

      // Dummy protected route using verifyAdminToken
      app.post('/api/admin/protected-action', verifyAdminToken, (req, res) => {
        res.json({
          success: true,
          action: 'executed',
          adminUser: (req as any).adminPayload,
        });
      });

      await new Promise<void>((resolve) => {
        server = app.listen(0, '127.0.0.1', () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('POST /api/admin/login rejects missing password with 400', async () => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('POST /api/admin/login rejects incorrect password with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'incorrect-password' }),
      });
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('POST /api/admin/login accepts correct password, mints token with custom claims', async () => {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test-secure-admin-password-123' }),
      });

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.admin).toBe(true);
      expect(data.customClaims).toEqual({ admin: true });
      expect(data.token).toBeDefined();
      expect(data.firebaseCustomToken).toBeDefined();

      // Verify the minted token contains the admin claim
      const verified = verifyAdminJwt(data.token);
      expect(verified?.admin).toBe(true);
    });

    it('Integration: Login -> Verify -> Protected Admin Endpoint', async () => {
      // 1. Step 1: Login
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test-secure-admin-password-123' }),
      });
      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      const token = loginData.token;

      // 2. Step 2: GET /api/admin/verify with bearer token
      const verifyRes = await fetch(`${baseUrl}/api/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(verifyRes.status).toBe(200);
      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(true);
      expect(verifyData.verified).toBe(true);
      expect(verifyData.admin).toBe(true);
      expect(verifyData.user.admin).toBe(true);

      // 3. Step 3: POST /api/admin/protected-action with bearer token
      const protectedRes = await fetch(`${baseUrl}/api/admin/protected-action`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'something' }),
      });
      expect(protectedRes.status).toBe(200);
      const protectedData = await protectedRes.json();
      expect(protectedData.success).toBe(true);
      expect(protectedData.action).toBe('executed');
      expect(protectedData.adminUser.admin).toBe(true);
    });

    it('Protected endpoint rejects request without token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/verify`);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('Protected endpoint rejects request with invalid/forged token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/verify`, {
        headers: { Authorization: 'Bearer invalid.fake.token' },
      });
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('POST /api/admin/logout returns 200 success', async () => {
      const res = await fetch(`${baseUrl}/api/admin/logout`, {
        method: 'POST',
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

