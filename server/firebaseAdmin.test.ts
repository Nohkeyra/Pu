import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getFirestore } from './firebaseAdmin.js';

describe('firebaseAdmin - getFirestore production guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws an error if USE_MEMORY_FIRESTORE is true in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.USE_MEMORY_FIRESTORE = 'true';
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    expect(() => getFirestore()).toThrow('Memory Firestore disabled in production');
  });
});
