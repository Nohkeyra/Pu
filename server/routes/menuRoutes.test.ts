import { describe, expect, it } from 'vitest';
import { correctDefaultMenuImage } from './menuRoutes.js';

describe('correctDefaultMenuImage', () => {
  it('upgrades the existing Nasi Campur default while preserving custom images and the source object', () => {
    const existing = { id: 'nasi_campur', nameBm: 'Nasi Campur', image: '/assets/dishes/photos/nasi-campur.jpg' };
    expect(correctDefaultMenuImage(existing).image).toBe('/assets/dishes/vector/nasi_campur_pilihan.webp');
    expect(existing.image).toBe('/assets/dishes/photos/nasi-campur.jpg');
    const custom = { ...existing, image: '/assets/custom/nasi-campur.jpg' };
    expect(correctDefaultMenuImage(custom)).toBe(custom);
    const renamed = { ...existing, nameBm: 'Nasi Lain' };
    expect(correctDefaultMenuImage(renamed)).toBe(renamed);
  });

  it('upgrades original and phase 1 placeholders without mutating the source', () => {
    for (const image of ['/assets/dishes/vector/pisang_goreng.jpg', '/assets/dishes/vector/popia.png']) {
      const item = { id: 'popia', nameBm: 'Popia', image };
      expect(correctDefaultMenuImage(item).image).toBe('/assets/dishes/vector/popia.webp');
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
    expect(correctDefaultMenuImage({ id: 'bubur_ayam', nameBm: 'Bubur Ayam', image: undefined as string | undefined }).image).toBe('/assets/dishes/vector/bubur_ayam.webp');
    expect(correctDefaultMenuImage({ id: 'mee_siam_petang', nameBm: 'Mee Siam', image: '/assets/dishes/vector/bihun_goreng.jpg' }).image).toBe('/assets/dishes/vector/mee_siam.webp');
    expect(correctDefaultMenuImage({ id: 'air_kordial', nameBm: 'Air Kordial', image: '/assets/drinks/air_kordial.png' }).image).toBe('/assets/drinks/air_kordial.webp');
  });
});
