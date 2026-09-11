import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Truck,
  MapPin,
  Navigation,
  Clock,
  X,
  Sliders,
  Compass,
  AlertTriangle,
  MessageSquare,
  Check,
  Phone,
  Radio,
  Shield,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { auth } from '@/firebaseConfig';
import type { Order, RiderLocation } from '@/types';
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
import { db } from '@/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { getApiUrl } from '@/lib/api';

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
  isAdmin?: boolean;
}

// ==========================================
// Leaflet Map Engine (Standard OpenStreetMap - No Watermark)
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
  isLiveStreaming,
}: {
  locationString: string;
  orderStatus: string;
  setEta: (val: string) => void;
  setDistance: (val: string) => void;
  setRouteLoaded: (val: boolean) => void;
  onCoordinatesLoaded?: (coords: { lat: number; lng: number }) => void;
  riderPosition: { lat: number; lng: number } | null;
  onRouteCoordsLoaded?: (coords: [number, number][]) => void;
  isLiveStreaming?: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const [destLatLng, setDestLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const onRouteCoordsLoadedRef = useRef(onRouteCoordsLoaded);
  const riderPositionRef = useRef(riderPosition);

  useEffect(() => {
    onRouteCoordsLoadedRef.current = onRouteCoordsLoaded;
  }, [onRouteCoordsLoaded]);

  useEffect(() => {
    riderPositionRef.current = riderPosition;
    if (riderPosition && vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([riderPosition.lat, riderPosition.lng]);
    }
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
        console.warn('Nominatim geocoding fallback:', err);
        if (isMounted) {
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

  // 2. Initialize Leaflet Map with Clean OpenStreetMap Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView([RESTORAN_WAWASAN_COORDS.lat, RESTORAN_WAWASAN_COORDS.lng], 13);

    // Standard OpenStreetMap tiles (100% clean, no watermark, fast delivery)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Reposition zoom control to top-right to prevent overlap with bottom action cards
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3. Setup route, geofence ring, and animate marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destLatLng) return;

    // Restaurant marker
    const restIcon = L.divIcon({
      html: `<div class="w-9 h-9 bg-orange-600 border-2 border-white text-white rounded-full flex items-center justify-center shadow-md font-bold text-base hover:scale-110 transition-transform">🍽️</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const restMarker = L.marker([RESTORAN_WAWASAN_COORDS.lat, RESTORAN_WAWASAN_COORDS.lng], { icon: restIcon })
      .addTo(map)
      .bindPopup('<b>Restoran Wawasan</b><br>Putrajaya Holdings');

    // Customer destination marker
    const destIcon = L.divIcon({
      html: `<div class="w-10 h-10 bg-emerald-600 border-2 border-white text-white rounded-full flex items-center justify-center shadow-lg font-bold text-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">🏠</div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    const destMarker = L.marker([destLatLng.lat, destLatLng.lng], {
      icon: destIcon,
      draggable: true,
      autoPan: true,
    })
      .addTo(map)
      .bindPopup(`<b>📍 ${locationString || 'Lokasi Penghantaran'}</b><br><span style="font-size: 11px; color: #059669; font-weight: 600;">(Tarik pin untuk laras titik tepat)</span>`);

    destMarker.on('dragend', (e: { target: any }) => {
      const target = e.target;
      if (target && typeof target.getLatLng === 'function') {
        const newLatLng = target.getLatLng();
        const newCoords = { lat: newLatLng.lat, lng: newLatLng.lng };
        setDestLatLng(newCoords);
        onCoordinatesLoaded?.(newCoords);
      }
    });

    // Tap anywhere on map to reposition destination pin
    map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      if (e && e.latlng) {
        const newCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
        setDestLatLng(newCoords);
        onCoordinatesLoaded?.(newCoords);
      }
    });

    // Draw the 200m geofence circle ring around destination
    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.remove();
    }
    const geofenceCircle = L.circle([destLatLng.lat, destLatLng.lng], {
      radius: 200,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '6, 6',
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

          if (onRouteCoordsLoadedRef.current) {
            onRouteCoordsLoadedRef.current(pathCoords);
          }

          if (routePolylineRef.current) {
            routePolylineRef.current.remove();
          }
          const polyline = L.polyline(pathCoords, {
            color: '#e03f14',
            weight: 5,
            opacity: 0.85,
          }).addTo(map);
          routePolylineRef.current = polyline;

          map.fitBounds(polyline.getBounds(), { padding: [60, 60] });

          const distKm = (route.distance || 0) / 1000;
          const durationMin = Math.round((route.duration || 0) / 60);
          setDistance(`${distKm.toFixed(1)} km`);
          setEta(`${durationMin} mins`);
          setRouteLoaded(true);

          // Vehicle marker icon
          const truckIcon = L.divIcon({
            html: `<div class="relative flex items-center justify-center">
              ${isLiveStreaming ? '<div class="absolute -inset-2 bg-emerald-500/40 rounded-full animate-ping"></div>' : ''}
              <div class="relative ${isLiveStreaming ? 'bg-emerald-600' : 'bg-sky-500'} border-2 border-white text-white p-2 rounded-full shadow-lg flex items-center justify-center transition-all">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
            </div>`,
            className: '',
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          });

          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.remove();
          }

          if (orderStatus === 'delivered') {
            const finalPos = pathCoords[pathCoords.length - 1];
            vehicleMarkerRef.current = L.marker(finalPos, { icon: truckIcon }).addTo(map);
          } else if (riderPositionRef.current) {
            vehicleMarkerRef.current = L.marker([riderPositionRef.current.lat, riderPositionRef.current.lng], { icon: truckIcon }).addTo(map);
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
        console.error('OSRM route calculation failed:', err);
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
  }, [destLatLng, orderStatus, locationString, setDistance, setEta, setRouteLoaded, onCoordinatesLoaded, isLiveStreaming]);

  return <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />;
}

// ==========================================
// Main Responsive Delivery Map Layout
// ==========================================
export function DeliveryMap({ order, onClose, onUpdateStatus, isAdmin: isAdminProp }: DeliveryMapProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { isAdmin: isContextAdmin } = useSettings();

  // Role resolution: Admin is the sole delivery rider
  const isAdmin = isAdminProp !== undefined
    ? isAdminProp
    : Boolean(
        isContextAdmin ||
        auth.currentUser?.uid === 'admin' ||
        auth.currentUser?.email === 'admin@wawasanpakusop.my' ||
        localStorage.getItem('wawasan_admin_token') !== null
      );

  const [eta, setEta] = useState<string>('-- mins');
  const [distance, setDistance] = useState<string>('-- km');
  const [, setRouteLoaded] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Rider/Geofence specific states
  const [isRiderMode, setIsRiderMode] = useState<boolean>(() => Boolean(isAdmin));
  const [trackingSource, setTrackingSource] = useState<'simulation' | 'gps'>('simulation');
  const [simPercent, setSimPercent] = useState<number>(0);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [riderSpeed, setRiderSpeed] = useState<number>(0);
  const [broadcastEnabled, setBroadcastEnabled] = useState<boolean>(true);

  const [geofenceBreached, setGeofenceBreached] = useState<boolean>(false);
  const [exactDistanceMeters, setExactDistanceMeters] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [showRiderControls, setShowRiderControls] = useState<boolean>(true);
  const [showWidgetPreview, setShowWidgetPreview] = useState<boolean>(false);

  const lastBroadcastRef = useRef<number>(0);
  const orderId = order.id;
  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);

  // Force isRiderMode off for non-admins
  useEffect(() => {
    if (!isAdmin && isRiderMode) {
      setIsRiderMode(false);
    }
  }, [isAdmin, isRiderMode]);

  // Setup default riderCoords once route is loaded
  useEffect(() => {
    if (routeCoords.length > 0 && !riderCoords && !isLiveStreaming) {
      setRiderCoords({ lat: routeCoords[0][0], lng: routeCoords[0][1] });
    }
  }, [routeCoords, riderCoords, isLiveStreaming]);

  // Real-time Firestore Telemetry Listener
  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(
      doc(db, 'orders', orderId),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const telemetry = data?.riderLocation as RiderLocation | undefined;

        if (telemetry && telemetry.active !== false) {
          setIsLiveStreaming(true);
          if (!isRiderMode) {
            setRiderCoords({ lat: telemetry.lat, lng: telemetry.lng });
          }
          if (typeof telemetry.speed === 'number') {
            setRiderSpeed(telemetry.speed);
          }
        } else {
          setIsLiveStreaming(false);
        }
      },
      (err) => {
        console.warn('[DeliveryMap] Stream snapshot warning:', err);
      }
    );

    return () => unsub();
  }, [orderId, isRiderMode]);

  // Throttled Broadcast to Backend Streaming API (Admin Rider Only)
  const broadcastLocation = useCallback(
    async (coordsToBroadcast: { lat: number; lng: number }, speed = 0, heading = 0) => {
      if (!orderId || !broadcastEnabled || !isAdmin) return;
      const now = Date.now();
      if (now - lastBroadcastRef.current < 2000) return;
      lastBroadcastRef.current = now;

      try {
        await fetch(getApiUrl(`/api/orders/${orderId}/rider-location`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: coordsToBroadcast.lat,
            lng: coordsToBroadcast.lng,
            speed,
            heading,
            active: true,
            riderName: 'Restoran Wawasan Rider (Admin)',
          }),
        });
      } catch (err) {
        console.warn('[DeliveryMap] Broadcast error:', err);
      }
    },
    [orderId, broadcastEnabled, isAdmin]
  );

  // Handle Simulation Slider (Admin Rider)
  useEffect(() => {
    if (isAdmin && isRiderMode && trackingSource === 'simulation' && routeCoords.length > 0) {
      const idx = Math.floor((simPercent / 100) * (routeCoords.length - 1));
      const targetPt = routeCoords[idx];
      const newPos = { lat: targetPt[0], lng: targetPt[1] };
      setRiderCoords(newPos);
      const simulatedSpeed = simPercent > 0 && simPercent < 100 ? 35 : 0;
      setRiderSpeed(simulatedSpeed);
      broadcastLocation(newPos, simulatedSpeed, 0);
    }
  }, [simPercent, trackingSource, isRiderMode, isAdmin, routeCoords, broadcastLocation]);

  // Handle Real-time Geolocation (Admin Rider)
  useEffect(() => {
    if (!isAdmin || !isRiderMode || trackingSource !== 'gps') return;

    if (!navigator.geolocation) {
      alert(language === 'bm' ? 'Sistem GPS tidak disokong pada peranti ini' : 'Geolocation not supported');
      setTrackingSource('simulation');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderCoords(newCoords);
        const speedKmh = pos.coords.speed !== null && !isNaN(pos.coords.speed) ? Math.round(pos.coords.speed * 3.6) : 0;
        const headingDeg = pos.coords.heading !== null && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : 0;
        setRiderSpeed(speedKmh);
        broadcastLocation(newCoords, speedKmh, headingDeg);
      },
      (err) => {
        console.warn('GPS Error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isAdmin, isRiderMode, trackingSource, language, broadcastLocation]);

  // Mark as Delivered
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

  // Synchronize Sticky Delivery Widget for Android Background
  useEffect(() => {
    if (isAdmin && isRiderMode && order.status !== 'delivered') {
      enableRiderDeliveryWidget(order, coords, {
        onDelivered: handleMarkAsDelivered,
      });
    } else {
      disableRiderDeliveryWidget();
    }

    return () => {
      disableRiderDeliveryWidget();
    };
  }, [isAdmin, isRiderMode, coords, order, handleMarkAsDelivered]);

  // Geofence monitoring
  useEffect(() => {
    if (!riderCoords || !coords) return;

    const distKm = getHaversineDistance(riderCoords.lat, riderCoords.lng, coords.lat, coords.lng);
    const distMeters = Math.round(distKm * 1000);
    setExactDistanceMeters(distMeters);

    const isBreached = distMeters <= 200;
    if (isBreached) {
      if (!geofenceBreached) {
        setGeofenceBreached(true);
        triggerHeavyImpact();
        triggerNotification(NotificationType.Warning);
      }
    } else {
      setGeofenceBreached(false);
    }

    if (isAdmin && isRiderMode && order.status !== 'delivered') {
      updateRiderDeliveryWidgetGeofence(order, coords, distMeters, isBreached);
    }
  }, [riderCoords, coords, geofenceBreached, isAdmin, isRiderMode, order]);

  // Direct WhatsApp Alert
  const handleSendArrivalAlert = async () => {
    const formattedPhone = order.contact?.replace(/\D/g, '').replace(/^0/, '60') || '';
    const msg = buildArrivalMessage(order, language === 'bm' ? 'bm' : 'en');

    await launchWhatsApp({
      phone: formattedPhone || '60173157731',
      message: msg,
    });

    toast({
      title: language === 'bm' ? 'WhatsApp Dibuka' : 'WhatsApp Alert Opened',
      description: language === 'bm' ? 'Mesej ketibaan telah disiapkan untuk dihantar.' : 'Arrival message prepared.',
      variant: 'success',
    });
  };

  // Direct Phone Call
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

  // External Navigation Launchers
  const handleOpenGoogleMaps = () => {
    if (coords) {
      launchMaps({ lat: coords.lat, lng: coords.lng, label: order.location, provider: 'google' });
    }
  };

  const handleOpenWaze = () => {
    if (coords) {
      launchMaps({ lat: coords.lat, lng: coords.lng, label: order.location, provider: 'waze' });
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-0 md:p-4 lg:p-6 bg-stone-950/80 backdrop-blur-sm animate-fade-in" id="delivery-tracking-modal">
      
      {/* Main Container */}
      <div className="relative w-full h-full md:max-w-6xl md:h-[92vh] bg-stone-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        
        {/* ========================================================= */}
        {/* DESKTOP SIDEBAR PANEL (Visible on lg screens >= 1024px)   */}
        {/* ========================================================= */}
        <div className="hidden lg:flex w-[380px] min-w-[380px] bg-stone-900 border-r border-stone-800 flex-col justify-between p-6 z-20 overflow-y-auto custom-scrollbar">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  {isAdmin ? <Shield className="w-5 h-5 text-amber-400" /> : <Truck className="w-5 h-5 text-sky-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    {isAdmin ? t('Admin Rider Console', 'Konsol Pentadbir Rider') : t('Live Order Tracker', 'Penjejak Pesanan Langsung')}
                  </h3>
                  <span className="font-mono text-xs text-stone-400">
                    #{order.invoiceNo || order.id?.substring(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Close Button inside Sidebar for easy access on Desktop */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
                title={t('Close', 'Tutup')}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Destination */}
            <div className="p-4 bg-stone-950/60 rounded-2xl border border-stone-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('Destination', 'Destinasi')}</span>
                </div>
                {order.contact && (
                  <button
                    type="button"
                    onClick={handleCallCustomer}
                    className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{t('Call', 'Telefon')}</span>
                  </button>
                )}
              </div>
              <p className="text-sm font-bold text-white">{order.name || t('Customer', 'Pelanggan')}</p>
              <p className="text-xs text-stone-400 leading-relaxed">{order.location || 'Putrajaya, Malaysia'}</p>
              {order.contact && (
                <p className="text-xs text-stone-500 font-mono flex items-center gap-1.5 pt-0.5">
                  <Phone className="w-3 h-3 text-stone-400" />
                  <span>{order.contact}</span>
                </p>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800 text-center">
                <Clock className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-stone-400 block">{t('ETA', 'Anggaran Masa')}</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{order.status === 'delivered' ? t('Delivered', 'Sampai') : eta}</span>
              </div>
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800 text-center">
                <Navigation className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-stone-400 block">{t('Distance', 'Jarak')}</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{exactDistanceMeters !== null ? `${exactDistanceMeters} m` : distance}</span>
              </div>
            </div>

            {/* Admin Rider Controls */}
            {isAdmin && isRiderMode && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                    {t('Live GPS Broadcast', 'Siaran Lokasi GPS')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBroadcastEnabled(!broadcastEnabled)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      broadcastEnabled ? 'bg-emerald-500 text-white shadow-sm' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {broadcastEnabled ? 'LIVE ON' : 'PAUSED'}
                  </button>
                </div>

                {/* Source Selection */}
                <div className="grid grid-cols-2 gap-2 bg-stone-950/60 p-1 rounded-xl border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setTrackingSource('simulation')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                      trackingSource === 'simulation' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{t('Simulate', 'Simulasi')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackingSource('gps')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                      trackingSource === 'gps' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{t('Phone GPS', 'GPS Telefon')}</span>
                  </button>
                </div>

                {/* Simulation Slider */}
                {trackingSource === 'simulation' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-stone-400">
                      <span>{t('Route Progress', 'Perjalanan')}</span>
                      <span className="font-mono text-amber-400">{simPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simPercent}
                      onChange={(e) => setSimPercent(parseInt(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-stone-800 rounded-lg"
                    />
                  </div>
                )}

                {/* Geofence Status */}
                <div className="p-2.5 bg-stone-950/80 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400">{t('Geofence (200m)', 'Zon 200m')}</span>
                  <span className={`font-bold ${geofenceBreached ? 'text-emerald-400 animate-pulse' : 'text-stone-400'}`}>
                    {geofenceBreached ? '🚨 REACHED' : 'IN TRANSIT'}
                  </span>
                </div>
              </div>
            )}

            {/* External Map Navigation */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                {t('Navigation Apps', 'Aplikasi Navigasi')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenGoogleMaps}
                  className="py-2.5 px-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-bold text-stone-200 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  🗺️ Google Maps
                </button>
                <button
                  type="button"
                  onClick={handleOpenWaze}
                  className="py-2.5 px-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-bold text-stone-200 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  🚙 Waze
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Footer Actions */}
          <div className="pt-4 border-t border-stone-800 space-y-2">
            {isAdmin && isRiderMode && (
              <>
                <button
                  type="button"
                  onClick={handleSendArrivalAlert}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                    geofenceBreached
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t('Send WhatsApp Arrival', 'Hantar WhatsApp Sampai')}</span>
                </button>

                {onUpdateStatus && order.status !== 'delivered' && (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={handleMarkAsDelivered}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {updatingStatus ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{t('Mark as Delivered', 'Selesai Dihantar')}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* FULL-BLEED INTERACTIVE MAP CANVAS (Mobile, Tablet, Desktop) */}
        {/* ========================================================= */}
        <div className="flex-1 relative w-full h-full min-h-[320px]">
          
          {/* Map Engine */}
          <div className="absolute inset-0 w-full h-full">
            <LeafletMapContainer
              locationString={order.location}
              orderStatus={order.status || ''}
              setEta={setEta}
              setDistance={setDistance}
              setRouteLoaded={setRouteLoaded}
              onCoordinatesLoaded={setCoords}
              riderPosition={isRiderMode ? riderCoords : (isLiveStreaming ? riderCoords : null)}
              onRouteCoordsLoaded={setRouteCoords}
              isLiveStreaming={isLiveStreaming || (isRiderMode && broadcastEnabled)}
            />
          </div>

          {/* ========================================================= */}
          {/* FLOATING TOP BAR (Compact, Modern, Glassmorphic)          */}
          {/* ========================================================= */}
          <div className="absolute top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-3 right-3 sm:left-6 sm:right-6 lg:left-6 lg:right-6 z-[1000] pointer-events-auto flex items-center justify-between gap-2">
            
            {/* Left Status Pill */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-stone-900/90 backdrop-blur-md rounded-2xl border border-stone-700/60 shadow-lg text-white min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                {isAdmin ? <Shield className="w-4 h-4 text-amber-400" /> : <Truck className="w-4 h-4 text-sky-400" />}
              </div>
              <div className="leading-tight min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-white truncate max-w-[110px] sm:max-w-[200px]">
                    {order.name || t('Catering Order', 'Pesanan Katering')}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 bg-stone-800 text-stone-300 rounded shrink-0">
                    #{order.invoiceNo || order.id?.substring(0, 6).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${order.status === 'delivered' ? 'bg-emerald-400' : 'bg-sky-400 animate-ping'}`} />
                  <span className="truncate">{order.status === 'delivered' ? t('Delivered', 'Sampai') : `${distance} • ${eta}${riderSpeed > 0 ? ` • ${riderSpeed} km/h` : ''}`}</span>
                </div>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsRiderMode(!isRiderMode)}
                    className={`h-10 px-3 rounded-2xl text-xs font-bold transition-all border backdrop-blur-md shadow-lg flex items-center gap-1.5 ${
                      isRiderMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-stone-900/90 text-stone-300 border-stone-700/60'
                    }`}
                    title={t('Toggle Rider Terminal', 'Tukar Mod Rider')}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isRiderMode ? t('Rider Mode', 'Mod Rider') : t('Enter Rider Mode', 'Buka Mod Rider')}</span>
                  </button>

                  {isRiderMode && (
                    <button
                      type="button"
                      onClick={() => setShowWidgetPreview(true)}
                      className="h-10 px-3 rounded-2xl text-xs font-bold transition-all border backdrop-blur-md shadow-lg flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                      title={t('Preview Arrival Alert Widget', 'Pralihat Widget Ketibaan')}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{t('Preview Widget', 'Pralihat Widget')}</span>
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-stone-300 border border-stone-700/60 flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* FLOATING BOTTOM PANEL (Mobile & Tablet < lg)               */}
          {/* ========================================================= */}
          <div className="lg:hidden absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:left-6 sm:right-6 md:left-1/2 md:-translate-x-1/2 md:w-[580px] md:max-w-[calc(100vw-3rem)] z-[1000] pointer-events-auto flex flex-col gap-2">
            
            {/* Geofence Alert Banner (When Rider Approaches within 200m) */}
            {geofenceBreached && (
              <div className="p-3 bg-emerald-600/95 text-white backdrop-blur-md rounded-2xl border border-emerald-400/40 shadow-xl flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white shrink-0" />
                  <span className="text-xs font-bold leading-tight">
                    {t('Rider is within 200m! Please prepare to receive.', 'Rider berhampiran (200m)! Sila bersedia.')}
                  </span>
                </div>
                {isAdmin && isRiderMode && (
                  <button
                    type="button"
                    onClick={handleSendArrivalAlert}
                    className="px-2.5 py-1 bg-white text-emerald-800 text-[11px] font-black rounded-xl shrink-0 uppercase tracking-wider"
                  >
                    WhatsApp
                  </button>
                )}
              </div>
            )}

            {/* Collapsible Rider Controls (Admin Only) */}
            {isAdmin && isRiderMode && showRiderControls && (
              <div className="p-3 bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-700/60 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Radio className={`w-3.5 h-3.5 ${broadcastEnabled ? 'text-emerald-400 animate-pulse' : 'text-stone-500'}`} />
                    <span className="text-xs font-bold text-stone-200">
                      {broadcastEnabled ? t('Live GPS Streaming Active', 'Siaran Lokasi GPS Aktif') : t('GPS Paused', 'GPS Dijeda')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTrackingSource('simulation')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        trackingSource === 'simulation' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {t('Simulate', 'Simulasi')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrackingSource('gps')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        trackingSource === 'gps' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {t('GPS', 'GPS')}
                    </button>
                  </div>
                </div>

                {/* Progress Slider in Simulation Mode */}
                {trackingSource === 'simulation' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-stone-400">
                      <span>{t('Route Simulation Progress', 'Perjalanan Simulasi')}</span>
                      <span className="font-mono text-amber-400">{simPercent}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🍽️</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={simPercent}
                        onChange={(e) => setSimPercent(parseInt(e.target.value))}
                        className="flex-1 accent-amber-500 h-2 bg-stone-800 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs">🏠</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main Action Bar */}
            <div className="p-2.5 bg-stone-950/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-700/60 shadow-2xl flex items-center gap-2">
              
              {/* Admin Rider Actions */}
              {isAdmin && isRiderMode ? (
                <>
                  {/* Giant 1-Tap WhatsApp Arrival Alert Button */}
                  <button
                    type="button"
                    onClick={handleSendArrivalAlert}
                    className={`flex-1 h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                      geofenceBreached
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white animate-pulse shadow-emerald-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <div className="text-left leading-tight">
                      <span className="block text-[11px] font-black uppercase tracking-wider">
                        {geofenceBreached ? t('🚨 Arrived! WhatsApp', '🚨 Tiba! Hantar WhatsApp') : t('WhatsApp Arrival', 'WhatsApp Sampai')}
                      </span>
                      <span className="block text-[9px] opacity-80 font-normal">
                        {order.contact || '017-315 7731'}
                      </span>
                    </div>
                  </button>

                  {/* Direct Phone Call */}
                  <button
                    type="button"
                    onClick={handleCallCustomer}
                    className="h-12 w-12 rounded-xl bg-stone-800 hover:bg-stone-700 text-sky-400 flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm"
                    title={t('Call Customer', 'Telefon Pelanggan')}
                    aria-label="Call Customer"
                  >
                    <Phone className="w-5 h-5" />
                  </button>

                  {/* Google Maps / Waze Launcher */}
                  <button
                    type="button"
                    onClick={handleOpenGoogleMaps}
                    className="h-12 w-12 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm"
                    title={t('Open Maps Navigation', 'Buka Navigasi Maps')}
                    aria-label="Open Maps Navigation"
                  >
                    <Navigation className="w-5 h-5" />
                  </button>

                  {/* Toggle Simulation Drawer */}
                  <button
                    type="button"
                    onClick={() => setShowRiderControls(!showRiderControls)}
                    className="h-12 w-10 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center shrink-0 active:scale-95 transition-all"
                    title={t('Toggle Controls', 'Buka/Tutup Kawalan')}
                  >
                    {showRiderControls ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                /* Customer View Action Card */
                <div className="w-full flex items-center justify-between gap-3 px-2 py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {order.status === 'delivered' ? t('Delivered Successfully', 'Selamat Sampai') : t('Rider In Transit', 'Rider Dalam Perjalanan')}
                      </span>
                      <span className="text-[10px] text-stone-400 block">
                        {exactDistanceMeters !== null ? `${exactDistanceMeters} m ${t('to your doorstep', 'ke lokasi anda')}` : `${distance} • ${eta}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenGoogleMaps}
                      className="h-10 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5 text-amber-400" />
                      <span>Maps</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rider Delivery Alert Preview Modal */}
      {showWidgetPreview && (
        <DeliveryWidgetModal
          isOpen={showWidgetPreview}
          onClose={() => setShowWidgetPreview(false)}
          order={order}
          exactDistanceMeters={exactDistanceMeters}
          onSendWhatsApp={handleSendArrivalAlert}
          language={language as 'en' | 'bm'}
        />
      )}
    </div>
  );
}

