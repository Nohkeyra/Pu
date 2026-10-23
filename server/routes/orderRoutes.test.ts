import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import orderRoutes from './orderRoutes.js';
import { signAdminJwt } from '../adminAuth.js';
import { getFirestore } from '../firebaseAdmin.js';
import * as firebaseAdminModule from '../firebaseAdmin.js';

describe('Order Routes Role Boundaries, Pricing Invariants & Data Protection', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  let adminToken: string;

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.ADMIN_JWT_SECRET = 'test-orders-jwt-secret';
    process.env.ADMIN_EMAILS = 'admin@wawasan.test';

    adminToken = signAdminJwt({ uid: 'admin_1', email: 'admin@wawasan.test', admin: true });

    app = express();
    app.use(express.json());
    app.use('/api', orderRoutes);

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

  describe('Client / Guest Price & Total Manipulation Immunity', () => {
    it('forces prices to {} and totalAmount to 0 on public order submission', async () => {
      const db = getFirestore();

      const maliciousPayload = {
        name: 'Attacker Client',
        contact: '+60123456789',
        email: 'attacker@example.com',
        eventDate: '2026-11-20',
        time: '12:00',
        quantity: 100,
        meals: ['lunch'],
        // Attempt to self-assign a custom low price and pre-billed status
        prices: { lunch: 1.0 },
        totalAmount: 1.0,
        status: 'billed',
        invoiceNo: 'RW 99999-HACK',
      };

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload),
      });

      expect(res.status).toBe(200);
      const json = await res.json();

      // Response must show zero total and empty prices
      expect(json.totalAmount).toBe(0);
      expect(json.prices).toEqual({});

      // Firestore document must reflect forced pending status, zero totalAmount, and empty prices
      const orderRef = db.collection('orders').doc(json.id);
      const docSnap = await orderRef.get();
      const stored = docSnap.data();

      expect(stored?.status).toBe('pending');
      expect(stored?.totalAmount).toBe(0);
      expect(stored?.prices).toEqual({});
      expect(stored?.invoiceNo).not.toBe('RW 99999-HACK');
    });

    it('rejects unauthenticated attempts to modify order status via admin endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/ord_123/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects customer ID token attempting to access admin order management', async () => {
      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
        uid: 'customer_uid_1',
        email: 'customer@example.com',
        admin: false,
      });

      const res = await fetch(`${baseUrl}/api/admin/orders`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer customer_id_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fetch' }),
      });
      expect(res.status).toBe(401);
    });

    it('allows valid administrator to access admin order management with 200', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fetch' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('Customer Order Deletion Policy & IDOR Protection', () => {
    it('prevents customer from deleting an unbilled order', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('pending_order_del').set({
        userId: 'client_owner_1',
        status: 'pending',
        name: 'Client Owner',
        email: 'client@example.com',
      });

      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('client_owner_1');

      const res = await fetch(`${baseUrl}/api/orders/delete`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_client_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: 'pending_order_del' }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/after it has been billed/i);
    });

    it('prevents a customer from deleting another customer order (IDOR)', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('billed_victim_order').set({
        userId: 'victim_user',
        status: 'billed',
        name: 'Victim User',
        email: 'victim@example.com',
      });

      // Attacker is authenticated as 'attacker_user'
      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('attacker_user');

      const res = await fetch(`${baseUrl}/api/orders/delete`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer attacker_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: 'billed_victim_order' }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Not authorized/i);
    });

    it('allows a customer to delete their own order once it is billed', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('billed_own_order').set({
        userId: 'client_owner_2',
        status: 'billed',
        name: 'Client Owner 2',
        email: 'client2@example.com',
      });

      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('client_owner_2');

      const res = await fetch(`${baseUrl}/api/orders/delete`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_owner_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: 'billed_own_order' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const check = await db.collection('orders').doc('billed_own_order').get();
      expect(check.exists).toBe(false);
    });
  });

  describe('Public Calendar Endpoints Data Minimization', () => {
    it('GET /api/calendar-orders returns only non-PII scheduling fields', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('cal_order_1').set({
        name: 'Sensitive Customer Name',
        email: 'sensitive@example.com',
        contact: '+60199999999',
        location: 'Private Residence, Putrajaya',
        status: 'approved',
        eventDate: '2026-11-25',
        meals: ['lunch'],
        guests: 75,
        totalAmount: 1200,
        prices: { lunch: 16 },
      });

      const res = await fetch(`${baseUrl}/api/calendar-orders?from=2026-11-01&to=2026-11-30`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const item = json.orders.find((o: any) => o.id === 'cal_order_1');
      expect(item).toBeDefined();

      // Allowed fields
      expect(item.id).toBe('cal_order_1');
      expect(item.status).toBe('approved');
      expect(item.eventDate).toBe('2026-11-25');
      expect(item.meals).toEqual(['lunch']);
      expect(item.guests).toBe(75);

      // Stripped PII & financial fields
      expect((item as any).name).toBeUndefined();
      expect((item as any).email).toBeUndefined();
      expect((item as any).contact).toBeUndefined();
      expect((item as any).location).toBeUndefined();
      expect((item as any).totalAmount).toBeUndefined();
      expect((item as any).prices).toBeUndefined();
    });

    it('GET /api/calendar-sessions returns purely aggregated session counts without PII', async () => {
      const res = await fetch(`${baseUrl}/api/calendar-sessions?from=2026-11-01&to=2026-11-30`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.sessions).toBeDefined();

      // Validate structure contains only aggregated sessions
      const sessionDay = json.sessions['2026-11-25'];
      if (sessionDay) {
        expect(sessionDay.lunch).toBeDefined();
        expect(typeof sessionDay.lunch.count).toBe('number');
        expect(typeof sessionDay.lunch.pax).toBe('number');
        expect((sessionDay as any).name).toBeUndefined();
        expect((sessionDay as any).email).toBeUndefined();
      }
    });
  });
});
