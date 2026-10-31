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
});
