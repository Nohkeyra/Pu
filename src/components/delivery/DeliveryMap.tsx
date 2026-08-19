import { useEffect, useState, useRef } from 'react';
import { Truck, MapPin, Navigation, Clock, X, Info } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Order } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { launchMaps } from '@/lib/nativeService';

const RESTORAN_WAWASAN_COORDS = { lat: 2.92841, lng: 101.68728 };

interface DeliveryMapProps {
  order: Order;
  onClose: () => void;
}

// ==========================================
// Leaflet Map Engine (Exclusively OpenStreetMap)
// ==========================================
function LeafletMapContainer({
  locationString,
  orderStatus,
  setEta,
  setDistance,
  setRouteLoaded,
  onCoordinatesLoaded,
}: {
  locationString: string;
  orderStatus: string;
  setEta: (val: string) => void;
  setDistance: (val: string) => void;
  setRouteLoaded: (val: boolean) => void;
  onCoordinatesLoaded?: (coords: { lat: number; lng: number }) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const [destLatLng, setDestLatLng] = useState<{ lat: number; lng: number } | null>(null);

  // 1. Geocode location with Nominatim (OpenStreetMap)
  useEffect(() => {
    if (!locationString) return;

    let active = true;
    const geocodeAddress = async () => {
      try {
        const query = locationString.toLowerCase().includes('putrajaya')
          ? locationString
          : `${locationString}, Putrajaya, Malaysia`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'RestoranWawasanCateringTracker',
          },
        });
        const data = await res.json();

        if (active) {
          if (data && data.length > 0) {
            const coords = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            };
            setDestLatLng(coords);
            onCoordinatesLoaded?.(coords);
          } else {
            throw new Error('Not found');
          }
        }
      } catch (err) {
        console.warn('Nominatim geocoding failed, using localized offset:', err);
        if (active) {
          // Putrajaya offset fallback
          const randomOffsetLat = (Math.random() - 0.5) * 0.02 + 0.01;
          const randomOffsetLng = (Math.random() - 0.5) * 0.02 + 0.01;
          const coords = {
            lat: RESTORAN_WAWASAN_COORDS.lat + randomOffsetLat,
            lng: RESTORAN_WAWASAN_COORDS.lng + randomOffsetLng,
          };
          setDestLatLng(coords);
          onCoordinatesLoaded?.(coords);
        }
      }
    };

    geocodeAddress();
    return () => {
      active = false;
    };
  }, [locationString, onCoordinatesLoaded]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([RESTORAN_WAWASAN_COORDS.lat, RESTORAN_WAWASAN_COORDS.lng], 13);

    // Gorgeous elegant light grey tile theme from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    // Recalculate dimensions on initial render
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3. Setup route and animate truck
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destLatLng) return;

    // Restaurant marker
    const restIcon = L.divIcon({
      html: `<div class="w-10 h-10 bg-orange-600 border-2 border-white text-white rounded-full flex items-center justify-center shadow-lg font-bold text-lg hover:scale-110 transition-all duration-300">🍽️</div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    const restMarker = L.marker([RESTORAN_WAWASAN_COORDS.lat, RESTORAN_WAWASAN_COORDS.lng], { icon: restIcon })
      .addTo(map)
      .bindPopup('<b>Restoran Wawasan</b><br>Putrajaya Holdings');

    // Customer marker
    const destIcon = L.divIcon({
      html: `<div class="w-10 h-10 bg-emerald-600 border-2 border-white text-white rounded-full flex items-center justify-center shadow-lg font-bold text-lg hover:scale-110 transition-all duration-300">🏠</div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    const destMarker = L.marker([destLatLng.lat, destLatLng.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b>Catering Delivery Point</b><br>${locationString}`);

    let active = true;
    // ReturnType<typeof setInterval> — not NodeJS.Timeout (@types/node
    // intentionally absent in this project, same convention as SplashScreen.tsx)
    let animationInterval: ReturnType<typeof setInterval> | null = null;

    const computeOSRMRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${RESTORAN_WAWASAN_COORDS.lng},${RESTORAN_WAWASAN_COORDS.lat};${destLatLng.lng},${destLatLng.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (active && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const pathCoords = route.geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]] as [number, number]);

          // Draw the polyline
          if (routePolylineRef.current) {
            routePolylineRef.current.remove();
          }
          const polyline = L.polyline(pathCoords, {
            color: '#e03f14', // Restyle palette (tomato marker)
            weight: 6,
            opacity: 0.85,
          }).addTo(map);
          routePolylineRef.current = polyline;

          // Adjust map boundaries to contain the entire route with padding
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

          const distKm = (route.distance || 0) / 1000;
          const durationMin = Math.round((route.duration || 0) / 60);
          setDistance(`${distKm.toFixed(1)} km`);
          setEta(`${durationMin} mins`);
          setRouteLoaded(true);

          // Animate vehicle marker
          const truckIcon = L.divIcon({
            html: `<div class="bg-sky-500 hover:bg-sky-600 border-2 border-white text-white p-2.5 rounded-full shadow-premium flex items-center justify-center animate-bounce transition-all duration-300"><svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });

          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.remove();
          }

          if (orderStatus === 'delivered') {
            const finalPos = pathCoords[pathCoords.length - 1];
            vehicleMarkerRef.current = L.marker(finalPos, { icon: truckIcon }).addTo(map);
          } else {
            let index = 0;
            vehicleMarkerRef.current = L.marker(pathCoords[0], { icon: truckIcon }).addTo(map);

            animationInterval = setInterval(() => {
              if (!active) return;
              index = (index + 1) % pathCoords.length;
              if (vehicleMarkerRef.current) {
                vehicleMarkerRef.current.setLatLng(pathCoords[index]);
              }
            }, 1200);
          }
        }
      } catch (err) {
        console.error('OSRM path request failed:', err);
      }
    };

    computeOSRMRoute();

    return () => {
      active = false;
      restMarker.remove();
      destMarker.remove();
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
      }
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
      }
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [destLatLng, orderStatus, locationString, setDistance, setEta, setRouteLoaded]);

  return <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />;
}

// ==========================================
// Main Delivery Map Layout Component
// ==========================================
export function DeliveryMap({ order, onClose }: DeliveryMapProps) {
  const { language } = useLanguage();
  const [eta, setEta] = useState<string>('-- mins');
  const [distance, setDistance] = useState<string>('-- km');
  const [routeLoaded, setRouteLoaded] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 sm:p-6" id="delivery-tracking-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-deep-forest/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full h-[90vh] max-w-5xl bg-cream dark:bg-card border border-[var(--color-sunshine-cta)]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-white/40 dark:bg-background/40 border-b border-[var(--color-sunshine-cta)]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/10 text-sky-600 rounded-full flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-deep-forest dark:text-white flex items-center gap-2">
                <span>{t('Live Order Tracker', 'Penjejak Pesanan Langsung')}</span>
                <span className="font-mono text-xs px-2 py-0.5 bg-sky-500/10 text-sky-600 rounded-full">
                  {order.invoiceNo || order.id?.substring(0, 8).toUpperCase() || '—'}
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-normal">
                {order.status === 'delivered'
                  ? t('Your order has been successfully delivered.', 'Pesanan anda telah berjaya dihantar.')
                  : t('Catering crew is in transit with your feast.', 'Krew katering sedang dalam perjalanan membawa hidangan anda.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone/10 text-stone-500 dark:text-stone-400 transition-all"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 relative flex flex-col md:flex-row">
          {/* Status Metrics Panel */}
          <div className="w-full md:w-[320px] p-5 bg-white/60 dark:bg-background/60 border-b md:border-b-0 md:border-r border-[var(--color-sunshine-cta)]/10 flex flex-col justify-between space-y-6 z-10 overflow-y-auto">
            <div className="space-y-6">
              {/* Delivery Target */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-[var(--color-sunshine-cta)] uppercase tracking-widest block opacity-90">
                  {t('Delivery Target', 'Destinasi Penghantaran')}
                </span>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-deep-forest dark:text-white font-sans">
                      {order.name || t('Catering Customer', 'Pelanggan Katering')}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 break-words mt-0.5 leading-relaxed font-sans">
                      {order.location || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[var(--color-sunshine-cta)] uppercase tracking-widest block opacity-90">
                  {t('Status Copy', 'Status Pesanan')}
                </span>
                <div className="p-3 bg-cream/50 dark:bg-card/40 rounded-2xl border border-stone-200/50 flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${order.status === 'delivered' ? 'bg-emerald-500' : 'bg-sky-500 animate-ping'}`} />
                  <span className="text-sm font-bold text-deep-forest dark:text-white uppercase tracking-wider font-sans">
                    {order.status === 'delivered'
                      ? t('Delivered ✅', 'Selesai Dihantar ✅')
                      : t('In Transit 🚚', 'Dalam Perjalanan 🚚')}
                  </span>
                </div>
              </div>

              {/* Transit Estimations */}
              {routeLoaded && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-sky-500/5 rounded-2xl border border-sky-500/10 text-center">
                    <Clock className="w-4 h-4 text-sky-500 mx-auto mb-1.5" />
                    <span className="text-xs text-stone-500 dark:text-stone-400 block font-sans">{t('ETA', 'Tiba Dalam')}</span>
                    <span className="text-sm font-black text-sky-600 dark:text-sky-400 block mt-0.5 font-sans">
                      {order.status === 'delivered' ? t('Delivered', 'Sampai') : eta}
                    </span>
                  </div>
                  <div className="p-3 bg-sky-500/5 rounded-2xl border border-sky-500/10 text-center">
                    <Navigation className="w-4 h-4 text-sky-500 mx-auto mb-1.5" />
                    <span className="text-xs text-stone-500 dark:text-stone-400 block font-sans">{t('Distance', 'Jarak')}</span>
                    <span className="text-sm font-black text-sky-600 dark:text-sky-400 block mt-0.5 font-sans">
                      {distance}
                    </span>
                  </div>
                </div>
              )}

              {/* Native Navigation Shortcuts */}
              {coords && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-[var(--color-sunshine-cta)] uppercase tracking-widest block opacity-90">
                    {t('External Navigation', 'Navigasi Luaran')}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => launchMaps({ lat: coords.lat, lng: coords.lng, label: order.location, provider: 'google' })}
                      className="touch-target-row text-xs font-bold bg-white dark:bg-card border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center justify-center gap-1 text-deep-forest dark:text-white transition-all shadow-sm"
                    >
                      🗺️ Google Maps
                    </button>
                    <button
                      type="button"
                      onClick={() => launchMaps({ lat: coords.lat, lng: coords.lng, label: order.location, provider: 'waze' })}
                      className="touch-target-row text-xs font-bold bg-white dark:bg-card border border-stone-200 dark:border-stone-700 rounded-xl py-2.5 px-3 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center justify-center gap-1 text-deep-forest dark:text-white transition-all shadow-sm"
                    >
                      🚙 Waze Navigation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Map Engine Indicator */}
            <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-normal">
                <span>{t('Powered by OpenStreetMap (Leaflet) live tracking engine. 100% Free & Open Source.', 'Dikuasakan oleh enjin penjejakan OpenStreetMap (Leaflet). 100% Percuma & Sumber Terbuka.')}</span>
              </div>
            </div>
          </div>

          {/* Map Canvas */}
          <div className="flex-1 h-full min-h-[350px] relative">
            <LeafletMapContainer
              locationString={order.location}
              orderStatus={order.status || ''}
              setEta={setEta}
              setDistance={setDistance}
              setRouteLoaded={setRouteLoaded}
              onCoordinatesLoaded={setCoords}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
