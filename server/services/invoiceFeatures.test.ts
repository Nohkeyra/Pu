import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { createHash } from 'node:crypto';
const mail = vi.hoisted(() => ({ send: vi.fn(async () => ({ messageId: 'local-test-only' })) }));
vi.mock('../emailService.js', () => ({ createBrevoTransporter: () => ({ sendMail: mail.send }) }));
import { getFirestore, generateSequentialInvoiceNo } from '../firebaseAdmin';
import { commitConsolidatedInvoice, reserveConsolidatedNumber } from './consolidatedInvoices';
import {
  createInvoiceEmailPreview,
  readInvoicePreviewPdf,
  readInvoiceEmailPreview,
} from './invoiceEmailPreviews';
import { invoiceEmailTemplate, INVOICE_EMAIL_NOTE } from './invoiceEmailTemplate';
import { invoiceQueue } from './invoiceQueue';
import invoiceRoutes from '../routes/invoiceRoutes';
import { signAdminJwt } from '../adminAuth';
const db = getFirestore();
let server: Server, base: string;
const originalSecret = process.env.ADMIN_JWT_SECRET;
const headers = (uid = 'feature-admin') => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${signAdminJwt({ uid })}`,
});
const fixture = (id: string) => ({
  id,
  to: 'Agensi Ujian',
  name: 'Contoh',
  billingAddress: 'Aras 1, Putrajaya',
  email: 'contoh@example.com',
  date: '2026-11-01',
  quantity: 25,
  meals: ['lunch'],
  prices: { lunch: 10.1 },
  totalAmount: 252.5,
  status: 'billed',
  menu: 'Nasi dan ayam',
  notes: 'Nota ringkas',
});
beforeAll(async () => {
  invoiceQueue.service.stopBackgroundWorker();
  process.env.ADMIN_JWT_SECRET = 'isolated-feature-test';
  const app = express();
  app.use(express.json());
  app.use('/api', invoiceRoutes);
  server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server missing');
  base = `http://127.0.0.1:${address.port}/api`;
});
afterAll(async () => {
  invoiceQueue.service.stopBackgroundWorker();
  if (originalSecret === undefined) delete process.env.ADMIN_JWT_SECRET;
  else process.env.ADMIN_JWT_SECRET = originalSecret;
  await new Promise<void>((r) => server.close(() => r()));
});
describe('Invoice snapshots and page allocation', () => {
  it('allocates all pages atomically, keeps cents and reopens the same snapshot after source edits', async () => {
    const ids = Array.from({ length: 26 }, (_, i) => `feature_batch_${i}`);
    for (const id of ids) await db.collection('orders').doc(id).set(fixture(id));
    const number = await reserveConsolidatedNumber('feature-admin');
    const original = db.runTransaction.bind(db);
    const spy = vi.spyOn(db, 'runTransaction').mockImplementation((fn: any) =>
      original(async (tx: any) => {
        let wrote = false;
        const strict = {
          get: (ref: any) => {
            if (wrote) throw new Error('Read after write');
            return tx.get(ref);
          },
          set: (...args: any[]) => {
            wrote = true;
            return tx.set(...args);
          },
          update: (...args: any[]) => {
            wrote = true;
            return tx.update(...args);
          },
        };
        return fn(strict);
      })
    );
    let saved;
    try {
      saved = await commitConsolidatedInvoice(ids, number, 'feature-admin', { includeNotes: true });
    } finally {
      spy.mockRestore();
    }
    expect(saved.pages.length).toBeGreaterThan(1);
    expect(new Set(saved.pages.map((page) => page.invoiceNo)).size).toBe(saved.pages.length);
    expect(saved.pages.reduce((sum, page) => sum + page.totalCents, 0)).toBe(26 * 25250);
    await db.collection('orders').doc(ids[0]).update({ totalAmount: 99999, menu: 'Changed later' });
    const again = await commitConsolidatedInvoice(ids.reverse(), number, 'feature-admin', {
      includeNotes: false,
      lang: 'en',
    });
    expect(again.pages).toEqual(saved.pages);
    expect(again.orders).toEqual(saved.orders);
    expect(again.lang).toBe('bm');
    const different = await reserveConsolidatedNumber('feature-admin');
    await expect(commitConsolidatedInvoice(ids, different, 'feature-admin')).rejects.toThrow(
      /already belongs/
    );
  });
  it('rejects mismatched identities without committing an invoice', async () => {
    for (const id of ['feature_match_a', 'feature_match_b'])
      await db
        .collection('orders')
        .doc(id)
        .set({ ...fixture(id), ...(id.endsWith('b') ? { billingAddress: 'Alamat lain' } : {}) });
    const number = await reserveConsolidatedNumber('feature-admin');
    await expect(
      commitConsolidatedInvoice(['feature_match_a', 'feature_match_b'], number, 'feature-admin')
    ).rejects.toThrow(/must match/);
    expect((await db.collection('consolidated_invoices').doc(number).get()).data()?.state).toBe(
      'reserved'
    );
  });
  it('does not issue the same orders twice under competing invoice numbers', async () => {
    const id = 'feature_race';
    await db.collection('orders').doc(id).set(fixture(id));
    const a = await reserveConsolidatedNumber('feature-admin'),
      b = await reserveConsolidatedNumber('feature-admin');
    const result = await Promise.allSettled([
      commitConsolidatedInvoice([id], a, 'feature-admin'),
      commitConsolidatedInvoice([id], b, 'feature-admin'),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('skips custom registered serials in the shared counter', async () => {
    const first = await generateSequentialInvoiceNo(false, '2088-01-01'),
      next = Number(first.split('-')[1]) + 1,
      number = `RW 2088-${String(next).padStart(5, '0')}`;
    await db.collection('invoice_numbers').doc(number).set({ purpose: 'custom' });
    expect(await generateSequentialInvoiceNo(false, '2088-01-01')).toBe(
      `RW 2088-${String(next + 1).padStart(5, '0')}`
    );
  });
});
describe('Full email preview and exact attachment', () => {
  it('escapes customer content and preserves the closing note in both email versions', () => {
    const template = invoiceEmailTemplate({
      company: '<img src=x onerror=alert(1)>',
      invoiceNumbers: ['RW 2026-00001'],
      total: 25,
      lang: 'bm',
    });
    expect(template.html).not.toContain('<img');
    expect(template.html).toContain('&lt;img');
    expect(template.text).toContain(INVOICE_EMAIL_NOTE);
    expect(template.html).toContain('017 315 7721');
  });
  it('requires a preview, isolates it by admin account and queues only its exact PDF once', async () => {
    expect(
      (
        await fetch(`${base}/admin/invoice-email-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status
    ).toBe(401);
    expect(
      (
        await fetch(`${base}/send-invoice`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ orderId: 'missing', email: 'test@example.com' }),
        })
      ).status
    ).toBe(400);
    const id = 'feature_email';
    await db
      .collection('orders')
      .doc(id)
      .set({ ...fixture(id), invoiceNo: 'RW FEATURE-EMAIL' });
    const response = await fetch(`${base}/admin/invoice-email-preview`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ orderId: id, email: 'recipient@example.com', lang: 'bm' }),
    });
    expect(response.status).toBe(200);
    const { preview } = await response.json();
    const bytes = await readInvoicePreviewPdf(preview.id, 'feature-admin');
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const foreign = await fetch(`${base}/admin/invoice-email-preview/${preview.id}/pdf`, {
      headers: headers('another-admin'),
    });
    expect(foreign.status).toBe(404);
    await db
      .collection('orders')
      .doc(id)
      .update({ totalAmount: 888, menu: 'Edited after preview' });
    const requests = await Promise.all(
      [1, 2].map(() =>
        fetch(`${base}/send-invoice`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ previewId: preview.id, email: 'injected@example.com' }),
        })
      )
    );
    expect(requests.map((r) => r.status)).toEqual([202, 202]);
    const jobs = await db
      .collection('invoice_outbox')
      .where('emailPreviewId', '==', preview.id)
      .get();
    expect(jobs.size).toBe(1);
    await invoiceQueue.service.processQueue();
    expect(mail.send).toHaveBeenCalledTimes(1);
    const sent = mail.send.mock.calls[0][0] as any;
    expect(sent.to).toBe('recipient@example.com');
    expect(sent.subject).toBe(preview.subject);
    expect(sent.html).toBe(preview.html);
    expect(createHash('sha256').update(sent.attachments[0].content).digest('hex')).toBe(
      createHash('sha256').update(bytes).digest('hex')
    );
    expect((await readInvoiceEmailPreview(preview.id, 'feature-admin')).status).toBe('delivered');
  });
  it('detects attachment corruption and expired previews', async () => {
    const id = 'feature_expiry';
    await db
      .collection('orders')
      .doc(id)
      .set({ ...fixture(id), invoiceNo: 'RW FEATURE-EXPIRY' });
    const preview = await createInvoiceEmailPreview(
      { orderId: id, email: 'recipient@example.com' },
      'feature-admin'
    );
    await db
      .collection('invoice_email_preview_chunks')
      .doc(`${preview.id}_0`)
      .update({ chunk: Buffer.from('corrupt').toString('base64') });
    await expect(readInvoicePreviewPdf(preview.id, 'feature-admin')).rejects.toThrow(/integrity/);
    await db
      .collection('invoice_email_previews')
      .doc(preview.id)
      .update({ expiresAt: Date.now() - 1 });
    await expect(readInvoiceEmailPreview(preview.id, 'feature-admin')).rejects.toThrow(/expired/);
  });

  it('supports RWxxxxx in standard mode and enforces strict PETRONAS collector validation & multi-PDF ordering', async () => {
    const collectorOrderId = 'feature_petronas_collector';
    await db
      .collection('orders')
      .doc(collectorOrderId)
      .set({
        ...fixture(collectorOrderId),
        to: 'PETROLIAM NASIONAL BERHAD (PETRONAS)',
        companyCode: '9999', // must re-verify from entity -> 0003
        invoiceNo: 'RW00042',
      });

    // Standard mode accepts sequential RWxxxxx invoice numbers
    const stdRes = await fetch(`${base}/admin/invoice-email-preview`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        orderId: collectorOrderId,
        email: 'customer@petronas.com',
        lang: 'en',
        submissionMode: 'standard',
      }),
    });
    expect(stdRes.status).toBe(200);

    // Collector mode rejects unchecked collectorEligible
    await expect(
      createInvoiceEmailPreview(
        {
          orderId: collectorOrderId,
          email: 'collector@petronas.com',
          submissionMode: 'petronas_collector',
          collectorEligible: false,
        },
        'feature-admin'
      )
    ).rejects.toThrow(/SMART by GEP/);

    // Collector mode rejects non-PDF / ZIP attachments
    await expect(
      createInvoiceEmailPreview(
        {
          orderId: collectorOrderId,
          email: 'collector@petronas.com',
          submissionMode: 'petronas_collector',
          collectorEligible: true,
          supportingFiles: [
            {
              filename: 'archive.zip',
              contentBase64: Buffer.from('%PDF-1.4 dummy').toString('base64'),
            },
          ],
        },
        'feature-admin'
      )
    ).rejects.toThrow(/Only \.pdf/i);

    await expect(
      createInvoiceEmailPreview(
        {
          orderId: collectorOrderId,
          email: 'collector@petronas.com',
          submissionMode: 'petronas_collector',
          collectorEligible: true,
          supportingFiles: [
            {
              filename: 'fake.pdf',
              contentBase64: Buffer.from('PK\x03\x04not-a-pdf').toString('base64'),
            },
          ],
        },
        'feature-admin'
      )
    ).rejects.toThrow(/%PDF-/);

    // Collector mode rejects consolidated invoice batch or RW YYYY-xxxxx invoice numbers
    const legacyId = 'feature_petronas_legacy_no';
    await db
      .collection('orders')
      .doc(legacyId)
      .set({
        ...fixture(legacyId),
        to: 'PETROLIAM NASIONAL BERHAD (PETRONAS)',
        invoiceNo: 'RW 2026-00001',
      });
    await expect(
      createInvoiceEmailPreview(
        {
          orderId: legacyId,
          email: 'collector@petronas.com',
          submissionMode: 'petronas_collector',
          collectorEligible: true,
        },
        'feature-admin'
      )
    ).rejects.toThrow(/RWxxxxx/);

    // Collector mode rejects non-PETRONAS organization even with stale companyCode
    const nonPetronasId = 'feature_non_petronas';
    await db
      .collection('orders')
      .doc(nonPetronasId)
      .set({
        ...fixture(nonPetronasId),
        to: 'Putrajaya Holdings Sdn Bhd',
        companyCode: '0003',
        invoiceNo: 'RW00043',
      });
    await expect(
      createInvoiceEmailPreview(
        {
          orderId: nonPetronasId,
          email: 'collector@petronas.com',
          submissionMode: 'petronas_collector',
          collectorEligible: true,
        },
        'feature-admin'
      )
    ).rejects.toThrow(/4-digit PETRONAS company code/i);

    // Valid collector submission creates exact subject & ordered attachments
    mail.send.mockClear();
    const support1 = Buffer.from('%PDF-1.4\n%Supporting DO 1\n%%EOF');
    const support2 = Buffer.from('%PDF-1.4\n%Supporting PO 2\n%%EOF');
    const previewRes = await fetch(`${base}/admin/invoice-email-preview`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        orderId: collectorOrderId,
        email: 'collector@petronas.com',
        lang: 'en',
        submissionMode: 'petronas_collector',
        collectorEligible: true,
        supportingFiles: [
          { filename: 'DO_Signed.pdf', contentBase64: support1.toString('base64') },
          { filename: 'PO_Reference.pdf', contentBase64: support2.toString('base64') },
        ],
      }),
    });
    expect(previewRes.status).toBe(200);
    const previewJson = await previewRes.json();
    expect(previewJson.preview.subject).toBe('0001 RW00042');
    expect(previewJson.preview.companyCode).toBe('0001');
    expect(previewJson.preview.attachments.map((a: any) => a.filename)).toEqual([
      'Invoice_RW00042.pdf',
      'DO_Signed.pdf',
      'PO_Reference.pdf',
    ]);

    const sendRes = await fetch(`${base}/send-invoice`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ previewId: previewJson.preview.id }),
    });
    expect(sendRes.status).toBe(202);
    await invoiceQueue.service.processQueue();

    expect(mail.send).toHaveBeenCalledTimes(1);
    const sentMail = mail.send.mock.calls[0][0] as any;
    expect(sentMail.subject).toBe('0001 RW00042');
    expect(sentMail.attachments.map((a: any) => a.filename)).toEqual([
      'Invoice_RW00042.pdf',
      'DO_Signed.pdf',
      'PO_Reference.pdf',
    ]);
    expect(Buffer.compare(sentMail.attachments[1].content, support1)).toBe(0);
    expect(Buffer.compare(sentMail.attachments[2].content, support2)).toBe(0);

    const updatedOrder = (await db.collection('orders').doc(collectorOrderId).get()).data();
    expect(updatedOrder?.collectorSubmittedAt).toBeTruthy();
  });
});
