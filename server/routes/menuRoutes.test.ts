import { describe, expect, it } from 'vitest';
import { correctDefaultMenuImage } from './menuRoutes.js';

describe('correctDefaultMenuImage', () => {
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
