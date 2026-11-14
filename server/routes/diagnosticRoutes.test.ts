import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import diagnosticRoutes from './diagnosticRoutes.js';
import { signAdminJwt } from '../adminAuth.js';
import * as calendarService from '../calendarService.js';

describe('Non-destructive PDF & Calendar diagnostics', () => {
  let server: Server;
  let baseUrl = '';
  let token = '';
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv, ADMIN_JWT_SECRET: 'diagnostic-route-test-secret' };
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
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
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

  it('reports calendar unconfigured when service account credentials are absent', async () => {
    for (const key of [
      'GOOGLE_CALENDAR_CLIENT_EMAIL',
      'FIREBASE_CLIENT_EMAIL',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_CALENDAR_PRIVATE_KEY',
      'FIREBASE_PRIVATE_KEY',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    ]) {
      delete process.env[key];
    }

    const res = await fetch(`${baseUrl}/api/diagnostics/calendar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.status).toBe('unconfigured');
  });

  it('accepts GOOGLE_CALENDAR_* aliases and queries accessible calendars', async () => {
    process.env.GOOGLE_CALENDAR_CLIENT_EMAIL = 'calendar-bot@wawasan.test.iam.gserviceaccount.com';
    process.env.GOOGLE_CALENDAR_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----';

    const listMock = vi.fn().mockResolvedValue({ data: { items: [{ id: 'primary' }] } });
    vi.spyOn(calendarService, 'getGoogleCalendarClient').mockReturnValue({
      calendarList: { list: listMock },
    } as never);

    const res = await fetch(`${baseUrl}/api/diagnostics/calendar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.status).toBe('healthy');
    expect(data.calendarsReturned).toBe(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });
});
