import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Cloud Run startup and strict credential readiness', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.doUnmock('./firebaseAdmin.js');
    vi.doUnmock('firebase-admin/app');
    vi.doUnmock('@google-cloud/firestore');
    vi.doUnmock('googleapis');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('mounts MCP routes lazily without calling getFirestore during startup', async () => {
    vi.resetModules();
    const getFirestoreSpy = vi.fn(() => {
      throw new Error('Memory Firestore disabled in production');
    });

    vi.doMock('./firebaseAdmin.js', () => ({
      getFirestore: getFirestoreSpy,
      verifyFirebaseIdToken: vi.fn(async () => null),
    }));

    const { mountWawasanMcp } = await import('./mcp/index.js');
    const app = express();
    expect(() => mountWawasanMcp(app)).not.toThrow();
    expect(getFirestoreSpy).not.toHaveBeenCalled();
  });

  it('allows GOOGLE_APPLICATION_CREDENTIALS when STRICT_FIREBASE_ADMIN is true', async () => {
    vi.doUnmock('./firebaseAdmin.js');
    vi.resetModules();
    process.env.STRICT_FIREBASE_ADMIN = 'true';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = ' /var/secrets/firebase-sa.json ';
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    const initializeAppMock = vi.fn(() => ({ name: '[DEFAULT]' }));
    vi.doMock('firebase-admin/app', () => ({
      initializeApp: initializeAppMock,
      cert: vi.fn(),
      getApps: () => [],
    }));

    const { getAdminApp, hasAdminCredentials } = await import('./firebaseAdmin.js');
    expect(hasAdminCredentials()).toBe(true);
    const app = getAdminApp();
    expect(app).toEqual({ name: '[DEFAULT]' });
    expect(initializeAppMock).toHaveBeenCalledWith({ projectId: 'restoran-wawasan' });
  });

  it('passes a typed auth object rather than deprecated credentials to Firestore', async () => {
    vi.doUnmock('./firebaseAdmin.js');
    vi.resetModules();
    process.env.NODE_ENV = 'development';
    delete process.env.CI;
    delete process.env.VITEST;
    delete process.env.USE_MEMORY_FIRESTORE;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = ' "account@example.iam.gserviceaccount.com" ';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '"fake\\nkey"';

    let firestoreOptions: Record<string, unknown> | undefined;
    class FakeFirestore {
      constructor(options: Record<string, unknown>) { firestoreOptions = options; }
    }
    class FakeJWT {
      constructor(readonly options: Record<string, unknown>) {}
    }
    class FakeGoogleAuth {
      constructor(readonly options: Record<string, unknown>) {}
    }
    const certMock = vi.fn(() => ({ source: 'service-account' }));
    vi.doMock('firebase-admin/app', () => ({
      initializeApp: vi.fn((options) => ({ name: '[DEFAULT]', options })),
      cert: certMock,
      getApps: () => [],
    }));
    vi.doMock('@google-cloud/firestore', () => ({ Firestore: FakeFirestore }));
    vi.doMock('googleapis', () => ({ google: { auth: {
      JWT: FakeJWT,
      GoogleAuth: FakeGoogleAuth,
    } } }));

    const { getFirestore } = await import('./firebaseAdmin.js');
    const instance = getFirestore();
    expect(getFirestore()).toBe(instance); // Reuse one connection pool.
    expect(firestoreOptions).toMatchObject({
      projectId: 'restoran-wawasan',
      databaseId: '(default)',
      auth: expect.any(FakeGoogleAuth),
    });
    expect(firestoreOptions).not.toHaveProperty('credentials');
    const auth = firestoreOptions!.auth as FakeGoogleAuth;
    expect(auth.options.authClient).toBeInstanceOf(FakeJWT);
    expect((auth.options.authClient as FakeJWT).options).toMatchObject({
      email: 'account@example.iam.gserviceaccount.com',
      key: 'fake\nkey',
      scopes: ['https://www.googleapis.com/auth/datastore'],
    });
    expect(certMock).toHaveBeenCalledOnce(); // Keep Firebase Auth initialization intact.
  });

  it('rejects blank GOOGLE_APPLICATION_CREDENTIALS in hasAdminCredentials and throws in strict mode', async () => {
    vi.doUnmock('./firebaseAdmin.js');
    vi.resetModules();
    process.env.STRICT_FIREBASE_ADMIN = 'true';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '   ';
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    vi.doMock('firebase-admin/app', () => ({
      initializeApp: vi.fn(),
      cert: vi.fn(),
      getApps: () => [],
    }));

    const { getAdminApp, hasAdminCredentials } = await import('./firebaseAdmin.js');
    expect(hasAdminCredentials()).toBe(false);
    expect(() => getAdminApp()).toThrow('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  });
});
