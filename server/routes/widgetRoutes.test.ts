import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import widgetRoutes from './widgetRoutes.js';
import { signAdminJwt } from '../adminAuth.js';
import { getFirestore } from '../firebaseAdmin.js';
import * as firebaseAdminModule from '../firebaseAdmin.js';
import { invoiceQueue } from '../services/invoiceQueue.js';

describe('Widget Routes Authorization & Pricing Security', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.ADMIN_JWT_SECRET = 'test-widget-jwt-secret';
    process.env.ADMIN_EMAILS = 'admin@wawasan.test';

    app = express();
    app.use(express.json());
    app.use('/api', widgetRoutes);

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

  describe('Authentication & Authorization Guards', () => {
    it('rejects unauthenticated request to /widget/upcoming-orders with 401', async () => {
      const res = await fetch(`${baseUrl}/api/widget/upcoming-orders`);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Unauthorized/i);
    });

    it('rejects unauthenticated request to /widget/today-pricing-orders with 401', async () => {
      const res = await fetch(`${baseUrl}/api/widget/today-pricing-orders`);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('rejects unauthenticated request to /widget/set-pricing with 401', async () => {
      const res = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_1', prices: { lunch: 15 } }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects requests with an invalid/forged JWT with 401', async () => {
      const res = await fetch(`${baseUrl}/api/widget/upcoming-orders`, {
        headers: { Authorization: 'Bearer forged.invalid.token' },
      });
      expect(res.status).toBe(401);
    });

    it('rejects requests from an authenticated customer/client with 401', async () => {
      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
        uid: 'customer_123',
        email: 'customer@example.com',
        admin: false,
      });

      const res = await fetch(`${baseUrl}/api/widget/upcoming-orders`, {
        headers: { Authorization: 'Bearer valid_customer_token' },
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('allows access with a valid server-signed Admin JWT', async () => {
      const adminToken = signAdminJwt({ uid: 'admin_1', email: 'admin@wawasan.test', admin: true });
      const res = await fetch(`${baseUrl}/api/widget/upcoming-orders`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.orders)).toBe(true);
    });

    it('allows access with a verified Firebase Admin token', async () => {
      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
        uid: 'admin_firebase_uid',
        email: 'admin@wawasan.test',
        admin: true,
      });

      const res = await fetch(`${baseUrl}/api/widget/upcoming-orders`, {
        headers: { Authorization: 'Bearer valid_admin_firebase_token' },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('GET /api/widget/upcoming-orders Data Filtering', () => {
    it('filters out soft-deleted orders and cancelled orders', async () => {
      const adminToken = signAdminJwt({ uid: 'admin_1', email: 'admin@wawasan.test', admin: true });
      const db = getFirestore();

      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());

      // 1. Valid active order
      await db.collection('orders').doc('active_order_widget').set({
        to: 'Sime Darby Berhad',
        eventDate: todayStr,
        meals: ['lunch'],
        quantity: 50,
        status: 'pending',
        location: 'Kuala Lumpur',
      });

      // 2. Soft-deleted order (deletedByAdmin: true)
      await db.collection('orders').doc('deleted_order_widget').set({
        to: 'Ghost Company',
        eventDate: todayStr,
        meals: ['lunch'],
        quantity: 30,
        status: 'pending',
        deletedByAdmin: true,
      });

      // 3. Cancelled order
      await db.collection('orders').doc('cancelled_order_widget').set({
        to: 'Cancelled Company',
        eventDate: todayStr,
        meals: ['dinner'],
        quantity: 40,
        status: 'cancelled',
      });

      const res = await fetch(`${baseUrl}/api/widget/upcoming-orders`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const returnedIds = json.orders.map((o: any) => o.id);
      expect(returnedIds).toContain('active_order_widget');
      expect(returnedIds).not.toContain('deleted_order_widget');
      expect(returnedIds).not.toContain('cancelled_order_widget');

      const activeOrder = json.orders.find((o: any) => o.id === 'active_order_widget');
      expect(activeOrder.to).toBe('Sime Darby Berhad');
      expect(activeOrder.quantity).toBe(50);
    });
  });

  describe('GET /api/widget/today-pricing-orders', () => {
    it('filters out orders that are already billed and soft-deleted', async () => {
      const adminToken = signAdminJwt({ uid: 'admin_1', email: 'admin@wawasan.test', admin: true });
      const db = getFirestore();

      await db.collection('orders').doc('unpriced_ord_1').set({
        to: 'Unpriced Corp',
        meals: ['lunch'],
        quantity: 25,
        status: 'pending',
        eventDate: '2026-11-01',
      });

      await db.collection('orders').doc('already_billed_ord').set({
        to: 'Billed Corp',
        meals: ['lunch'],
        quantity: 25,
        status: 'billed',
        totalAmount: 375,
        invoiceNo: 'RW 12345',
        eventDate: '2026-11-01',
      });

      const res = await fetch(`${baseUrl}/api/widget/today-pricing-orders`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const ids = json.orders.map((o: any) => o.id);
      expect(ids).toContain('unpriced_ord_1');
      expect(ids).not.toContain('already_billed_ord');
    });
  });

  describe('POST /api/widget/set-pricing Pricing Security & Calculations', () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = signAdminJwt({ uid: 'admin_1', email: 'admin@wawasan.test', admin: true });
    });

    it('rejects missing orderId or prices payload with 400', async () => {
      const res1 = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: { lunch: 15 } }),
      });
      expect(res1.status).toBe(400);

      const res2 = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_test' }),
      });
      expect(res2.status).toBe(400);
    });

    it('rejects negative, zero, and non-finite prices with 400', async () => {
      const negativeRes = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_test', prices: { lunch: -10 } }),
      });
      expect(negativeRes.status).toBe(400);

      const zeroRes = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_test', prices: { lunch: 0 } }),
      });
      expect(zeroRes.status).toBe(400);

      const stringRes = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_test', prices: { lunch: 'ten' as any } }),
      });
      expect(stringRes.status).toBe(400);
    });

    it.each([{ prices: { lunch: 12.345 } }, { prices: [12.5] }])('rejects sub-cent or array pricing before billing', async ({ prices }) => {
      const response = await fetch(baseUrl + '/api/widget/set-pricing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'invalid_pricing_precision', prices }),
      });
      expect(response.status).toBe(400);
    });

    it('rejects pricing when an order has multiple meals and not all are priced', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('ord_multi_meal').set({
        to: 'Multi Meal Corp',
        meals: ['breakfast', 'lunch'],
        quantity: 50,
        status: 'pending',
      });

      const res = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_multi_meal', prices: { breakfast: 8 } }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/valid price is required for every meal/i);
    });

    it('rejects already billed order with 409', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('ord_already_billed').set({
        to: 'Settled Corp',
        meals: ['lunch'],
        quantity: 50,
        status: 'billed',
        totalAmount: 750,
        invoiceNo: 'RW 99999',
      });

      const res = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_already_billed', prices: { lunch: 15 } }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already 'billed'/i);
    });

    it('calculates authoritative totalAmount server-side and marks order as billed', async () => {
      const db = getFirestore();
      const enqueueSpy = vi.spyOn(invoiceQueue.service, 'enqueueInTransaction');

      await db.collection('orders').doc('ord_valid_pricing').set({
        to: 'Valid Client',
        email: 'client@example.com',
        meals: ['breakfast', 'lunch'],
        quantity: 20,
        status: 'pending',
      });

      const res = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'ord_valid_pricing',
          prices: { breakfast: 7.5, lunch: 12.5 },
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Expected total: 20 * (7.50 + 12.50) = 20 * 20.00 = 400.00
      expect(json.totalAmount).toBe(400);
      expect(json.invoiceNo).toMatch(/^RW /);

      // Verify Firestore state
      const updatedSnap = await db.collection('orders').doc('ord_valid_pricing').get();
      const updatedData = updatedSnap.data();
      expect(updatedData?.status).toBe('billed');
      expect(updatedData?.totalAmount).toBe(400);
      expect(updatedData?.prices).toEqual({ breakfast: 7.5, lunch: 12.5 });
      expect(updatedData?.invoiceNo).toBe(json.invoiceNo);

      // Verify background invoice delivery was queued
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId: 'ord_valid_pricing',
          recipientEmail: 'client@example.com',
          totalAmount: 400,
        })
      );
    });

    it('rejects stale offline pricing submission with 409 and records an admin conflict notification', async () => {
      const db = getFirestore();
      const serverUpdatedAt = '2026-11-15T10:00:00.000Z';
      const staleClientTs = Date.parse('2026-11-15T09:45:00.000Z');

      await db.collection('orders').doc('ord_conflict_stale').set({
        to: 'Conflict Corp',
        email: 'conflict@example.com',
        meals: ['lunch'],
        quantity: 30,
        status: 'pending',
        updatedAt: serverUpdatedAt,
      });

      const res = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'ord_conflict_stale',
          prices: { lunch: 14 },
          clientTimestamp: staleClientTs,
        }),
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.conflict).toBe(true);
      expect(json.code).toBe('PRICING_CONFLICT');
      expect(json.notificationId).toBeTruthy();

      // Order must remain untouched
      const untouchedSnap = await db.collection('orders').doc('ord_conflict_stale').get();
      expect(untouchedSnap.data()?.status).toBe('pending');
      expect(untouchedSnap.data()?.totalAmount).toBeUndefined();

      // Admin conflict endpoint surfaces the alert and dismisses it cleanly
      const listRes = await fetch(`${baseUrl}/api/admin/conflicts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.success).toBe(true);
      const recorded = listJson.conflicts.find((c: any) => c.id === json.notificationId);
      expect(recorded).toBeDefined();
      expect(recorded.orderId).toBe('ord_conflict_stale');
      expect(recorded.customerName).toBe('Conflict Corp');
      expect(recorded.submittedPrices).toEqual({ lunch: 14 });

      const dismissRes = await fetch(`${baseUrl}/api/admin/conflicts/${json.notificationId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(dismissRes.status).toBe(200);

      const listAfterRes = await fetch(`${baseUrl}/api/admin/conflicts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const listAfterJson = await listAfterRes.json();
      expect(listAfterJson.conflicts.some((c: any) => c.id === json.notificationId)).toBe(false);
    });

    it('accepts offline pricing submission when clientTimestamp is newer than server updatedAt', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('ord_conflict_fresh').set({
        to: 'Fresh Sync Corp',
        meals: ['lunch'],
        quantity: 10,
        status: 'pending',
        updatedAt: '2026-11-15T08:00:00.000Z',
      });

      const res = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'ord_conflict_fresh',
          prices: { lunch: 18 },
          clientTimestamp: Date.parse('2026-11-15T08:30:00.000Z'),
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.totalAmount).toBe(180);
    });

    it('rejects malformed orderId containing path separators with 400', async () => {
      const res = await fetch(`${baseUrl}/api/widget/set-pricing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'bad/path/id',
          prices: { lunch: 18 },
        }),
      });
      expect(res.status).toBe(400);
    });
  });
});
