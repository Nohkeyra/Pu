import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { Firestore } from '@google-cloud/firestore';
import menuRoutes, { correctDefaultMenuImage } from './menuRoutes.js';
import { getFirestore } from '../firebaseAdmin.js';
import { signAdminJwt } from '../adminAuth.js';

it('bulk-saves omitted suitability using the real Firestore write validator', async () => {
  const db = getFirestore();
  // Real SDK validation, local memory commits only: no connection is made.
  const validator = new Firestore({ projectId: 'demo-local-audit' });
  const originalBatch = db.batch.bind(db);
  vi.spyOn(db, 'batch').mockImplementation(() => {
    const batch = originalBatch();
    const originalSet = batch.set.bind(batch);
    batch.set = ((ref, data) => {
      validator.batch().set(validator.collection('menu').doc(ref.id), data);
      return originalSet(ref, data);
    }) as typeof batch.set;
    return batch;
  });
  const app = express(); app.use(express.json()); app.use('/api', menuRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/admin/menu`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signAdminJwt({ uid: 'menu-audit' })}` },
      body: JSON.stringify({ items: [{ id: 'audit-menu', nameEn: 'Audit Item', nameBm: 'Item Audit', price: 5, category: 'lunch' }] }),
    });
    expect(response.status).toBe(200);
    expect((await db.collection('menu').doc('audit-menu').get()).data()?.nameBm).toBe('Item Audit');
  } finally {
    vi.restoreAllMocks();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await validator.terminate();
  }
});

describe('menuRoutes ID validation', () => {
  it('rejects malformed menu item IDs with 400 on PUT, DELETE, and bulk POST', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', menuRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signAdminJwt({ uid: 'menu-id-audit' })}`,
    };

    try {
      const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/admin/menu`;
      const badId = encodeURIComponent('../bad!id');

      const putRes = await fetch(`${base}/${badId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ nameEn: 'Valid Name', nameBm: 'Nama Sah', price: 10, category: 'lunch' }),
      });
      expect(putRes.status).toBe(400);

      const delRes = await fetch(`${base}/${badId}`, {
        method: 'DELETE',
        headers,
      });
      expect(delRes.status).toBe(400);

      const postRes = await fetch(base, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: [{ id: 'bad space!', nameEn: 'Item', nameBm: 'Item', price: 5, category: 'lunch' }] }),
      });
      expect(postRes.status).toBe(400);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe('correctDefaultMenuImage', () => {
  it('upgrades original and phase 1 placeholders without mutating the source', () => {
    for (const image of ['/assets/dishes/vector/pisang_goreng.jpg', '/assets/dishes/vector/popia.png']) {
      const item = { id: 'popia', nameBm: 'Popia', image };
      expect(correctDefaultMenuImage(item).image).toBe('/assets/dishes/cutouts/popia.webp');
      expect(item.image).toBe(image);
    }
  });

  it('leaves custom images and renamed entries alone', () => {
    const custom = { id: 'popia', nameBm: 'Popia', image: '/assets/custom/popia.jpg' };
    const renamed = { id: 'popia', nameBm: 'Other item', image: '/assets/dishes/vector/pisang_goreng.jpg' };
    expect(correctDefaultMenuImage(custom)).toBe(custom);
    expect(correctDefaultMenuImage(renamed)).toBe(renamed);
  });

  it('uses a matched illustration for missing or known placeholder images', () => {
    expect(correctDefaultMenuImage({ id: 'bubur_ayam', nameBm: 'Bubur Ayam', image: undefined as string | undefined }).image).toBe('/assets/dishes/cutouts/bubur_ayam.webp');
    expect(correctDefaultMenuImage({ id: 'mee_siam_petang', nameBm: 'Mee Siam', image: '/assets/dishes/vector/bihun_goreng.jpg' }).image).toBe('/assets/dishes/cutouts/mee_siam.webp');
    expect(correctDefaultMenuImage({ id: 'air_kordial', nameBm: 'Air Kordial', image: '/assets/drinks/air_kordial.png' }).image).toBe('/assets/drinks/cutouts/air_kordial.webp');
  });

  it.each([
    ['teh_o', 'Teh O', '/assets/drinks/teh_tarik.jpg', '/assets/drinks/cutouts/teh_o.webp'],
    ['milo_o', 'Milo O', '/assets/drinks/milo_vector.jpg', '/assets/drinks/cutouts/milo_o.webp'],
    ['nasi_minyak', 'Nasi Minyak', '/assets/dishes/vector/nasi_briyani.jpg', '/assets/dishes/cutouts/nasi_minyak.webp'],
    ['kerabu', 'Kerabu', '/assets/dishes/vector/masak_lemak.jpg', '/assets/dishes/cutouts/kerabu.webp'],
    ['tetra_pak_peel_fresh_kecil', 'Tetra Pak Peel Fresh Kecil', '/assets/drinks/mineral_water_vector.jpg', '/assets/drinks/cutouts/tetra_pak_peel_fresh_kecil.webp'],
  ])('matches %s to its own illustration when reading legacy menu data', (id, nameBm, image, expected) => {
    const saved = { id, nameBm, image, price: 9.5, available: false };
    const corrected = correctDefaultMenuImage(saved);
    expect(corrected).toEqual({ ...saved, image: expected });
    expect(saved.image).toBe(image);
  });
});
