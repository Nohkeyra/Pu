import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyFirebaseIdToken, getFirestore, firebaseSessionRevocationId } from './firebaseAdmin.js';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import { verifyAdminToken } from './adminAuth.js';
import { createMcpOAuthHelpers } from './mcp/auth.js';

const h = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: h.verify }) }));
vi.mock('firebase-admin/app', async importOriginal => ({
  ...await importOriginal<typeof import('firebase-admin/app')>(),
  getApps: () => [{}],
}));

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('Firebase session revocation at API boundaries', () => {
  it('rejects revoked customer sessions', async () => {
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/unused-test-credential');
    h.verify.mockImplementation(async (_token, checkRevoked) => {
      if (checkRevoked) throw new Error('auth/id-token-revoked');
      return { uid: 'revoked-customer', email_verified: true };
    });
    expect(await verifyFirebaseIdToken('revoked-token')).toBeNull();
  });

  it('rejects revoked admin sessions', async () => {
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/unused-test-credential');
    h.verify.mockImplementation(async (_token, checkRevoked) => {
      if (checkRevoked) throw new Error('auth/id-token-revoked');
      return { uid: 'revoked-admin', admin: true };
    });
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await verifyAdminToken({ headers: { authorization: 'Bearer revoked-token' } } as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects revoked identities before MCP authorization', async () => {
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/unused-test-credential');
    h.verify.mockImplementation(async (_token, checkRevoked) => {
      if (checkRevoked) throw new Error('auth/id-token-revoked');
      return { uid: 'revoked-admin', admin: true };
    });
    await expect(createMcpOAuthHelpers().verifyAdminIdToken('revoked-token')).rejects.toThrow('revoked');
  });

  it('logout revokes the presented Firebase admin token without storing it or revoking another device', async () => {
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/unused-test-credential');
    const authTime = 1_700_001_000;
    h.verify.mockImplementation(async (token: string) => ({ uid: 'firebase-logout-admin', admin: true, auth_time: token === 'firebase-other-device' ? authTime + 1 : authTime }));
    const app = express(); app.use('/api', authRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/admin/logout`, {
        method: 'POST', headers: { Authorization: 'Bearer firebase-current-session' },
      });
      expect(response.status).toBe(200);
      expect(await verifyFirebaseIdToken('firebase-current-session')).toBeNull();
      expect(await verifyFirebaseIdToken('firebase-other-device')).toMatchObject({ uid: 'firebase-logout-admin' });
      const saved = await getFirestore().collection('admin_revocations').doc(firebaseSessionRevocationId({ uid: 'firebase-logout-admin', auth_time: authTime })!).get();
      expect(saved.exists).toBe(true);
      expect(saved.data()?.expireAt).toBeUndefined();
      expect(JSON.stringify(saved.data())).not.toContain('firebase-current-session');
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('keeps a logged-out Firebase session revoked across token refresh, while a new sign-in works', async () => {
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/unused-test-credential');
    const identity = { uid: 'firebase-session-admin', admin: true, auth_time: 1_700_000_000 };
    h.verify.mockImplementation(async (token: string) => ({ ...identity, auth_time: token === 'new-sign-in' ? identity.auth_time + 1 : identity.auth_time }));
    const key = firebaseSessionRevocationId(identity)!;
    await getFirestore().collection('admin_revocations').doc(key).set({ uid: identity.uid, revokedAt: new Date() });
    expect(await verifyFirebaseIdToken('original-id-token')).toBeNull();
    expect(await verifyFirebaseIdToken('refreshed-id-token')).toBeNull();
    expect(await verifyFirebaseIdToken('new-sign-in')).toMatchObject({ uid: identity.uid });
  });
});
