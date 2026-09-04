import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Truck,
  MapPin,
  Navigation,
  Clock,
  X,
  Info,
  Sliders,
  Compass,
  AlertTriangle,
  MessageSquare,
  Check,
  Sparkles,
  Smartphone,
  Phone,
  LayoutGrid,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Order } from '@/types';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { launchMaps, launchWhatsApp } from '@/lib/nativeService';
import { triggerHeavyImpact, triggerNotification, NotificationType } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';
import {
  enableRiderDeliveryWidget,
  updateRiderDeliveryWidgetGeofence,
  disableRiderDeliveryWidget,
  buildArrivalMessage,
} from '@/services/riderDeliveryWidgetService';
import { DeliveryWidgetModal } from './DeliveryWidgetModal';

const RESTORAN_WAWASAN_COORDS = { lat: 2.92841, lng: 101.68728 };

// Haversine formula to compute distance in km
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface DeliveryMapProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: string) => void | Promise<void>;
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
  riderPosition,
  onRouteCoordsLoaded,
}: {
  locationString: string;
  orderStatus: string;
  setEta: (val: string) => void;
  setDistance: (val: string) => void;
  setRouteLoaded: (val: boolean) => void;
  onCoordinatesLoaded?: (coords: { lat: number; lng: number }) => void;
  riderPosition: { lat: number; lng: number } | null;
  onRouteCoordsLoaded?: (coords: [number, number][]) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const geofenceCircleRef = useRef<any>(null);
  const [destLatLng, setDestLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const onRouteCoordsLoadedRef = useRef(onRouteCoordsLoaded);
  const riderPositionRef = useRef(riderPosition);

  useEffect(() => {
    onRouteCoordsLoadedRef.current = onRouteCoordsLoaded;
  }, [onRouteCoordsLoaded]);

  useEffect(() => {
    riderPositionRef.current = riderPosition;
  }, [riderPosition]);

  // 1. Geocode location with Nominatim (OpenStreetMap)
  useEffect(() => {
    if (!locationString) return;

    const controller = new AbortController();
    let isMounted = true;

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
          signal: controller.signal,
        });
        const data = await res.json();

        if (isMounted) {
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
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('Nominatim geocoding failed, using localized offset:', err);
        if (isMounted) {
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
      isMounted = false;
      controller.abort();
    };
  }, [locationString, onCoordinatesLoaded]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([RESTORAN_WAWASAN_COORDS.lat, RESTORAN_WAWASAN_COORDS.lng], 13);

    // Elegant light grey tile theme from CartoDB
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

  // 3. Listen for manual riderPosition updates and move the vehicle marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !riderPosition) return;

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([riderPosition.lat, riderPosition.lng]);
    }
  }, [riderPosition]);

  // 4. Setup route, geofence ring, and animate truck
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

    // Draw the 200m geofence circle ring around the destination
    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.remove();
    }
    const geofenceCircle = L.circle([destLatLng.lat, destLatLng.lng], {
      radius: 200, // 200 meters
      color: '#10b981', // emerald green
      fillColor: '#10b981',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '5, 5',
    }).addTo(map);
    geofenceCircleRef.current = geofenceCircle;

    let active = true;
    let animationInterval: ReturnType<typeof setInterval> | null = null;

    const computeOSRMRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${RESTORAN_WAWASAN_COORDS.lng},${RESTORAN_WAWASAN_COORDS.lat};${destLatLng.lng},${destLatLng.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (active && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const pathCoords = route.geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]] as [number, number]);

          // Notify the parent component of route coordinates for simulation
          if (onRouteCoordsLoadedRef.current) {
            onRouteCoordsLoadedRef.current(pathCoords);
          }

          // Draw the polyline
          if (routePolylineRef.current) {
            routePolylineRef.current.remove();
          }
          const polyline = L.polyline(pathCoords, {
            color: '#e03f14',
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

          // Render vehicle marker
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
          } else if (riderPositionRef.current) {
            // Bind directly to the externally managed state (Rider Mode / Simulation)
            vehicleMarkerRef.current = L.marker([riderPositionRef.current.lat, riderPositionRef.current.lng], { icon: truckIcon }).addTo(map);
          } else {
            // Passive auto-interval animation for customer tracking view
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
      geofenceCircle.remove();
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

  return <div ref={mapContainerRef} className="w-full h-full animate-fade-in" style={{ zIndex: 1 }} />;
}

// ==========================================
// Main Delivery Map Layout Component
// ==========================================
export function DeliveryMap({ order, onClose, onUpdateStatus }: DeliveryMapProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [eta, setEta] = useState<string>('-- mins');
  const [distance, setDistance] = useState<string>('-- km');
  const [routeLoaded, setRouteLoaded] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Rider/Geofence specific states
  const [isRiderMode, setIsRiderMode] = useState<boolean>(false);
  const [trackingSource, setTrackingSource] = useState<'simulation' | 'gps'>('simulation');
  const [simPercent, setSimPercent] = useState<number>(0);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [geofenceBreached, setGeofenceBreached] = useState<boolean>(false);
  const [exactDistanceMeters, setExactDistanceMeters] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Lock Screen Widget states
  const [lockScreenWidgetActive, setLockScreenWidgetActive] = useState<boolean>(true);
  const [showLockScreenPreview, setShowLockScreenPreview] = useState<boolean>(false);

  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);

  // Setup default riderCoords once OSRM route is loaded
  useEffect(() => {
    if (routeCoords.length > 0 && !riderCoords) {
      setRiderCoords({ lat: routeCoords[0][0], lng: routeCoords[0][1] });
    }
  }, [routeCoords, riderCoords]);

  // Handle Manual Simulator Slider Changes
  useEffect(() => {
    if (isRiderMode && trackingSource === 'simulation' && routeCoords.length > 0) {
      const idx = Math.floor((simPercent / 100) * (routeCoords.length - 1));
      const targetPt = routeCoords[idx];
      setRiderCoords({ lat: targetPt[0], lng: targetPt[1] });
    }
  }, [simPercent, trackingSource, isRiderMode, routeCoords]);

  // Handle Real-time Geolocation GPS Tracking
  useEffect(() => {
    if (!isRiderMode || trackingSource !== 'gps') return;

    if (!navigator.geolocation) {
      const errorMsg = language === 'bm'
        ? 'Sistem GPS tidak disokong oleh peranti anda'
        : 'Geolocation is not supported by your device';
      alert(errorMsg);
      setTrackingSource('simulation');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setRiderCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn('GPS Error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isRiderMode, trackingSource, language]);

  // Direct delivery completion trigger
  const handleMarkAsDelivered = useCallback(async () => {
    if (!onUpdateStatus || !order.id) return;
    setUpdatingStatus(true);
    try {
      await onUpdateStatus(order.id, 'delivered');
      triggerNotification(NotificationType.Success);
      toast({
        title: language === 'bm' ? 'Pesanan Selesai Dihantar' : 'Order Marked Delivered',
        description: language === 'bm' ? `Penghantaran #${order.invoiceNo || order.id} selesai.` : 'Delivery completed.',
        variant: 'success',
      });
      await disableRiderDeliveryWidget();
    } catch (err) {
      console.error('Failed to mark delivered:', err);
    } finally {
      setUpdatingStatus(false);
    }
  }, [onUpdateStatus, order.id, order.invoiceNo, language, toast]);

  // Synchronize Sticky Delivery Widget for Android / Riders
  useEffect(() => {
    if (isRiderMode && lockScreenWidgetActive && order.status !== 'delivered') {
      enableRiderDeliveryWidget(order, coords, {
        onDelivered: handleMarkAsDelivered,
      });
    } else {
      disableRiderDeliveryWidget();
    }

    return () => {
      disableRiderDeliveryWidget();
    };
  }, [isRiderMode, lockScreenWidgetActive, coords, order, handleMarkAsDelivered]);

  // Geofence breaching monitor and Lock Screen sync
  useEffect(() => {
    if (!riderCoords || !coords) return;

    const distKm = getHaversineDistance(riderCoords.lat, riderCoords.lng, coords.lat, coords.lng);
    const distMeters = Math.round(distKm * 1000);
    setExactDistanceMeters(distMeters);

    const isBreached = distMeters <= 200;
    if (isBreached) {
      if (!geofenceBreached) {
        setGeofenceBreached(true);
        // Fire haptic vibration alert!
        triggerHeavyImpact();
        triggerNotification(NotificationType.Warning);
      }
    } else {
      setGeofenceBreached(false);
    }

    if (isRiderMode && lockScreenWidgetActive && order.status !== 'delivered') {
      updateRiderDeliveryWidgetGeofence(order, coords, distMeters, isBreached);
    }
  }, [riderCoords, coords, geofenceBreached, isRiderMode, lockScreenWidgetActive, order]);

  // Pre-formatted WhatsApp Direct Send
  const handleSendArrivalAlert = async () => {
    const formattedPhone = order.contact?.replace(/\D/g, '').replace(/^0/, '60') || '';
    const msg = buildArrivalMessage(order, language === 'bm' ? 'bm' : 'en');

    await launchWhatsApp({
      phone: formattedPhone || '60173157731',
      message: msg,
    });

    toast({
      title: language === 'bm' ? 'Alert WhatsApp Dibuka' : 'WhatsApp Alert Opened',
      description: language === 'bm' ? 'Mesej ketibaan telah disiapkan untuk dihantar.' : 'Arrival message prepared.',
      variant: 'success',
    });
  };

  // Direct Phone Call Shortcut
  const handleCallCustomer = () => {
    const rawPhone = order.contact?.replace(/\D/g, '') || '';
    if (rawPhone) {
      window.open(`tel:${rawPhone}`, '_system');
    } else {
      toast({
        title: language === 'bm' ? 'Nombor Telefon Tiada' : 'No Phone Number',
        variant: 'error',
      });
    }
  };

  // Direct Maps Navigation Shortcut
  const handleOpenNavigation = () => {
    if (coords) {
      launchMaps({ lat: coords.lat, lng: coords.lng, label: order.location, provider: 'best' });
    }
  };

  // Trigger Delivery Widget Test Notification
  const handleTestLockScreen = async () => {
    await enableRiderDeliveryWidget(order, coords, {
      onDelivered: handleMarkAsDelivered,
    });
    await updateRiderDeliveryWidgetGeofence(order, coords, exactDistanceMeters || 180, true);
    triggerHeavyImpact();
    toast({
      title: language === 'bm' ? 'Widget Pesanan Aktif' : 'Delivery Widget Active',
      description:
        language === 'bm'
          ? 'Notifikasi kini aktif pada peranti anda. Tekan butang pratonton untuk semak.'
          : 'Notification is active on your device. Tap preview to inspect.',
      variant: 'success',
    });
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 sm:p-6 animate-fade-in" id="delivery-tracking-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-deep-forest/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full h-[92vh] max-w-6xl bg-cream dark:bg-card border border-[var(--color-sunshine-cta)]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-white/40 dark:bg-background/40 border-b border-[var(--color-sunshine-cta)]/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/10 text-sky-600 rounded-full flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-deep-forest dark:text-white flex items-center gap-2 font-display">
                <span>{t('Live Order Tracker & Geofence', 'Penjejak & Geofence Pesanan')}</span>
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

          <div className="flex items-center gap-2">
            {/* Rider Simulation Toggle Switch */}
            <button
              onClick={() => setIsRiderMode(!isRiderMode)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                isRiderMode
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 shadow-sm'
                  : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isRiderMode ? t('Rider Dashboard Active', 'Simulasi Rider Aktif') : t('Enter Rider Mode', 'Mod Rider & Simulasi')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone/10 text-stone-500 dark:text-stone-400 transition-all touch-target"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 relative flex flex-col lg:flex-row">
          
          {/* Status Metrics Panel */}
          <div className="w-full lg:w-[360px] p-5 bg-white/60 dark:bg-background/60 border-b lg:border-b-0 lg:border-r border-[var(--color-sunshine-cta)]/10 flex flex-col justify-between space-y-6 z-10 overflow-y-auto">
            <div className="space-y-6">
              
              {/* Rider Dashboard Integration */}
              {isRiderMode ? (
                <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      {t('Rider & Geofence Simulator', 'Simulator Rider & Geofence')}
                    </span>
                    <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-md">
                      ADMIN / RIDER
                    </span>
                  </div>

                  {/* Tracking Source Selector */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                      {t('Tracking Source', 'Punca Penjejakan')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTrackingSource('simulation')}
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          trackingSource === 'simulation'
                            ? 'bg-white dark:bg-card text-deep-forest dark:text-white shadow-sm'
                            : 'text-stone-500'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{t('Simulate', 'Simulasi')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrackingSource('gps')}
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          trackingSource === 'gps'
                            ? 'bg-white dark:bg-card text-deep-forest dark:text-white shadow-sm'
                            : 'text-stone-500'
                        }`}
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{t('🛰️ Live GPS', '🛰️ GPS Telefon')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual route progress slider */}
                  {trackingSource === 'simulation' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-stone-500">
                        <span>{t('Route Progress', 'Perkembangan Laluan')}</span>
                        <span className="font-mono text-amber-600">{simPercent}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🍽️</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={simPercent}
                          onChange={(e) => setSimPercent(parseInt(e.target.value))}
                          className="flex-1 accent-amber-500 cursor-pointer"
                        />
                        <span className="text-sm">🏠</span>
                      </div>
                      <p className="text-[10px] text-stone-500 leading-normal italic">
                        {t('Slide from left to right to simulate the rider driving along the road.', 'Gelongsor dari kiri ke kanan untuk mensimulasikan pemanduan di jalan raya.')}
                      </p>
                    </div>
                  )}

                  {trackingSource === 'gps' && (
                    <div className="p-3 bg-stone-100 dark:bg-stone-900 rounded-xl space-y-1 text-center">
                      <div className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping mr-1.5" />
                      <span className="text-xs font-bold text-deep-forest dark:text-white block">
                        {t('Active GPS Tracking', 'Penjejakan GPS Aktif')}
                      </span>
                      <p className="text-[10px] text-stone-500">
                        {t('Listening directly to Android location telemetry.', 'Membaca telemetri lokasi peranti Android anda.')}
                      </p>
                    </div>
                  )}

                  {/* Live Geofence Monitoring status card */}
                  <div className="p-3 bg-stone-100 dark:bg-stone-900 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-stone-500 border-b border-stone-200 dark:border-stone-800 pb-1.5">
                      <span>{t('Geofence Area (200m)', 'Zon Geofence (200m)')}</span>
                      <span>{geofenceBreached ? '🚨 BREACHED' : '🟢 SAFE'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-stone-500">{t('Distance Left', 'Jarak Berbaki')}</span>
                      <span className="text-sm font-mono font-black text-deep-forest dark:text-white">
                        {exactDistanceMeters !== null ? `${exactDistanceMeters} m` : t('Calculating...', 'Mengira...')}
                      </span>
                    </div>

                    {geofenceBreached ? (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t('Entered Delivery Geofence!', 'Rider Berada Dalam Geofence!')}</span>
                      </div>
                    ) : (
                      <div className="p-2 bg-stone-200/50 dark:bg-stone-800 rounded-xl text-center text-[10px] text-stone-500">
                        {t('Drive closer than 200m to trigger alert', 'Sila pandu rapat 200m ke rumah untuk hantar mesej')}
                      </div>
                    )}
                  </div>

                  {/* Rider Lock Screen Widget Controls */}
                  <div className="p-3.5 bg-gradient-to-br from-stone-900 via-stone-950 to-black text-white rounded-2xl border border-stone-800 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          {t('App Tracker Widget', 'Widget Skrin Utama')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLockScreenWidgetActive(!lockScreenWidgetActive)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                          lockScreenWidgetActive
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-stone-800 text-stone-400 border-stone-700'
                        }`}
                      >
                        {lockScreenWidgetActive ? 'AKTIF 🟢' : 'TIDAK AKTIF ⚪'}
                      </button>
                    </div>

                    <p className="text-[10px] text-stone-300 leading-relaxed">
                      {t(
                        'Displays a quick order tracking & arrival action card directly on your device home screen and notification tray.',
                        'Memaparkan kad tindakan dan status tempahan terus pada skrin utama dan ruang notifikasi peranti anda.'
                      )}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLockScreenPreview(true)}
                        className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('Preview Widget', 'Pratonton Widget')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleTestLockScreen}
                        className="py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all shadow-sm"
                      >
                        <span>{t('Test Alert', 'Uji Alert')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Smart Arrival WhatsApp trigger */}
                  {geofenceBreached && (
                    <button
                      type="button"
                      onClick={handleSendArrivalAlert}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all text-center uppercase tracking-wider"
                    >
                      <MessageSquare className="w-4 h-4 text-white" />
                      <span>{t('Send WhatsApp Arrival Msg', 'Hantar WhatsApp Sampai')}</span>
                    </button>
                  )}

                  {/* Rider completion action */}
                  {onUpdateStatus && order.status !== 'delivered' && (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={handleMarkAsDelivered}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all uppercase tracking-wider"
                    >
                      {updatingStatus ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>{t('Mark as Delivered', 'Selesai Dihantar')}</span>
                    </button>
                  )}
                </div>
              ) : (
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
              )}
            </div>

            {/* Map Engine Indicator */}
            <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-normal">
                <span>
                  {t(
                    'Powered by OpenStreetMap (Leaflet) live tracking engine. 100% Free & Open Source.',
                    'Dikuasakan oleh enjin penjejakan OpenStreetMap (Leaflet). 100% Percuma & Sumber Terbuka.'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Map Canvas */}
          <div className="flex-1 h-full min-h-[350px] relative flex flex-col">
            <div className="flex-1 relative w-full h-full">
              <LeafletMapContainer
                locationString={order.location}
                orderStatus={order.status || ''}
                setEta={setEta}
                setDistance={setDistance}
                setRouteLoaded={setRouteLoaded}
                onCoordinatesLoaded={setCoords}
                riderPosition={isRiderMode ? riderCoords : null}
                onRouteCoordsLoaded={setRouteCoords}
              />

              {/* Glove-Friendly Safe-Riding Floating Action Bar for Riders */}
              <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-auto">
                <div className="max-w-xl mx-auto p-2.5 bg-stone-950/90 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-700/60 shadow-2xl flex items-center gap-2">
                  {/* Giant 1-Tap WhatsApp Arrival Button */}
                  <button
                    type="button"
                    onClick={handleSendArrivalAlert}
                    className={`flex-1 h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                      geofenceBreached
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white animate-pulse shadow-emerald-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    }`}
                    title={t('Send WhatsApp Arrival (1-Tap Safe)', 'Hantar WhatsApp Sampai (1-Tekan Selamat)')}
                  >
                    <MessageSquare className="w-5 h-5 shrink-0" />
                    <div className="text-left leading-tight">
                      <span className="block text-[11px] font-black uppercase tracking-wider">
                        {geofenceBreached
                          ? t('🚨 Arrived! Tap WhatsApp', '🚨 Tiba! Hantar WhatsApp')
                          : t('WhatsApp Arrival Alert', 'WhatsApp Sampai')}
                      </span>
                      <span className="block text-[9px] opacity-80 font-normal">
                        {order.contact || '017-315 7731'}
                      </span>
                    </div>
                  </button>

                  {/* Quick Call */}
                  <button
                    type="button"
                    onClick={handleCallCustomer}
                    className="h-12 w-12 rounded-xl bg-stone-800 hover:bg-stone-700 text-sky-400 flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm"
                    title={t('Call Customer', 'Telefon Pelanggan')}
                    aria-label="Call Customer"
                  >
                    <Phone className="w-5 h-5" />
                  </button>

                  {/* Quick Navigation */}
                  <button
                    type="button"
                    onClick={handleOpenNavigation}
                    className="h-12 w-12 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm"
                    title={t('Navigation Maps / Waze', 'Navigasi Maps / Waze')}
                    aria-label="Navigation Maps / Waze"
                  >
                    <Navigation className="w-5 h-5" />
                  </button>

                  {/* App Widget Preview / Control */}
                  <button
                    type="button"
                    onClick={() => setShowLockScreenPreview(true)}
                    className={`h-12 px-2.5 rounded-xl border flex flex-col items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm ${
                      lockScreenWidgetActive
                        ? 'bg-stone-800 border-amber-500/40 text-amber-400'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400'
                    }`}
                    title={t('App Widget Preview', 'Pratonton Widget')}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold mt-0.5">
                      {lockScreenWidgetActive ? 'Widget' : 'Widget Off'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Delivery Tracker Widget Simulation Modal */}
      <DeliveryWidgetModal
        isOpen={showLockScreenPreview}
        onClose={() => setShowLockScreenPreview(false)}
        order={order}
        exactDistanceMeters={exactDistanceMeters}
        geofenceBreached={geofenceBreached}
        onSendWhatsApp={handleSendArrivalAlert}
        onCallCustomer={handleCallCustomer}
        onOpenNavigation={handleOpenNavigation}
        onMarkDelivered={order.status !== 'delivered' && onUpdateStatus ? handleMarkAsDelivered : undefined}
      />
    </div>
  );
}
