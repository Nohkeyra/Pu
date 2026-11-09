import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import authRoutes from './authRoutes.js';
import * as firebase from '../firebaseAdmin.js';

describe('FCM token ownership', () => {
  let server: Server;
  let baseUrl: string;
  beforeEach(async () => {
    vi.spyOn(firebase, 'verifyFirebaseIdToken').mockResolvedValue(null);
    const app = express();
    app.use(express.json()); app.use('/api', authRoutes);
    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
        resolve();
      });
    });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });
  const request = (body: Record<string, unknown>) => fetch(`${baseUrl}/api/user/fcm-token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-customer' }, body: JSON.stringify(body),
  });

  it('does not treat an invoice number and email as authentication', async () => {
    const ref = firebase.getFirestore().collection('orders').doc('fcm-protected');
    await ref.set({ userId: 'owner', email: 'owner@example.invalid', invoiceNo: 'QT 2026-12345', fcmToken: 'original' });
    const response = await request({ invoiceNo: 'QT 2026-12345', email: 'owner@example.invalid', fcmToken: 'attacker' });
    expect(response.status).toBe(401);
    expect((await ref.get()).data()?.fcmToken).toBe('original');
  });

  it('rejects another account even when its email matches a UID-owned order', async () => {
    vi.mocked(firebase.verifyFirebaseIdToken).mockResolvedValue({ uid: 'other', email: 'owner@example.invalid', email_verified: true });
    const ref = firebase.getFirestore().collection('orders').doc('fcm-other-owner');
    await ref.set({ userId: 'owner', email: 'owner@example.invalid', fcmToken: 'original' });
    const response = await request({ orderId: ref.id, fcmToken: 'attacker' });
    expect(response.status).toBe(403);
    expect((await ref.get()).data()?.fcmToken).toBe('original');
  });

  it('registers the authenticated owner and their order', async () => {
    vi.mocked(firebase.verifyFirebaseIdToken).mockResolvedValue({ uid: 'fcm-owner', email_verified: true });
    const ref = firebase.getFirestore().collection('orders').doc('fcm-valid-owner');
    await ref.set({ userId: 'fcm-owner' });
    const response = await request({ orderId: ref.id, fcmToken: 'new-device' });
    expect(response.status).toBe(200);
    expect((await ref.get()).data()?.fcmToken).toBe('new-device');
  });

  it('permits legacy ownership only with a verified Firebase email', async () => {
    const ref = firebase.getFirestore().collection('orders').doc('fcm-legacy-owner');
    await ref.set({ email: 'legacy@example.invalid', invoiceNo: 'QT 2026-legacy', fcmToken: 'original' });
    vi.mocked(firebase.verifyFirebaseIdToken).mockResolvedValue({ uid: 'legacy', email: 'legacy@example.invalid', email_verified: false });
    expect((await request({ invoiceNo: 'QT 2026-legacy', email: 'legacy@example.invalid', fcmToken: 'unverified' })).status).toBe(403);
    expect((await ref.get()).data()?.fcmToken).toBe('original');
    vi.mocked(firebase.verifyFirebaseIdToken).mockResolvedValue({ uid: 'legacy', email: 'legacy@example.invalid', email_verified: true });
    expect((await request({ invoiceNo: 'QT 2026-legacy', fcmToken: 'verified' })).status).toBe(200);
    expect((await ref.get()).data()?.fcmToken).toBe('verified');
  });
});
