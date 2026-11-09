import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import dns from 'node:dns';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import imageRoutes from '../routes/imageRoutes';
import orderRoutes from '../routes/orderRoutes';
import invoiceRoutes from '../routes/invoiceRoutes';
import widgetRoutes from '../routes/widgetRoutes';
import { getFirestore, generateSequentialInvoiceNo } from '../firebaseAdmin';
import { signAdminJwt } from '../adminAuth';
import { invoiceQueue } from './invoiceQueue';
import { createMcpOAuthHelpers } from '../mcp/auth';
import { executeMcpTool } from '../mcp/tools';
import { fetchPublicJson } from './remoteResource';
import { commitConsolidatedInvoice } from './consolidatedInvoices';

const db = getFirestore();
let server: Server;
let base: string;
const originalSecret = process.env.ADMIN_JWT_SECRET;
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${signAdminJwt({ uid: 'audit_admin' })}`,
});
beforeAll(async () => {
  invoiceQueue.service.stopBackgroundWorker();
  process.env.ADMIN_JWT_SECRET = 'isolated-audit-secret';
  const app = express();
  app.use(express.json());
  for (const routes of [orderRoutes, invoiceRoutes, widgetRoutes]) app.use('/api', routes);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  base = `http://127.0.0.1:${address.port}/api`;
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  invoiceQueue.service.stopBackgroundWorker();
  if (originalSecret === undefined) delete process.env.ADMIN_JWT_SECRET;
  else process.env.ADMIN_JWT_SECRET = originalSecret;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function mockRemote(body: string, mime: string) {
  vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as never);
  return vi.spyOn(https, 'request').mockImplementation(((
    url: unknown,
    options: unknown,
    callback: (response: unknown) => void
  ) => {
    const request: any = new EventEmitter();
    request.destroy = (error?: Error) => {
      if (error) request.emit('error', error);
      request.emit('close');
    };
    request.end = () =>
      queueMicrotask(() => {
        const response: any = new EventEmitter();
        response.statusCode = 200;
        response.headers = { 'content-type': mime };
        response.resume = () => {};
        response.destroy = () => request.emit('close');
        callback(response);
        response.emit('data', Buffer.from(body));
        response.emit('end');
        request.emit('close');
      });
    return request;
  }) as any);
}

it('rejects remote SVG script content while continuing to serve raster images', async () => {
  const handler = imageRoutes.stack
    .find((layer: any) => layer.route?.path === '/images/proxy')
    .route.stack.at(-1).handle;
  for (const [mime, body, expectedStatus] of [
    ['image/svg+xml', '<svg><script>audit()</script></svg>', 404],
    ['image/png', 'PNG fixture', 200],
  ] as const) {
    vi.restoreAllMocks();
    mockRemote(body, mime);
    const response: any = { code: 200, headers: {}, body: null };
    response.setHeader = (key: string, value: string) => {
      response.headers[key] = value;
    };
    response.status = (status: number) => {
      response.code = status;
      return response;
    };
    response.send = (value: unknown) => {
      response.body = value;
      return response;
    };
    await handler({ query: { url: 'https://example.org/image', noFallback: '1' } }, response);
    expect(response.code).toBe(expectedStatus);
    if (mime === 'image/svg+xml') expect(String(response.body)).not.toContain('<script>');
    else expect(response.headers['Content-Security-Policy']).toContain('sandbox');
  }
});

it('rejects private DNS and CGNAT metadata destinations before opening a socket', async () => {
  const request = vi.spyOn(https, 'request');
  vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
    { address: '127.0.0.1', family: 4 },
  ] as never);
  await expect(fetchPublicJson('https://public-name.example/client.json')).rejects.toThrow(
    'public HTTPS'
  );
  await expect(fetchPublicJson('https://100.64.0.1/client.json')).rejects.toThrow('public HTTPS');
  expect(request).not.toHaveBeenCalled();
});

it('pins a valid JSON metadata connection to its checked address and bounds response size', async () => {
  const request = mockRemote('{"client_id":"fixture"}', 'application/json');
  expect(await fetchPublicJson('https://example.org/client.json')).toEqual({
    client_id: 'fixture',
  });
  const lookup = (request.mock.calls[0][1] as any).lookup;
  const callback = vi.fn();
  lookup('example.org', {}, callback);
  expect(callback).toHaveBeenCalledWith(null, '8.8.8.8', 4);
  vi.restoreAllMocks();
  mockRemote(' '.repeat(65537), 'application/json');
  await expect(fetchPublicJson('https://example.org/client.json')).rejects.toThrow('64 KiB');
});

async function authorization() {
  const helpers = createMcpOAuthHelpers(),
    issuer = 'https://wawasan.example',
    redirect = 'https://example.org/callback';
  const verifier = 'a'.repeat(43);
  const client = await helpers.registerClient({ redirect_uris: [redirect] }, issuer);
  const transaction = await helpers.createAuthorizationTransaction({
    clientId: client.client_id,
    redirectUri: redirect,
    codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
    issuer,
  });
  const auth = await helpers.completeAuthorization(
    transaction.id,
    'audit@example.invalid',
    'audit'
  );
  const exchange = (value = verifier) =>
    helpers.exchangeCode(auth.code, client.client_id, redirect, value, `${issuer}/mcp`, issuer);
  return { helpers, issuer, client, transaction, exchange };
}

it('allows exactly one of two concurrent authorization-code redemptions', async () => {
  const { exchange } = await authorization();
  const results = await Promise.allSettled([exchange(), exchange()]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
});

it('does not burn an authorization code on a wrong PKCE verifier', async () => {
  const { exchange } = await authorization();
  await expect(exchange('wrong')).rejects.toThrow('PKCE');
  expect((await exchange()).access_token).toBeTruthy();
});

it('rotates a refresh token atomically and consumes login authorization once', async () => {
  const { helpers, exchange, issuer, client, transaction } = await authorization();
  await expect(
    helpers.completeAuthorization(transaction.id, 'audit@example.invalid', 'audit')
  ).rejects.toThrow('expired');
  const token = await exchange();
  const refresh = () =>
    helpers.refresh(token.refresh_token, client.client_id, `${issuer}/mcp`, issuer);
  const results = await Promise.allSettled([refresh(), refresh()]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
});

it('rejects one of two conflicting MCP terminal-status changes', async () => {
  const id = 'repair_mcp_race';
  await db.collection('orders').doc(id).set({ status: 'pending' });
  const results = await Promise.all(
    ['rejected', 'cancelled'].map((status) =>
      executeMcpTool('update_order_status', { orderId: id, status }, { scopes: ['wawasan'] })
    )
  );
  expect(results.filter((result) => result.isError)).toHaveLength(1);
  expect(results.filter((result) => !result.isError)).toHaveLength(1);
});

it('preserves pending state when atomic outbox enqueue fails', async () => {
  const id = 'repair_queue_failure';
  await db
    .collection('orders')
    .doc(id)
    .set({
      status: 'pending',
      quantity: 10,
      meals: ['lunch'],
      invoiceNo: 'QT REPAIR-00001',
      email: 'audit@example.invalid',
    });
  vi.spyOn(invoiceQueue.service, 'enqueueInTransaction').mockRejectedValue(
    new Error('simulated outbox failure')
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await fetch(`${base}/widget/set-pricing`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ orderId: id, prices: { lunch: 15 } }),
  });
  expect(response.status).toBe(500);
  const stored = (await db.collection('orders').doc(id).get()).data();
  expect(stored?.status).toBe('pending');
  expect(stored?.invoiceDeliveryStatus).toBeUndefined();
});

it('returns an awaitable error when standalone enqueue cannot persist', async () => {
  vi.spyOn(invoiceQueue.service, 'enqueue').mockRejectedValue(new Error('outbox unavailable'));
  await expect(
    invoiceQueue.enqueue({
      orderId: 'audit',
      orderForPdf: {},
      invoiceNo: 'RW AUDIT',
      recipientEmail: 'audit@example.invalid',
      totalAmount: 10,
      companyName: 'Audit',
      lang: 'en',
    })
  ).rejects.toThrow('outbox unavailable');
});

it('queues exactly one invoice for competing MCP billing actions after committing the record', async () => {
  const id = 'repair_mcp_bill';
  await db
    .collection('orders')
    .doc(id)
    .set({
      status: 'pending',
      quantity: 10,
      meals: ['lunch'],
      invoiceNo: 'QT REPAIR-00002',
      email: 'audit@example.invalid',
    });
  const bill = () =>
    executeMcpTool(
      'bill_order',
      { orderId: id, prices: { lunch: 15 }, sendInvoiceEmail: true },
      { scopes: ['wawasan'] }
    );
  const results = await Promise.all([bill(), bill()]);
  expect(results.filter((result) => !result.isError)).toHaveLength(1);
  const jobs = await db.collection('invoice_outbox').where('orderId', '==', id).get();
  expect(jobs.size).toBe(1);
  expect((await db.collection('orders').doc(id).get()).data()?.status).toBe('billed');
});

it('implements authenticated reservation and idempotent consolidated invoice commit', async () => {
  expect((await fetch(`${base}/admin/next-invoice-number`)).status).toBe(401);
  const reserved = await fetch(`${base}/admin/next-invoice-number`, { headers: headers() });
  expect(reserved.status).toBe(200);
  const { nextInvoiceNo } = await reserved.json();
  const id = 'repair_consolidated_order';
  await db.collection('orders').doc(id).set({
    status: 'billed',
    totalAmount: 150,
    to: 'Audit client',
    billingAddress: 'Test address',
    email: 'audit@example.com',
    invoiceNo: 'RW INDIVIDUAL-AUDIT',
  });
  const request = () =>
    fetch(`${base}/admin/commit-consolidated-invoice`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ orderIds: [id], invoiceNo: nextInvoiceNo }),
    });
  expect((await request()).status).toBe(200);
  await db.collection('orders').doc(id).update({ totalAmount: 999 });
  expect((await request()).status).toBe(200);
  const saved = (await db.collection('consolidated_invoices').doc(nextInvoiceNo).get()).data();
  expect(saved?.orders[0].totalAmount).toBe(150);
  expect((await db.collection('orders').doc(id).get()).data()?.invoiceNo).toBe(
    'RW INDIVIDUAL-AUDIT'
  );
  expect((await db.collection('orders').doc(id).get()).data()?.consolidatedInvoiceNo).toBe(
    nextInvoiceNo
  );
  await expect(
    commitConsolidatedInvoice(['different_order'], nextInvoiceNo, 'audit')
  ).rejects.toThrow('different selection');
  await expect(commitConsolidatedInvoice([id], 'RW INDIVIDUAL-AUDIT', 'audit')).rejects.toThrow(
    'individual invoice'
  );
});

it('prevents a custom consolidated number from colliding with future normal serials', async () => {
  const first = await generateSequentialInvoiceNo(false, '2099-01-01');
  const next = Number(first.split('-')[1]) + 1;
  const number = `RW 2099-${String(next).padStart(5, '0')}`;
  const id = 'repair_consolidated_future';
  await db.collection('orders').doc(id).set({
    status: 'billed',
    totalAmount: 20,
    to: 'Audit future',
    billingAddress: 'Test address',
    email: 'audit@example.com',
  });
  await commitConsolidatedInvoice([id], number, 'audit');
  expect(await generateSequentialInvoiceNo(false, '2099-01-01')).toBe(
    `RW 2099-${String(next + 1).padStart(5, '0')}`
  );
});

it('returns orders beyond the first 100 to the virtualized admin dataset', async () => {
  for (let index = 0; index < 101; index++) {
    await db
      .collection('orders')
      .doc(`repair_list_${index}`)
      .set({ status: 'pending', createdAt: index + 1 });
  }
  const response = await fetch(`${base}/admin/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ action: 'fetch', includeAll: true }),
  });
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.orders.filter((order: any) => order.id.startsWith('repair_list_'))).toHaveLength(101);
  expect(data.orders.some((order: any) => order.id === 'repair_list_0')).toBe(true);
});
