import { describe, expect, it } from 'vitest';
import { DEFAULT_MENU_ITEMS, MENU_ITEMS } from '../constants/menu';
import { getMenuCutoutImage, isMenuCutoutImage } from '../constants/menuImages';
import { resolveDishImage } from './utils';

describe('menu illustration identity', () => {
  it('keeps visually different tea and rice recipes separate in fallback resolution', () => {
    const tea = resolveDishImage({ id: 'teh_o', nameBm: 'Teh O', category: 'drinks' });
    const milkTea = resolveDishImage({ id: 'teh_tarik', nameBm: 'Teh Tarik', category: 'drinks' });
    expect(tea).toBe('/assets/drinks/cutouts/teh_o.webp');
    expect(milkTea).toBe('/assets/drinks/cutouts/teh_tarik.webp');
    expect(resolveDishImage({ id: 'nasi_minyak', nameBm: 'Nasi Minyak' }))
      .toBe('/assets/dishes/cutouts/nasi_minyak.webp');
  });

  it('keeps the original landing photographs separate from order cutouts', () => {
    expect(MENU_ITEMS.map(({ id, image }) => ({ id, image }))).toEqual([
      { id: 'asam-pedas', image: '/assets/dishes/photos/asam-pedas.jpg' },
      { id: 'nasi-lemak', image: '/assets/dishes/photos/nasi-lemak.jpg' },
      { id: 'lontong-singapore', image: '/assets/dishes/photos/lontong-singapore.jpg' },
      { id: 'mee-soto', image: '/assets/dishes/photos/mee-soto.jpg' },
      { id: 'soto-ayam', image: '/assets/dishes/photos/soto-ayam.jpg' },
      { id: 'nasi-campur', image: '/assets/dishes/photos/nasi-campur.jpg' },
      { id: 'teh-tarik', image: '/assets/drinks/teh-tarik.jpg' },
      { id: 'kopi-kampung', image: '/assets/drinks/kopi_kampung.jpg' },
    ]);
    const orderImages = new Set(DEFAULT_MENU_ITEMS.map(item => item.image));
    for (const item of MENU_ITEMS) expect(orderImages.has(item.image)).toBe(false);
  });

  it('uses the same dish across repeated categories without sharing unrelated recipes', () => {
    for (const item of DEFAULT_MENU_ITEMS) expect(item.image).toBe(getMenuCutoutImage(item));
    const names = new Set(DEFAULT_MENU_ITEMS.map(item => item.nameBm));
    const images = new Set(DEFAULT_MENU_ITEMS.map(item => item.image));
    expect(images.size).toBe(names.size);
  });

  it('applies cutout framing only to the local cutout collection', () => {
    expect(isMenuCutoutImage('/assets/drinks/cutouts/kopi_o.webp?v=1')).toBe(true);
    expect(isMenuCutoutImage('/assets/dishes/photos/nasi-lemak.jpg')).toBe(false);
    expect(isMenuCutoutImage('https://example.test/cutouts/coffee.webp')).toBe(false);
  });
});
