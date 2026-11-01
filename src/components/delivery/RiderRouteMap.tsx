import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, RotateCw } from 'lucide-react';
import { RESTORAN_COORDS, validCoordinates } from '@/lib/riderTracking';

export type MapPoint = { lat: number; lng: number };
const addressCache = new Map<string, MapPoint>();
const markerIcon = (kind: string, label: string) => L.divIcon({
  className: 'rider-map-icon', iconSize: [42, 48], iconAnchor: [21, 43],
  html: `<span class="rider-pin rider-pin--${kind}" role="img" aria-label="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${kind === 'destination' ? 'M3 10 12 3 21 10V21H3Z M9 21V13H15V21' : 'M12 3 20 21 12 17 4 21Z'}"/></svg></span>`,
});

export function RiderRouteMap({ address, rider, live, bm, onDestination }: {
  address: string; rider: MapPoint | null; live: boolean; bm: boolean; onDestination: (point: MapPoint | null) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<ReturnType<typeof L.map> | null>(null);
  const tileLayer = useRef<ReturnType<typeof L.tileLayer> | null>(null);
  const riderMarker = useRef<ReturnType<typeof L.marker> | null>(null);
  const destinationMarker = useRef<ReturnType<typeof L.marker> | null>(null);
  const fittedFirstFix = useRef(false);
  const latestRider = useRef(rider);
  useEffect(() => { latestRider.current = rider; }, [rider]);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [lookup, setLookup] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [retry, setRetry] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const latestDestinationCallback = useRef(onDestination);
  useEffect(() => { latestDestinationCallback.current = onDestination; }, [onDestination]);

  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { zoomControl: false, scrollWheelZoom: false }).setView(RESTORAN_COORDS, 13);
    map.current = instance;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(instance);
    tileLayer.current = tiles;
    tiles.on('tileerror', () => setTilesFailed(true));
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; riderMarker.current = null; destinationMarker.current = null; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    setLookup('loading'); setDestination(null); latestDestinationCallback.current(null);
    const find = async () => {
      try {
        let point = addressCache.get(address);
        const coordinates = address.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
        if (!point && coordinates && validCoordinates(Number(coordinates[1]), Number(coordinates[2]))) point = { lat: Number(coordinates[1]), lng: Number(coordinates[2]) };
        if (!point) {
          if (!address.trim()) throw new Error('No address');
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=my&limit=1&q=${encodeURIComponent(address)}`, { signal: controller.signal });
          if (!response.ok) throw new Error('Address lookup unavailable');
          const matches = await response.json();
          if (!matches[0] || !validCoordinates(Number(matches[0].lat), Number(matches[0].lon))) throw new Error('Address not found');
          point = { lat: Number(matches[0].lat), lng: Number(matches[0].lon) };
        }
        if (disposed) return;
        addressCache.set(address, point); setDestination(point); setLookup('ready'); latestDestinationCallback.current(point);
      } catch { if (!disposed) setLookup('failed'); }
    };
    void find(); return () => { disposed = true; controller.abort(); };
  }, [address, retry]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (destinationMarker.current) instance.removeLayer(destinationMarker.current);
    destinationMarker.current = destination ? L.marker(destination, { icon: markerIcon('destination', bm ? 'Destinasi anggaran alamat' : 'Approximate address destination') }).addTo(instance) : null;
    if (destination) instance.fitBounds(L.latLngBounds([latestRider.current || RESTORAN_COORDS, destination]), { padding: [60, 60], maxZoom: 15, animate: false });
  }, [destination, bm]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !destination) return;
    let disposed = false;
    let line: ReturnType<typeof L.polyline> | null = null;
    let controller: AbortController | null = null;
    const loadRoute = async () => {
      controller?.abort(); controller = new AbortController();
      const origin = latestRider.current || RESTORAN_COORDS;
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`, { signal: controller.signal });
        if (!response.ok) throw new Error('Route unavailable');
        const data = await response.json();
        const coordinates: [number, number][] = data.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => [lat, lng]);
        if (!coordinates?.length) throw new Error('Route unavailable');
        if (disposed) return;
        line?.remove(); line = L.polyline(coordinates, { color: '#b95a28', weight: 5, opacity: .8 }).addTo(instance);
        setRouteUnavailable(false);
      } catch { if (!disposed) { line?.remove(); line = null; setRouteUnavailable(true); } }
    };
    void loadRoute();
    const timer = setInterval(loadRoute, 30_000);
    return () => { disposed = true; clearInterval(timer); controller?.abort(); line?.remove(); };
  }, [destination, retry]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (!rider) { riderMarker.current?.remove(); riderMarker.current = null; return; }
    const icon = markerIcon(live ? 'live' : 'stale', live ? 'GPS' : bm ? 'Lokasi terakhir' : 'Last location');
    if (!riderMarker.current) riderMarker.current = L.marker(rider, { icon, zIndexOffset: 500 }).addTo(instance);
    else riderMarker.current.setLatLng(rider).setIcon(icon);
    if (!fittedFirstFix.current) {
      fittedFirstFix.current = true;
      instance.setView(rider, 14, { animate: false });
    }
    // Do not pan on every update: users retain control while inspecting the map.
  }, [rider, live, bm]);

  return <div className="rider-map-wrap">
    <div ref={element} className="rider-map" aria-label={bm ? 'Peta lokasi penghantaran' : 'Delivery location map'} />
    <div className="rider-map-caption"><span className={live ? 'rider-dot is-live' : 'rider-dot'} />{live ? bm ? 'Lokasi GPS sebenar' : 'Actual GPS location' : bm ? 'Peta penghantaran' : 'Delivery map'}</div>
    <button className="rider-map-locate" aria-label={bm ? 'Muatkan lokasi pada peta' : 'Fit locations on map'} onClick={() => {
      const points = [rider, destination].filter((point): point is MapPoint => point !== null);
      if (points.length) map.current?.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom: 16 });
    }}><LocateFixed size={20} /></button>
    {(lookup !== 'ready' || tilesFailed || routeUnavailable) && <div className="rider-map-notice" role="status">
      {tilesFailed ? bm ? 'Jubin peta tidak dapat dimuatkan. Status GPS masih tersedia.' : 'Map tiles unavailable. GPS status remains available.' : lookup === 'loading' ? bm ? 'Mencari alamat…' : 'Finding address…' : lookup === 'failed' ? bm ? 'Alamat tidak dapat dipastikan pada peta.' : 'Could not locate this address on the map.' : bm ? 'Laluan tidak tersedia. Penanda lokasi masih boleh dilihat.' : 'Route unavailable. Location markers remain visible.'}
      {(lookup === 'failed' || tilesFailed || routeUnavailable) && <button onClick={() => { setTilesFailed(false); tileLayer.current?.redraw(); setRetry(value => value + 1); }}><RotateCw size={16} />{bm ? 'Cuba lagi' : 'Retry'}</button>}
    </div>}
  </div>;
}
