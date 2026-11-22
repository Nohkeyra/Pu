import { describe, it, expect } from 'vitest';
import { validCoordinates, RESTORAN_COORDS } from '@/lib/riderTracking';

export interface RawNominatimResult {
  place_id?: number | string;
  display_name?: string;
  lat?: string | number;
  lon?: string | number;
}

export function parseLocationSuggestion(item: RawNominatimResult) {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!validCoordinates(lat, lng)) return null;

  const displayName = typeof item.display_name === 'string' ? item.display_name.trim() : '';
  const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean);
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

export function formatPinStatus(coords: { lat: number; lng: number } | undefined, lang: 'bm' | 'en' = 'bm'): string {
  if (!coords || !validCoordinates(coords.lat, coords.lng)) {
    return lang === 'bm'
      ? 'Sentuh mana-mana titik pada peta untuk letak pin'
      : 'Tap anywhere on the map to place a pin';
  }
  return lang === 'bm'
    ? `📍 Pin Ditetapkan: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
    : `📍 Pinned at: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

describe('locationPickerLogic', () => {
  it('parses valid Nominatim results into clean suggestion models', () => {
    const raw: RawNominatimResult = {
      place_id: 998822,
      display_name: 'Dewan Putra, Jalan P8, Presint 8, Putrajaya, 62250, Malaysia',
      lat: '2.9341',
      lon: '101.6888',
    };

    const parsed = parseLocationSuggestion(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe('998822');
    expect(parsed?.title).toBe('Dewan Putra');
    expect(parsed?.subtitle).toBe('Jalan P8, Presint 8, Putrajaya, 62250, Malaysia');
    expect(parsed?.lat).toBe(2.9341);
    expect(parsed?.lng).toBe(101.6888);
  });

  it('rejects malformed or invalid coordinate items', () => {
    expect(parseLocationSuggestion({ lat: 'not-a-number', lon: '101.6' })).toBeNull();
    expect(parseLocationSuggestion({ lat: 200, lon: 101.6 })).toBeNull(); // Out of latitude bounds
    expect(parseLocationSuggestion({ lat: 2.9, lon: 400 })).toBeNull(); // Out of longitude bounds
  });

  it('formats pin status strings appropriately for both languages', () => {
    expect(formatPinStatus(undefined, 'bm')).toContain('Sentuh');
    expect(formatPinStatus(undefined, 'en')).toContain('Tap');
    expect(formatPinStatus(RESTORAN_COORDS, 'bm')).toContain('2.92841');
    expect(formatPinStatus(RESTORAN_COORDS, 'en')).toContain('2.92841');
  });
});
