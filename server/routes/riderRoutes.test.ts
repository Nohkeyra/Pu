import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import router from './riderRoutes.js';
import { signAdminJwt } from '../adminAuth.js';
import { getFirestore } from '../firebaseAdmin.js';
import * as firebase from '../firebaseAdmin.js';
vi.mock('../emailService.js', () => ({ createBrevoTransporter: vi.fn(), notifyCustomerOfStatusChange: vi.fn(async () => {}) }));
vi.mock('../calendarService.js', () => ({ syncGoogleCalendarEvent: vi.fn(async () => ({ success: true })) }));

describe('Authenticated rider GPS sessions', () => {
  let server: Server;
  let base: string;
  let token: string;
  let orderId: string;
  const oldSecret = process.env.ADMIN_JWT_SECRET;
  beforeEach(async () => {
    process.env.ADMIN_JWT_SECRET = 'rider-tests-only-secret';
    token = signAdminJwt({ uid: 'rider-admin', admin: true });
    orderId = `rider_${crypto.randomUUID()}`;
    await getFirestore().collection('orders').doc(orderId).set({ status: 'approved', userId: 'owner', email: 'owner@example.test', name: 'Example' });
    const app = express(); app.use(express.json()); app.use('/api', router);
    await new Promise<void>(resolve => { server = app.listen(0, () => { const address = server.address(); if (address && typeof address !== 'string') base = `http://127.0.0.1:${address.port}/api`; resolve(); }); });
  });
  afterEach(async () => { vi.restoreAllMocks(); if (oldSecret === undefined) delete process.env.ADMIN_JWT_SECRET; else process.env.ADMIN_JWT_SECRET = oldSecret; await new Promise<void>(resolve => server.close(() => resolve())); });
  const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  const start = async (id = orderId) => {
    const result = await fetch(`${base}/orders/${id}/rider-session`, { method: 'POST', headers: headers(), body: '{}' });
    expect(result.status).toBe(200); return (await result.json()).session;
  };
  const fix = (id: string, sequence = 1) => ({ sessionId: id, sequence, active: true, source: 'gps', lat: 2.92841, lng: 101.68728, accuracy: 10, speed: 0, heading: 0, capturedAt: new Date().toISOString() });
  const publish = (body: object, id = orderId) => fetch(`${base}/orders/${id}/rider-location`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });

  it('rejects starting or broadcasting without admin authorization', async () => {
    for (const path of ['rider-session', 'rider-location']) {
      const result = await fetch(`${base}/orders/${orderId}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      expect(result.status).toBe(401);
    }
  });
  it('does not label an unlocated session live', async () => {
    const session = await start(); expect(session.active).toBe(true);
    const result = await fetch(`${base}/orders/${orderId}/rider-location`, { headers: headers() });
    const data = await result.json(); expect(data.live).toBe(false); expect(data.riderLocation).toBeNull();
  });
  it('accepts fresh GPS and returns live data only after storage succeeds', async () => {
    const session = await start(); const result = await publish(fix(session.id)); expect(result.status).toBe(200);
    const read = await fetch(`${base}/orders/${orderId}/rider-location`, { headers: headers() });
    const data = await read.json(); expect(data.live).toBe(true); expect(data.riderLocation.source).toBe('gps');
  });
  it.each([
    { source: 'simulation' }, { lat: null }, { lat: 91 }, { lng: 181 }, { accuracy: 150 }, { accuracy: 0 },
    { speed: -1 }, { heading: 360 }, { capturedAt: 'invalid' }, { capturedAt: new Date(Date.now() - 60_000).toISOString() },
  ])('rejects invalid, old or simulated telemetry: %j', async patch => {
    const session = await start(); expect((await publish({ ...fix(session.id), ...patch })).status).toBe(400);
  });
  it('prevents a late coordinate or stop from overwriting a newer sequence', async () => {
    const session = await start(); expect((await publish(fix(session.id, 2))).status).toBe(200);
    expect((await publish(fix(session.id, 1))).status).toBe(409);
    expect((await publish({ sessionId: session.id, sequence: 1, active: false })).status).toBe(409);
    expect((await getFirestore().collection('orders').doc(orderId).get()).data()?.riderLocation.active).toBe(true);
  });
  it('allows stopping before the first GPS fix', async () => {
    const session = await start(); expect((await publish({ sessionId: session.id, sequence: 1, active: false })).status).toBe(200);
    expect((await getFirestore().collection('orders').doc(orderId).get()).data()?.riderTrackingSession.active).toBe(false);
  });
  it('a stopped session cannot be revived by a delayed upload', async () => {
    const session = await start(); await publish(fix(session.id)); await publish({ sessionId: session.id, sequence: 2, active: false });
    expect((await publish(fix(session.id, 3))).status).toBe(409);
  });
  it('replacing an order ends its previous session and rejects the old publisher', async () => {
    const first = await start(); await publish(fix(first.id));
    const nextId = `rider_${crypto.randomUUID()}`; await getFirestore().collection('orders').doc(nextId).set({ status: 'billed', userId: 'owner' });
    await start(nextId);
    const previous = (await getFirestore().collection('orders').doc(orderId).get()).data();
    expect(previous?.riderLocation.active).toBe(false); expect(previous?.riderTrackingSession.reason).toBe('replaced');
    expect((await publish(fix(first.id, 2))).status).toBe(409);
  });
  it('terminal orders cannot start or continue a GPS stream', async () => {
    const session = await start(); await getFirestore().collection('orders').doc(orderId).update({ status: 'delivered' });
    expect((await publish(fix(session.id))).status).toBe(409);
    const result = await fetch(`${base}/orders/${orderId}/rider-session`, { method: 'POST', headers: headers(), body: '{}' }); expect(result.status).toBe(409);
  });
  it('does not reorder business records on coordinate updates', async () => {
    const ref = getFirestore().collection('orders').doc(orderId); await ref.update({ updatedAt: '2026-01-01T00:00:00Z' });
    const session = await start(); await publish(fix(session.id)); expect((await ref.get()).data()?.updatedAt).toBe('2026-01-01T00:00:00Z');
  });
  it('only the order owner or an admin can read GPS', async () => {
    await start();
    vi.spyOn(firebase, 'verifyFirebaseIdToken').mockResolvedValue({ uid: 'stranger', email: 'stranger@example.test', email_verified: true });
    expect((await fetch(`${base}/orders/${orderId}/rider-location`, { headers: { Authorization: 'Bearer customer-test' } })).status).toBe(403);
    vi.mocked(firebase.verifyFirebaseIdToken).mockResolvedValue({ uid: 'owner' });
    const result = await fetch(`${base}/orders/${orderId}/rider-location`, { headers: { Authorization: 'Bearer customer-test' } }); expect(result.status).toBe(200); expect(result.headers.get('cache-control')).toContain('no-store');
  });
});
