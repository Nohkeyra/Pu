import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import invoiceRoutes, { isOrderOwnedByCaller } from './invoiceRoutes.js';
import { signAdminJwt } from '../adminAuth.js';
import { getFirestore } from '../firebaseAdmin.js';
import * as firebaseAdminModule from '../firebaseAdmin.js';

describe('Invoice Routes Authorization & Security (IDOR Protection)', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.ADMIN_JWT_SECRET = 'test-invoice-jwt-secret';
    process.env.ADMIN_EMAILS = 'admin@wawasan.test';

    app = express();
    app.use(express.json());
    app.use('/api', invoiceRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('Authorization Helper: isOrderOwnedByCaller', () => {
    it('allows admin to access any order', () => {
      const order = { id: 'ord_1', userId: 'user_other', email: 'other@example.com' };
      const auth = { isAdmin: true, uid: 'admin_uid', email: 'admin@wawasan.test' };
      expect(isOrderOwnedByCaller(order, auth)).toBe(true);
    });

    it('allows customer with matching userId', () => {
      const order = { id: 'ord_1', userId: 'user_123', email: 'user@example.com' };
      const auth = { isAdmin: false, uid: 'user_123', email: 'different@example.com' };
      expect(isOrderOwnedByCaller(order, auth)).toBe(true);
    });

    it('allows customer with matching email', () => {
      const order = { id: 'ord_1', userId: 'user_999', email: 'user@example.com' };
      const auth = { isAdmin: false, uid: 'user_123', email: 'user@example.com' };
      expect(isOrderOwnedByCaller(order, auth)).toBe(true);
    });

    it('rejects foreign customer with different userId and email', () => {
      const order = { id: 'ord_1', userId: 'user_victim', email: 'victim@example.com' };
      const auth = { isAdmin: false, uid: 'user_attacker', email: 'attacker@example.com' };
      expect(isOrderOwnedByCaller(order, auth)).toBe(false);
    });
  });

  describe('GET /api/invoice/:orderId/pdf', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/api/invoice/order_123/pdf`);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Authentication required/i);
    });

    it('rejects request with invalid token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/invoice/order_123/pdf`, {
        headers: { Authorization: 'Bearer invalid.fake.token' }
      });
      expect(res.status).toBe(401);
    });

    it('rejects foreign user attempting to download another user order with 403 (IDOR attempt)', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('victim_order_1').set({
        customerName: 'Victim User',
        userId: 'victim_user_uid',
        email: 'victim@example.com',
        status: 'billed',
        totalAmount: 250,
        invoiceNo: 'RW_VICTIM_01'
      });

      // Mock verifyFirebaseIdToken to simulate authenticated attacker
      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
        uid: 'attacker_user_uid',
        email: 'attacker@example.com',
        admin: false
      });

      const res = await fetch(`${baseUrl}/api/invoice/victim_order_1/pdf`, {
        headers: { Authorization: 'Bearer fake_customer_id_token' }
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Forbidden|permission/i);
    });

    it('allows owner to download their own invoice PDF with 200', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('customer_order_1').set({
        customerName: 'Customer One',
        userId: 'customer_1_uid',
        email: 'customer1@example.com',
        status: 'billed',
        totalAmount: 180,
        invoiceNo: 'RW_CUST_01'
      });

      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
        uid: 'customer_1_uid',
        email: 'customer1@example.com',
        admin: false
      });

      const res = await fetch(`${baseUrl}/api/invoice/customer_order_1/pdf`, {
        headers: { Authorization: 'Bearer valid_customer_token' }
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
    });

    it('allows administrator to download any invoice with 200 via admin JWT', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('target_order_99').set({
        customerName: 'Target Customer',
        userId: 'some_user_uid',
        email: 'target@example.com',
        status: 'billed',
        totalAmount: 400,
        invoiceNo: 'RW_TARGET_99'
      });

      const adminToken = signAdminJwt({ uid: 'admin_root', email: 'admin@wawasan.test' });

      const res = await fetch(`${baseUrl}/api/invoice/target_order_99/pdf`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
    });
  });

  describe('POST /api/invoice/combined/pdf', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/api/invoice/combined/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ['order_1', 'order_2'] })
      });
      expect(res.status).toBe(401);
    });

    it('rejects customer combining orders that include orders owned by someone else with 403', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('cust_own_order').set({
        customerName: 'Customer Me',
        userId: 'my_uid',
        status: 'billed',
        date: '2026-09-01'
      });
      await db.collection('orders').doc('foreign_order').set({
        customerName: 'Foreign User',
        userId: 'other_uid',
        status: 'billed',
        date: '2026-09-02'
      });

      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
        uid: 'my_uid',
        email: 'me@example.com',
        admin: false
      });

      const res = await fetch(`${baseUrl}/api/invoice/combined/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_my_token'
        },
        body: JSON.stringify({ orderIds: ['cust_own_order', 'foreign_order'] })
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Forbidden|belong to your account/i);
    });

    it('allows customer to generate combined PDF when all orders belong to them', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('my_order_1').set({
        customerName: 'My Corporate Group',
        userId: 'my_uid',
        status: 'billed',
        date: '2026-09-10',
        pax: 50,
        totalAmount: 500
      });
      await db.collection('orders').doc('my_order_2').set({
        customerName: 'My Corporate Group',
        userId: 'my_uid',
        status: 'billed',
        date: '2026-09-11',
        pax: 50,
        totalAmount: 500
      });

      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
        uid: 'my_uid',
        email: 'me@example.com',
        admin: false
      });

      const res = await fetch(`${baseUrl}/api/invoice/combined/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_my_token'
        },
        body: JSON.stringify({ orderIds: ['my_order_1', 'my_order_2'] })
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
    });

    it('allows admin to generate combined PDF across any orders', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('corp_order_a').set({
        customerName: 'Ministry A',
        userId: 'user_a',
        status: 'billed',
        date: '2026-09-15',
        pax: 30,
        totalAmount: 450
      });
      await db.collection('orders').doc('corp_order_b').set({
        customerName: 'Ministry A',
        userId: 'user_b',
        status: 'billed',
        date: '2026-09-16',
        pax: 30,
        totalAmount: 450
      });

      const adminToken = signAdminJwt({ uid: 'admin_root', email: 'admin@wawasan.test' });

      const res = await fetch(`${baseUrl}/api/invoice/combined/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ orderIds: ['corp_order_a', 'corp_order_b'] })
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
    });
  });
});
