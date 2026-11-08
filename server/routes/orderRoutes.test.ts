import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import orderRoutes, { deriveEventDate, validateAdminOrderUpdate } from './orderRoutes.js';
import { signAdminJwt } from '../adminAuth.js';
import { getFirestore } from '../firebaseAdmin.js';
import * as firebaseAdminModule from '../firebaseAdmin.js';

describe('Order Routes Role Boundaries, Pricing Invariants & Data Protection', () => {
  it('normalizes the same supported dates as the order validator', () => {
    expect(deriveEventDate({ eventDate: '25/12/2026' })).toBe('2026-12-25');
    expect(deriveEventDate({ eventDate: '31/01/2027' })).toBe('2027-01-31');
    expect(deriveEventDate({ eventDate: '2026-02-31' })).toBeNull();
    expect(deriveEventDate({ eventDate: '2026-12-25' })).toBe('2026-12-25');
  });

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

    // Authenticated and email-verified customer is the default for valid create tests.
    vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({
      uid: 'actual_user', email: 'customer@example.com', email_verified: true, admin: false,
    });

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

  it('preserves the explicit delivery/pickup mode on customer submissions', async () => {
    for (const delivery of ['delivery', 'pickup']) {
      const response = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer verified_customer' },
        body: JSON.stringify({ name: 'Audit Customer', contact: '0100000000', email: 'audit@example.invalid',
          eventDate: '2026-12-15', time: '08:30', quantity: 10, meals: ['breakfast'], delivery }),
      });
      expect(response.status).toBe(200);
      const { id } = await response.json();
      expect((await getFirestore().collection('orders').doc(id).get()).data()?.delivery).toBe(delivery);
    }
  });

  describe('Admin update field constraints', () => {
    it('rejects mutations to server-owned order identity and deletion flags', () => {
      expect(validateAdminOrderUpdate({ userId: 'different-user' })).toContain('Unsupported');
      expect(validateAdminOrderUpdate({ deletedByAdmin: false })).toContain('Unsupported');
      expect(validateAdminOrderUpdate({ createdAt: '2020-01-01' })).toContain('Unsupported');
      expect(validateAdminOrderUpdate({ 'prices.lunch': 0 })).toContain('Unsupported');
    });

    it('accepts existing admin billing payloads, rejects nonfinite prices and totals', () => {
      expect(validateAdminOrderUpdate({
        status: 'billed', prices: { lunch: 14.5 }, totalAmount: 145,
        invoiceNo: 'RW 2026-00001', approvedAt: new Date().toISOString(),
      })).toBeNull();
      expect(validateAdminOrderUpdate({ prices: { lunch: Infinity } })).toBeTruthy();
      expect(validateAdminOrderUpdate({ totalAmount: NaN })).toBeTruthy();
    });

    it('rejects protected-field writes at the HTTP boundary', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'update', orderId: 'any', data: { userId: 'attacker' } }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Client / Guest Price & Total Manipulation Immunity', () => {
    it('rejects missing status in admin status updates instead of writing undefined', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('status_missing_test').set({ status: 'pending' });
      const res = await fetch(`${baseUrl}/api/admin/orders/status_missing_test/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const doc = await db.collection('orders').doc('status_missing_test').get();
      expect(doc.data()?.status).toBe('pending');
    });

    it('serializes competing admin status updates using a Firestore transaction', async () => {
      const orderId = `admin_race_${Date.now()}`;
      const db = getFirestore();
      await db.collection('orders').doc(orderId).set({
        status: 'pending',
        invoiceNo: 'RW 0001',
        eventDate: '2027-11-20',
      });

      // Both actions are permitted from pending, but neither terminal status
      // may transition to the other. A stale get() -> update() race would
      // incorrectly allow both writes.
      const headers = {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      };
      const [patchResult, postResult] = await Promise.all([
        fetch(`${baseUrl}/api/admin/orders/${orderId}/status`, {
          method: 'PATCH', headers, body: JSON.stringify({ status: 'cancelled' }),
        }),
        fetch(`${baseUrl}/api/admin/orders`, {
          method: 'POST', headers,
          body: JSON.stringify({ action: 'update', orderId, data: { status: 'rejected' } }),
        }),
      ]);

      expect([patchResult.status, postResult.status].sort()).toEqual([200, 400]);
      const saved = await db.collection('orders').doc(orderId).get();
      expect(['cancelled', 'rejected']).toContain(saved.data()?.status);
    });

    it('rejects non-object admin order updates with 400', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'update', orderId: 'test_id', data: null }),
      });
      expect(res.status).toBe(400);
    });

    const orderPayload = {
      name: 'Customer', contact: '+60123456789', email: 'customer@example.com',
      eventDate: '2027-11-20', time: '12:00', quantity: 10, meals: ['lunch'],
    };

    it('creates only one order when the same request arrives concurrently', async () => {
      const key = `concurrent_${Date.now()}`;
      const requests = Array.from({ length: 4 }, () => fetch(`${baseUrl}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-verified' },
        body: JSON.stringify({ ...orderPayload, idempotencyKey: key }),
      }));
      const responses = await Promise.all(requests);
      expect(responses.every(response => response.status === 200)).toBe(true);
      const bodies = await Promise.all(responses.map(response => response.json()));
      expect(new Set(bodies.map(body => body.id)).size).toBe(1);
      expect(bodies.filter(body => body.duplicate === false)).toHaveLength(1);
    });

    it('rejects guest orders with or without a claimed user', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe('SIGN_IN_REQUIRED');
    });

    it('rejects unverified email accounts even with a valid Firebase session', async () => {
      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({ uid: 'actual_user', email_verified: false });
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer signed-in' },
        body: JSON.stringify(orderPayload),
      });
      expect(res.status).toBe(403);
      expect((await res.json()).code).toBe('EMAIL_VERIFICATION_REQUIRED');
    });

    it('requires a verified order-owner session for preliminary invoice delivery', async () => {
      const res = await fetch(`${baseUrl}/api/orders/order_123/send-preliminary-invoice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@example.com' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects verified accounts that do not own the requested invoice', async () => {
      await getFirestore().collection('orders').doc('not_my_invoice').set({
        userId: 'someone_else', email: 'customer@example.com', status: 'pending',
      });
      const res = await fetch(`${baseUrl}/api/orders/not_my_invoice/send-preliminary-invoice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-verified' },
        body: JSON.stringify({ email: 'customer@example.com' }),
      });
      expect(res.status).toBe(403);
    });

    it('rejects a claimed user without an authenticated session', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderPayload, userId: 'victim' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects an owner different from the verified user', async () => {
      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({ uid: 'actual_user', email_verified: true });
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
        body: JSON.stringify({ ...orderPayload, userId: 'victim' }),
      });
      expect(res.status).toBe(403);
    });

    it('stores the verified UID as the owner', async () => {
      vi.spyOn(firebaseAdminModule, 'verifyFirebaseIdToken').mockResolvedValue({ uid: 'actual_user', email_verified: true });
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
        body: JSON.stringify({ ...orderPayload, userId: 'actual_user' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      const doc = await getFirestore().collection('orders').doc(json.id).get();
      expect(doc.data()?.userId).toBe('actual_user');
    });
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
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-verified' },
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
      expect(check.exists).toBe(true);
      expect(check.data()?.deletedByUser).toBe(true);
    });
  });

  it('preserves invoiced records when admin removes a customer-hidden order', async () => {
    const db = getFirestore();
    await db.collection('orders').doc('invoiced_retained').set({
      userId: 'owner', status: 'billed', invoiceNo: 'RW 991', deletedByUser: true,
    });
    const response = await fetch(`${baseUrl}/api/admin/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', orderId: 'invoiced_retained' }),
    });
    expect(response.status).toBe(200);
    const saved = await db.collection('orders').doc('invoiced_retained').get();
    expect(saved.exists).toBe(true);
    expect(saved.data()?.deletedByAdmin).toBe(true);
    expect(saved.data()?.invoiceNo).toBe('RW 991');
  });

  describe('Customer poke ownership', () => {
    it('rejects unauthenticated access to guest orders', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('guest_poke').set({ status: 'pending', userId: null });
      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue(null);
      const res = await fetch(`${baseUrl}/api/orders/poke`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'guest_poke' }),
      });
      expect(res.status).toBe(403);
      const check = await db.collection('orders').doc('guest_poke').get();
      expect(check.data()?.lastPokedAt).toBeUndefined();
    });

    it('only lets the authenticated owner poke a named order', async () => {
      const db = getFirestore();
      await db.collection('orders').doc('owned_poke').set({ status: 'pending', userId: 'owner_1' });
      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('owner_2');
      const request = () => fetch(`${baseUrl}/api/orders/poke`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'owned_poke' }),
      });
      expect((await request()).status).toBe(403);
      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('owner_1');
      expect((await request()).status).toBe(200);
    });
  });

  describe('Calendar note reads', () => {
    it('keeps customer notes private while allowing an authorized administrator to view the month', async () => {
      const db = getFirestore();
      const month = '2027-08';
      const date = `${month}-14`;
      await db.collection('calendar_notes').doc('notes_private_a').set({ date, note: 'Owned note', userId: 'member_a', userName: 'Member' });
      await db.collection('calendar_notes').doc('notes_private_b').set({ date, note: 'Other note', userId: 'member_b', userName: 'Member' });
      await db.collection('calendar_notes').doc('notes_previous_month').set({ date: '2027-07-14', note: 'Old note', userId: 'member_a' });

      const path = `${baseUrl}/api/calendar-notes?month=${month}`;
      const anonymous = await fetch(path);
      expect(anonymous.status).toBe(401);
      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('member_a');
      const member = await fetch(path, { headers: { Authorization: 'Bearer test-member-id-token' } });
      expect(member.status).toBe(200);
      const memberIds = (await member.json()).notes.map((note: { id: string }) => note.id);
      expect(memberIds).toContain('notes_private_a');
      expect(memberIds).not.toContain('notes_private_b');
      expect(memberIds).not.toContain('notes_previous_month');

      const admin = await fetch(path, { headers: { Authorization: `Bearer ${adminToken}` } });
      expect(admin.status).toBe(200);
      const adminIds = (await admin.json()).notes.map((note: { id: string }) => note.id);
      expect(adminIds).toEqual(expect.arrayContaining(['notes_private_a', 'notes_private_b']));
      expect(adminIds).not.toContain('notes_previous_month');
    });

    it('rejects invalid note months before querying Firestore', async () => {
      const invalid = await fetch(`${baseUrl}/api/calendar-notes?month=2027-13`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(invalid.status).toBe(400);
    });
  });

  describe('Calendar note ownership', () => {
    it('requires authentication and prevents customers deleting other customers notes', async () => {
      const db = getFirestore();
      const date = '2026-11-25';
      const url = `${baseUrl}/api/calendar-notes`;
      const unauthorized = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, note: 'Kitchen alert' }) });
      expect(unauthorized.status).toBe(401);

      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('customer_a');
      const saved = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer-test-token' },
        body: JSON.stringify({ date, note: 'Kitchen alert' }),
      });
      expect(saved.status).toBe(200);
      const savedNote = await db.collection('calendar_notes').doc(`customer_a_${date}`).get();
      expect(savedNote.data()?.userId).toBe('customer_a');

      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('customer_b');
      const blocked = await fetch(`${url}/customer_a_${date}`, {
        method: 'DELETE', headers: { Authorization: 'Bearer another-customer-token' },
      });
      expect(blocked.status).toBe(403);
      expect((await db.collection('calendar_notes').doc(`customer_a_${date}`).get()).exists).toBe(true);

      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('customer_a');
      const removed = await fetch(`${url}/customer_a_${date}`, {
        method: 'DELETE', headers: { Authorization: 'Bearer customer-test-token' },
      });
      expect(removed.status).toBe(200);
    });

    it('rejects invalid calendar dates and excessive notes', async () => {
      vi.spyOn(firebaseAdminModule, 'verifyCustomerIdToken').mockResolvedValue('customer_a');
      for (const payload of [{ date: '2026-02-31', note: 'Invalid date' }, { date: '2026-11-25', note: 'a'.repeat(501) }]) {
        const result = await fetch(`${baseUrl}/api/calendar-notes`, {
          method: 'POST', headers: { Authorization: 'Bearer customer-test-token', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        expect(result.status).toBe(400);
      }
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

