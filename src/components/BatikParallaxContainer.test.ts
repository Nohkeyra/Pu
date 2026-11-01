import { describe, expect, it } from 'vitest';
import { BatikParallaxContainer } from './BatikParallaxContainer';
import { calculateBatikParallaxOffsets } from '@/lib/parallaxUtils';

describe('BatikParallaxContainer', () => {
  it('exports component as named and default export', () => {
    expect(BatikParallaxContainer).toBeDefined();
    expect(typeof BatikParallaxContainer).toBe('function');
  });

  describe('calculateBatikParallaxOffsets', () => {
    it('returns 0 for both x and y when reduceMotion is true', () => {
      const offsets = calculateBatikParallaxOffsets(0.5, {
        speed: 0.2,
        reduceMotion: true,
      });
      expect(offsets).toEqual({ x: 0, y: 0 });
    });

    it('calculates vertical parallax offset across scroll progress range', () => {
      const start = calculateBatikParallaxOffsets(0, {
        offsetRange: [-24, 24],
        direction: 'vertical',
      });
      const mid = calculateBatikParallaxOffsets(0.5, {
        offsetRange: [-24, 24],
        direction: 'vertical',
      });
      const end = calculateBatikParallaxOffsets(1, {
        offsetRange: [-24, 24],
        direction: 'vertical',
      });

      expect(start).toEqual({ x: 0, y: -24 });
      expect(mid).toEqual({ x: 0, y: 0 });
      expect(end).toEqual({ x: 0, y: 24 });
    });

    it('calculates subtle horizontal drift when direction is subtle-drift', () => {
      const start = calculateBatikParallaxOffsets(0, {
        offsetRange: [-20, 20],
        direction: 'subtle-drift',
      });
      const mid = calculateBatikParallaxOffsets(0.5, {
        offsetRange: [-20, 20],
        direction: 'subtle-drift',
      });
      const end = calculateBatikParallaxOffsets(1, {
        offsetRange: [-20, 20],
        direction: 'subtle-drift',
      });

      expect(start.x).toBeLessThan(0);
      expect(mid.x).toBe(0);
      expect(end.x).toBeGreaterThan(0);
    });

    it('clamps progress to [0, 1] range to avoid runaway offsets', () => {
      const under = calculateBatikParallaxOffsets(-0.5, { offsetRange: [-20, 20] });
      const over = calculateBatikParallaxOffsets(1.5, { offsetRange: [-20, 20] });

      expect(under.y).toBe(-20);
      expect(over.y).toBe(20);
    });
  });
});
