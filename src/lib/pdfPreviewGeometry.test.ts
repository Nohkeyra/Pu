import { describe, expect, it } from 'vitest';
import { fitPdfPage, pdfPageSizeLabel } from './pdfPreviewGeometry';

describe('PDF original size and fit geometry', () => {
  it('fits an A4 landscape page inside a portrait phone without cropping or stretching', () => {
    const width = 841.89;
    const height = 595.28;
    const scale = fitPdfPage(width, height, 360, 600);
    expect(scale * width).toBeCloseTo(360);
    expect(scale * height).toBeLessThanOrEqual(600);
    expect((scale * width) / (scale * height)).toBeCloseTo(width / height);
    expect(pdfPageSizeLabel(width, height)).toBe('A4 · 297 × 210 mm');
  });

  it('fits an A4 portrait page inside a wide desktop without cropping', () => {
    const scale = fitPdfPage(595.28, 841.89, 1000, 550);
    expect(scale * 841.89).toBeCloseTo(550);
    expect(scale * 595.28).toBeLessThanOrEqual(1000);
    expect(pdfPageSizeLabel(595.28, 841.89)).toBe('A4 · 210 × 297 mm');
  });

  it('uses actual custom PDF dimensions rather than forcing A4', () => {
    expect(pdfPageSizeLabel(612, 792)).toBe('216 × 279 mm');
  });
});
