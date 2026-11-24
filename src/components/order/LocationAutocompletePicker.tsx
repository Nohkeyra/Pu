import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  Loader2,
  Check,
  Navigation,
  Maximize2,
  Minimize2,
  RotateCcw,
  AlertCircle,
  X,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RESTORAN_COORDS, validCoordinates } from '@/lib/riderTracking';

export interface LocationSuggestion {
  id: string;
  displayName: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

export interface SavedLocation {
  id: string;
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

interface LocationAutocompletePickerProps {
  value: string;
  coordinates?: { lat: number; lng: number };
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  onDetectLocation: () => Promise<void> | void;
  isDetectingLocation: boolean;
  savedLocations?: SavedLocation[];
  fieldError?: string;
  tText: (en: string, bm: string) => string;
}

const venuePinIcon = () =>
  L.divIcon({
    className: 'wawasan-venue-marker',
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -40],
    html: `
      <div style="position:relative; width:38px; height:46px; display:flex; align-items:center; justify-content:center; cursor:grab;">
        <svg viewBox="0 0 24 24" width="38" height="46" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35)); transition: transform 0.15s ease;">
          <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z" fill="#e11d48" stroke="#ffffff" stroke-width="1.8"/>
          <circle cx="12" cy="10" r="3.2" fill="#ffffff"/>
        </svg>
      </div>
    `,
  });

export function LocationAutocompletePicker({
  value,
  coordinates,
  onChange,
  onDetectLocation,
  isDetectingLocation,
  savedLocations = [],
  fieldError,
  tText,
}: LocationAutocompletePickerProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<typeof L.map> | null>(null);
  const markerRef = useRef<ReturnType<typeof L.marker> | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialCoordsRef = useRef(coordinates);
  const handleReverseGeocodeRef = useRef<(lat: number, lng: number) => Promise<void>>(async () => {});

  const coordLat = coordinates?.lat;
  const coordLng = coordinates?.lng;

  // Sync external value changes into local input if different
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Clean up pending debounce timers and fetches on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch location suggestions with server proxy + client Nominatim fallback
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      setIsDropdownOpen(false);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);

    try {
      // 1. Try local backend proxy route first (identifies User-Agent and caches)
      let results: LocationSuggestion[] = [];
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            results = data.suggestions;
          }
        }
      } catch {
        // Fall back to direct Nominatim if server route unavailable
      }

      // 2. Direct client OpenStreetMap Nominatim fallback
      if (results.length === 0 && !controller.signal.aborted) {
        const directUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=my&limit=6&q=${encodeURIComponent(
          searchQuery.trim()
        )}`;
        const directRes = await fetch(directUrl, { signal: controller.signal });
        if (directRes.ok) {
          const raw = await directRes.json();
          if (Array.isArray(raw)) {
            results = raw
              .map((item: { lat?: unknown; lon?: unknown; display_name?: unknown; place_id?: unknown }) => {
                const lat = Number(item.lat);
                const lng = Number(item.lon);
                if (!validCoordinates(lat, lng)) return null;
                const displayName = typeof item.display_name === 'string' ? item.display_name.trim() : '';
                const parts = displayName.split(',').map((p: string) => p.trim()).filter(Boolean);
                return {
                  id: String(item.place_id || `${lat},${lng}`),
                  displayName,
                  title: parts[0] || displayName,
                  subtitle: parts.slice(1).join(', '),
                  lat,
                  lng,
                };
              })
              .filter(Boolean) as LocationSuggestion[];
          }
        }
      }

      if (!controller.signal.aborted) {
        setSuggestions(results);
        setIsDropdownOpen(results.length > 0);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setSuggestions([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  // Handle typing with 320ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setQuery(text);
    onChange(text, coordinates);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length >= 3) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(text);
      }, 320);
    } else {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
    }
  };

  // Reverse geocode when pin is placed or dragged on the map
  const handleReverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setIsReverseGeocoding(true);
      try {
        let displayName = '';
        // 1. Try server proxy
        try {
          const res = await fetch(`/api/locations/reverse?lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.displayName) displayName = data.displayName;
          }
        } catch {
          // Fall back to direct Nominatim
        }

        // 2. Direct Nominatim fallback
        if (!displayName) {
          const directRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (directRes.ok) {
            const data = await directRes.json();
            if (data.display_name) displayName = data.display_name;
          }
        }

        if (displayName) {
          setQuery(displayName);
          onChange(displayName, { lat, lng });
          setPinStatus(
            tText(
              `📍 Pin set: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              `📍 Pin ditetapkan: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            )
          );
        } else {
          onChange(value || `${lat.toFixed(6)}, ${lng.toFixed(6)}`, { lat, lng });
          setPinStatus(`📍 Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        onChange(value || `${lat.toFixed(6)}, ${lng.toFixed(6)}`, { lat, lng });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [onChange, tText, value]
  );

  useEffect(() => {
    handleReverseGeocodeRef.current = handleReverseGeocode;
  }, [handleReverseGeocode]);

  // Initialize Leaflet map once on mount so typing or coordinate updates never recreate the map
  useEffect(() => {
    const mapElement = mapElementRef.current;
    if (!mapElement || mapInstanceRef.current) return;

    const initial = initialCoordsRef.current;
    const hasInitialCoords = initial && validCoordinates(initial.lat, initial.lng);
    const initialCenter: [number, number] = hasInitialCoords
      ? [initial.lat, initial.lng]
      : [RESTORAN_COORDS.lat, RESTORAN_COORDS.lng];

    const instance = L.map(mapElement, {
      zoomControl: false,
      attributionControl: true,
    }).setView(initialCenter, hasInitialCoords ? 16 : 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(instance);

    L.control.zoom({ position: 'bottomright' }).addTo(instance);

    // Click anywhere on the map to set / adjust the pin
    instance.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const newMarker = L.marker([lat, lng], {
          icon: venuePinIcon(),
          draggable: true,
        }).addTo(instance);
        markerRef.current = newMarker;
        newMarker.on('dragend', () => {
          const pos = newMarker.getLatLng();
          void handleReverseGeocodeRef.current(pos.lat, pos.lng);
        });
      }
      void handleReverseGeocodeRef.current(lat, lng);
    });

    mapInstanceRef.current = instance;

    // Handle resize observer
    const observer = new ResizeObserver(() => {
      instance.invalidateSize();
    });
    observer.observe(mapElement);

    return () => {
      observer.disconnect();
      instance.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position on coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (coordLat !== undefined && coordLng !== undefined && validCoordinates(coordLat, coordLng)) {
      const targetLatLng: [number, number] = [coordLat, coordLng];
      if (!markerRef.current) {
        const marker = L.marker(targetLatLng, {
          icon: venuePinIcon(),
          draggable: true,
        }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          void handleReverseGeocodeRef.current(pos.lat, pos.lng);
        });
        markerRef.current = marker;
        map.setView(targetLatLng, Math.max(map.getZoom(), 16), { animate: true });
      } else {
        const currentPos = markerRef.current.getLatLng();
        const moved =
          Math.abs(currentPos.lat - coordLat) > 1e-6 || Math.abs(currentPos.lng - coordLng) > 1e-6;
        if (moved) {
          markerRef.current.setLatLng(targetLatLng);
          map.setView(targetLatLng, Math.max(map.getZoom(), 16), { animate: true });
        }
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
      setPinStatus(null);
    }
  }, [coordLat, coordLng]);

  // Handle selecting a suggestion
  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.displayName);
    onChange(suggestion.displayName, { lat: suggestion.lat, lng: suggestion.lng });
    setIsDropdownOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([suggestion.lat, suggestion.lng], 16, { animate: true });
    }
    setPinStatus(
      tText(
        `📍 Venue pinned to ${suggestion.title}`,
        `📍 Lokasi dipinkan di ${suggestion.title}`
      )
    );
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recenter map on current coordinates or restaurant
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const center: [number, number] =
      coordinates && validCoordinates(coordinates.lat, coordinates.lng)
        ? [coordinates.lat, coordinates.lng]
        : [RESTORAN_COORDS.lat, RESTORAN_COORDS.lng];
    mapInstanceRef.current.setView(center, 16, { animate: true });
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <div className="flex justify-between items-center">
        <Label
          htmlFor="contact-location"
          className="text-xs font-bold text-deep-forest dark:text-[var(--ui-legacy-white)] uppercase tracking-wider"
        >
          {tText('Event Venue Address & Map Pin', 'Lokasi / Alamat Majlis & Pin Peta *')}
        </Label>
        <button
          type="button"
          onClick={onDetectLocation}
          disabled={isDetectingLocation}
          className="inline-flex items-center gap-1 microcopy-12 font-bold text-[var(--ui-action)] hover:underline transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isDetectingLocation ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{tText('Detecting GPS...', 'Mengesan GPS...')}</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5" />
              <span>{tText('Autofill GPS', 'Kesan Lokasi GPS')}</span>
            </>
          )}
        </button>
      </div>

      {savedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
          <span className="microcopy-12-upper text-stone font-bold uppercase tracking-wider block w-full text-xs">
            {tText('Choose from Saved Locations:', 'Pilih dari Lokasi Disimpan:')}
          </span>
          {savedLocations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                setQuery(loc.address);
                onChange(loc.address, loc.coordinates);
                if (loc.coordinates && mapInstanceRef.current) {
                  mapInstanceRef.current.setView(
                    [loc.coordinates.lat, loc.coordinates.lng],
                    16,
                    { animate: true }
                  );
                }
              }}
              className={cn(
                'px-3 py-1.5 bg-cream/30 dark:bg-card border border-stone/10 hover:border-[var(--color-sunshine-cta)] microcopy-12 font-medium rounded-xl text-deep-forest dark:text-stone-200 transition-all cursor-pointer text-xs',
                query === loc.address &&
                  'border-[var(--color-sunshine-cta)] bg-[var(--color-sunshine-cta)]/10 ring-1 ring-[var(--color-sunshine-cta)] font-bold'
              )}
            >
              {loc.label}
            </button>
          ))}
        </div>
      )}

      {/* Address Textarea with Autocomplete Input Controls */}
      <div className="relative space-y-2">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2">
          <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">💡 Tip:</span>
          <span>
            {tText(
              'If map search cannot find specific room or floor names, simply search and select the main building or street in the box above, then tap/drag the red pin on the map below to the exact drop-off spot.',
              'Jika peta tidak menemui nama bilik atau aras tertentu, anda hanya perlu cari bangunan utama di atas, kemudian sentuh atau tarik pin merah pada peta di bawah ke lokasi sebenar!'
            )}
          </span>
        </div>

        <div className="relative">
          <textarea
            id="contact-location"
            data-tour="step3-location"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setIsDropdownOpen(true);
            }}
            placeholder={tText(
              'e.g. Dewan Banquet, Aras 3, Blok B, Putrajaya (or select from map pin below)',
              'cth: Dewan Banquet, Aras 3, Bilik Mesyuarat Utama, Putrajaya (atau pilih dari peta)'
            )}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? 'location-error' : undefined}
            rows={2}
            className="w-full rounded-2xl border border-stone-200/80 dark:border-white/10 bg-white dark:bg-card px-3.5 py-2.5 text-xs sm:text-sm text-deep-forest dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--ui-action)]/30 focus:border-[var(--ui-action)] transition-all resize-y min-h-[64px]"
          />

          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-[var(--ui-action)] animate-spin" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onChange('', undefined);
                  setSuggestions([]);
                  setIsDropdownOpen(false);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title={tText('Clear address', 'Kosongkan alamat')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 text-stone-400" />
            )}
          </div>
        </div>

        {/* Floating Suggestions Dropdown */}
        {isDropdownOpen && suggestions.length > 0 && (
          <div
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden p-1.5 space-y-1 divide-y divide-stone-100 dark:divide-stone-800 animate-in fade-in-50 duration-150"
          >
            <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[var(--ui-action)]" />
                {tText('Location Suggestions (Tap to Pin 📍)', 'Cadangan Lokasi (Pilih untuk Pin 📍)')}
              </span>
              <span className="text-[9px] font-normal normal-case text-stone-400">
                OpenStreetMap (Percuma)
              </span>
            </div>

            {suggestions.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  'w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer text-xs',
                  idx === activeIndex
                    ? 'bg-amber-500/10 text-deep-forest dark:text-white border-l-2 border-[var(--ui-action)]'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/[0.04]'
                )}
              >
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs leading-snug truncate text-deep-forest dark:text-stone-100">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5 line-clamp-1">
                    {item.subtitle || item.displayName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Leaflet Pin Map Preview */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-white/10 overflow-hidden bg-stone-50 dark:bg-card shadow-xs">
        <div className="px-3 py-2 bg-stone-100/70 dark:bg-stone-800/50 border-b border-stone-200/70 dark:border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-[11px] text-deep-forest dark:text-stone-200 truncate">
              {coordinates
                ? tText('📍 Location Pinned', '📍 Lokasi Dipinkan')
                : tText('📍 Tap map to set pin', '📍 Sentuh peta untuk letak pin')}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleRecenter}
              className="p-1 rounded-lg text-stone-500 hover:text-deep-forest dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 transition-colors"
              title={tText('Recenter pin', 'Pusatkan pin')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMapExpanded(!isMapExpanded);
                setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
              }}
              className="p-1 rounded-lg text-stone-500 hover:text-deep-forest dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 transition-colors"
              title={isMapExpanded ? tText('Collapse map', 'Kecilkan peta') : tText('Expand map', 'Besarkan peta')}
            >
              {isMapExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <div
          ref={mapElementRef}
          className={cn(
            'w-full transition-all duration-200 relative z-0',
            isMapExpanded ? 'h-72 sm:h-80' : 'h-44 sm:h-52'
          )}
        />

        <div className="px-3 py-2 bg-white dark:bg-card border-t border-stone-200/70 dark:border-white/5 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 min-w-0">
            {isReverseGeocoding ? (
              <>
                <Loader2 className="w-3 h-3 text-[var(--ui-action)] animate-spin shrink-0" />
                <span className="truncate">{tText('Updating address...', 'Mengemas kini alamat...')}</span>
              </>
            ) : coordinates ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate font-medium text-emerald-700 dark:text-emerald-400">
                  {pinStatus || `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate text-stone-500">
                  {tText('Drag or tap pin for exact drop-off spot', 'Tarik atau sentuh pin untuk lokasi tepat')}
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] font-semibold text-stone-400 shrink-0">
            OpenStreetMap
          </span>
        </div>
      </div>
    </div>
  );
}

export default LocationAutocompletePicker;
