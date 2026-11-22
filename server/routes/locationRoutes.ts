import { Router, type Request, type Response } from 'express';

const router = Router();

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, CachedEntry<unknown>>();
const reverseCache = new Map<string, CachedEntry<unknown>>();

function getFromCache<T>(cache: Map<string, CachedEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(cache: Map<string, CachedEntry<T>>, key: string, data: T): void {
  // Prune older entries if cache grows past 200 items
  if (cache.size > 200) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export interface LocationSuggestion {
  id: string;
  displayName: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

function formatNominatimItem(item: any): LocationSuggestion | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const displayName = typeof item.display_name === 'string' ? item.display_name.trim() : '';
  const parts = displayName.split(',').map((p: string) => p.trim()).filter(Boolean);
  const title = parts[0] || displayName;
  const subtitle = parts.slice(1).join(', ');

  return {
    id: String(item.place_id || `${lat},${lng}`),
    displayName,
    title,
    subtitle,
    lat,
    lng,
  };
}

/**
 * GET /api/locations/search?q=query
 * Free OpenStreetMap Nominatim geocoding proxy for Malaysian delivery venues.
 */
router.get('/locations/search', async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter q must be at least 2 characters long.',
      suggestions: [],
    });
  }

  const normalizedKey = query.toLowerCase().slice(0, 100);
  const cached = getFromCache<LocationSuggestion[]>(searchCache as Map<string, CachedEntry<LocationSuggestion[]>>, normalizedKey);
  if (cached) {
    return res.json({ success: true, suggestions: cached, cached: true });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=my&limit=6&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RestoranWawasan/1.3 (wawasan.orders@gmail.com)',
        'Accept-Language': 'ms, en',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: 'Geocoding service unavailable.',
        suggestions: [],
      });
    }

    const rawList = await response.json();
    const suggestions: LocationSuggestion[] = Array.isArray(rawList)
      ? (rawList.map(formatNominatimItem).filter(Boolean) as LocationSuggestion[])
      : [];

    setInCache<LocationSuggestion[]>(searchCache as Map<string, CachedEntry<LocationSuggestion[]>>, normalizedKey, suggestions);

    return res.json({ success: true, suggestions, cached: false });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return res.status(isAbort ? 504 : 500).json({
      success: false,
      error: isAbort ? 'Geocoding lookup timed out.' : 'Failed to search locations.',
      suggestions: [],
    });
  }
});

/**
 * GET /api/locations/reverse?lat=...&lon=...
 * Free reverse geocoding to resolve address details from dropped pin coordinates.
 */
router.get('/locations/reverse', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon ?? req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({
      success: false,
      error: 'Valid lat and lon coordinates are required.',
    });
  }

  const normalizedKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const cached = getFromCache<any>(reverseCache, normalizedKey);
  if (cached) {
    return res.json({ success: true, ...cached, cached: true });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RestoranWawasan/1.3 (wawasan.orders@gmail.com)',
        'Accept-Language': 'ms, en',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: 'Reverse geocoding service unavailable.',
      });
    }

    const data = (await response.json()) as Record<string, any>;
    const displayName = typeof data?.display_name === 'string' ? data.display_name.trim() : `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    const parts = displayName.split(',').map((p: string) => p.trim()).filter(Boolean);
    const title = parts[0] || displayName;
    const result = {
      displayName,
      title,
      address: data.address || {},
      lat,
      lng: lon,
    };

    setInCache(reverseCache, normalizedKey, result);

    return res.json({ success: true, ...result, cached: false });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return res.status(isAbort ? 504 : 500).json({
      success: false,
      error: isAbort ? 'Reverse geocoding timed out.' : 'Failed to reverse geocode coordinates.',
    });
  }
});

export default router;
