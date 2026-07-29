/**
 * Generate a srcSet string for responsive images.
 * Assumes variants exist at {basePath}-{width}w.{ext}
 */
export function generateSrcSet(basePath: string, widths: number[] = [400, 800, 1200, 1600]): string {
  const ext = basePath.match(/\.[^.]+$/)?.[0] || '.jpg';
  const pathWithoutExt = basePath.replace(/\.[^.]+$/, '');
  return widths
    .map((w) => `${pathWithoutExt}-${w}w${ext} ${w}w`)
    .join(', ');
}

/**
 * Get the smallest fallback src for an image.
 */
export function getFallbackSrc(basePath: string): string {
  const ext = basePath.match(/\.[^.]+$/)?.[0] || '.jpg';
  const pathWithoutExt = basePath.replace(/\.[^.]+$/, '');
  return `${pathWithoutExt}-400w${ext}`;
}
