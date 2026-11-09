import { describe, expect, it } from 'vitest';
import { correctDefaultMenuImage } from './menuRoutes.js';

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
