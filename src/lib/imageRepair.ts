import { getAssetUrl, resolveDishImage } from './utils';

export interface ImageRepairOptions {
  useProxyForExternal?: boolean;
  dishId?: string;
  category?: string;
  fallbackIcon?: 'utensils' | 'coffee' | 'drink' | 'food';
}

/**
 * Clean and normalize image path or URL
 */
export function normalizeImageUrl(src: string): string {
  if (!src) return '';
  let url = src.trim();

  // Strip legacy /src/assets/ prefix
  if (url.includes('/src/assets/')) {
    url = url.replace('/src/assets/', '/assets/');
  }

  // Handle local relative paths
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    return getAssetUrl(url);
  }

  return url;
}

/**
 * Wraps external images in our anti-hotlink server proxy URL if enabled.
 */
export function getProxiedOrRepairedImageUrl(src: string, options: ImageRepairOptions = {}): string {
  const normalized = normalizeImageUrl(src);
  if (!normalized) {
    return getAssetUrl('/assets/dishes/vector/nasi_lemak.jpg');
  }

  // If it's an external HTTP/HTTPS URL, proxy it through our server
  if (options.useProxyForExternal && (normalized.startsWith('http://') || normalized.startsWith('https://'))) {
    const params = new URLSearchParams({
      url: normalized,
      ...(options.dishId ? { dish: options.dishId } : {}),
      ...(options.category ? { category: options.category } : {})
    });
    return `/api/images/proxy?${params.toString()}`;
  }

  return normalized;
}

/**
 * Intelligent Image Repair Function:
 * Resolves a item object (with id, nameEn, nameBm, category, image) into a guaranteed valid image URL.
 * If the current image is missing or broken, automatically repairs it using local vector assets or proxy.
 */
export function repairDishImage(item: any, options: ImageRepairOptions = {}): string {
  if (!item) {
    return getAssetUrl('/assets/dishes/vector/nasi_lemak.jpg');
  }

  // 1. If explicit valid image exists and isn't a broken photo path
  if (item.image && typeof item.image === 'string' && item.image.trim()) {
    const cleanImg = item.image.trim();
    if (!cleanImg.includes('/photos/')) {
      return getProxiedOrRepairedImageUrl(cleanImg, { ...options, dishId: item.id, category: item.category });
    }
  }

  // 2. Resolve via smart vector image matcher in utils
  const resolved = resolveDishImage(item);
  return getAssetUrl(resolved);
}

/**
 * Generates an SVG data URI as an emergency in-memory fallback visual
 */
export function generateFallbackSvgDataUri(title: string, category: string = 'food'): string {
  const cleanTitle = (title || 'Wawasan Special')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  const isDrink = category === 'drink' || category === 'drinks' || cleanTitle.toLowerCase().includes('teh') || cleanTitle.toLowerCase().includes('kopi');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#78350f" />
          <stop offset="100%" stop-color="#451a03" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <circle cx="200" cy="130" r="45" fill="#f59e0b" opacity="0.2" />
      <text x="200" y="140" font-family="sans-serif" font-weight="bold" font-size="32" fill="#fef3c7" text-anchor="middle">
        ${isDrink ? '🥤' : '🍛'}
      </text>
      <text x="200" y="200" font-family="sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">
        ${cleanTitle}
      </text>
      <text x="200" y="225" font-family="sans-serif" font-size="11" fill="#f59e0b" text-anchor="middle" letter-spacing="2">
        RESTORAN WAWASAN
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
