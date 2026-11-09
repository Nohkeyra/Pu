import { describe, expect, it, vi } from 'vitest';
import { repairDishImage } from './imageRepair';

vi.mock('./utils', () => ({
  getAssetUrl: (path: string) => path,
  resolveDishImage: () => '/assets/dishes/vector/nasi_lemak.jpg',
}));

describe('menu image handling', () => {
  it('does not use another dish when an image is missing', () => {
    expect(repairDishImage({ id: 'popia' }, { noFallback: true })).toBe('');
  });

  it('keeps an explicitly selected photo path', () => {
    expect(repairDishImage({ id: 'x', image: '/assets/dishes/photos/example.jpg' }, { noFallback: true }))
      .toBe('/assets/dishes/photos/example.jpg');
  });

  it('requests no image substitution for external URLs', () => {
    const result = repairDishImage({ id: 'x', image: 'https://example.test/image.jpg' }, { useProxyForExternal: true, noFallback: true });
    const params = new URLSearchParams(result.split('?')[1]);
    expect(params.get('noFallback')).toBe('1');
  });

  it('upgrades a known tea placeholder without confusing milk tea with black tea', () => {
    expect(repairDishImage({ id: 'teh_o', nameBm: 'Teh O', image: '/assets/drinks/teh_tarik.jpg' }, { noFallback: true }))
      .toBe('/assets/drinks/cutouts/teh_o.webp');
  });

  it('preserves a custom image for a known menu item', () => {
    expect(repairDishImage({ id: 'teh_o', nameBm: 'Teh O', image: 'https://example.test/my-tea.jpg' }, { noFallback: true }))
      .toBe('https://example.test/my-tea.jpg');
  });
});
