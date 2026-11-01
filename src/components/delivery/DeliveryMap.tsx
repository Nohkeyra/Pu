import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CircleStop, Crosshair, MapPin, MessageCircle, Navigation, Phone, Radio, ShieldCheck, Truck, WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import { useRiderTracking } from '@/hooks/useRiderTracking';
import { canStartRiderTracking, distanceMetres, formatRiderDistance, isFreshRiderLocation, validCoordinates } from '@/lib/riderTracking';
import { launchMaps, launchWhatsApp } from '@/lib/nativeService';
import { isNativeRider, RiderTrackingError, startRiderSharing, stopRiderSharing } from '@/services/riderTrackingService';
import type { Order } from '@/types';
import { RiderRouteMap, type MapPoint } from './RiderRouteMap';
import './rider-tracking.css';

interface DeliveryMapProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: string) => void | Promise<void>;
  isAdmin?: boolean;
}

export function DeliveryMap({ order, onClose, onUpdateStatus, isAdmin = false }: DeliveryMapProps) {
  const { language } = useLanguage();
  const bm = language === 'bm';
  const text = (ms: string, en: string) => bm ? ms : en;
  const { snapshot, connection, device, now, refresh } = useRiderTracking(order.id, isAdmin);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmFinish, setConfirmFinish] = useState(false);
  const location = snapshot?.riderLocation;
  const session = snapshot?.session;
  const status = snapshot?.status || order.status;
  const finished = status === 'delivered' || status === 'completed';
  const live = !finished && connection === 'connected' && !(isAdmin && device.orderId === order.id && device.phase === 'offline') && isFreshRiderLocation(location, session, now);
  const point = connection !== 'forbidden' && location?.source === 'gps' && validCoordinates(location.lat, location.lng) ? { lat: location.lat, lng: location.lng } : null;
  const sharingThisOrder = device.active && device.orderId === order.id;
  const anotherOrder = device.active && device.orderId !== order.id;
  const uploadOffline = sharingThisOrder && device.phase === 'offline';
  const canStart = canStartRiderTracking(status) && connection === 'connected';
  const ageSeconds = location ? Math.max(0, Math.floor((now - Date.parse(location.updatedAt)) / 1000)) : 0;
  const lastSeen = ageSeconds < 60 ? text(`${ageSeconds}s lalu`, `${ageSeconds}s ago`) : text(`${Math.floor(ageSeconds / 60)} min lalu`, `${Math.floor(ageSeconds / 60)} min ago`);
  const badge = connection === 'loading' ? text('Menyemak lokasi…', 'Checking location…') : connection === 'forbidden' ? text('Akses tidak tersedia', 'Access unavailable') : finished ? text('Selesai', 'Completed') : connection === 'offline' || uploadOffline ? text('Tiada sambungan', 'Offline') : live ? text('Langsung', 'Live') : point ? text('Lokasi terakhir', 'Last location') : sharingThisOrder ? text('Mencari GPS', 'Finding GPS') : text('Belum bersiaran', 'Not sharing yet');
  const title = finished ? text('Pesanan telah dihantar', 'Your order has arrived') : live ? text('Rider anda dalam perjalanan', 'Your rider is on the way') : sharingThisOrder ? text('Menyambungkan lokasi anda', 'Connecting your location') : point ? text('Menunggu kemas kini rider', 'Waiting for a rider update') : text('Ikuti perjalanan pesanan anda', 'Follow your order’s journey');
  const detail = connection === 'forbidden' ? text('Log masuk dengan akaun pemilik pesanan atau akaun admin.', 'Sign in as the order owner or an administrator.') : live ? text('Lokasi dikemas kini daripada GPS telefon rider.', 'Location updated from your rider’s phone GPS.') : point ? text('Penanda menunjukkan lokasi terakhir. Ia bukan lokasi langsung.', 'The marker shows the last known location. It is not live.') : text('Lokasi akan muncul selepas rider mula berkongsi dan GPS diterima.', 'Location appears after the rider starts sharing and a GPS fix is received.');

  const action = async (task: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await task(); refresh(); }
    catch (failure) {
      const code = failure instanceof RiderTrackingError ? failure.code : (failure as { code?: string })?.code;
      const messages: Record<string, string> = {
        AUTH_REQUIRED: text('Sesi tamat. Log masuk admin semula.', 'Session expired. Sign in to admin again.'),
        APK_UPDATE_REQUIRED: text('Pasang APK baharu yang menyertakan servis lokasi rider.', 'Install the updated APK with the rider location service.'),
        PERMISSION_DENIED: text('Benarkan lokasi tepat dalam tetapan aplikasi.', 'Allow precise location in app settings.'),
        NOTIFICATION_REQUIRED: text('Benarkan notifikasi supaya kawalan henti sentiasa boleh dicapai.', 'Allow notifications to keep the stop control accessible.'),
        GPS_DISABLED: text('Hidupkan lokasi pada telefon dan cuba lagi.', 'Turn on device location and retry.'),
        ORDER_NOT_ELIGIBLE: text('Status pesanan ini tidak membenarkan perkongsian lokasi.', 'This order’s status does not allow location sharing.'),
      };
      setError(messages[code || ''] || text('Tindakan belum berjaya. Semak sambungan dan cuba lagi.', 'Action unsuccessful. Check your connection and retry.'));
    } finally { setBusy(false); }
  };
  const openNavigation = () => action(async () => {
    if (destination) await launchMaps({ ...destination, label: order.location });
    else window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}`, '_blank', 'noopener,noreferrer');
  });

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent showCloseButton={false} className="rider-dialog">
      <header className="rider-header">
        <button disabled={busy} className="rider-icon-button" aria-label={text('Tutup peta', 'Close map')} onClick={onClose}><ArrowLeft size={21} /></button>
        <div><p className="rider-eyebrow">WAWASAN · {text('PENGHANTARAN', 'DELIVERY')}</p><DialogTitle>{text('Jejak pesanan', 'Track your order')}</DialogTitle></div>
        <span className="rider-secure" aria-label={text('Akses pesanan dilindungi', 'Protected order access')}><ShieldCheck size={22} /></span>
        <DialogDescription className="sr-only">{text('Peta GPS rider dan status perkongsian lokasi pesanan.', 'Rider GPS map and order location-sharing status.')}</DialogDescription>
      </header>
      <div className="rider-layout">
        <RiderRouteMap address={order.location} rider={point} live={live} bm={bm} onDestination={setDestination} />
        <section className="rider-sheet" aria-label={text('Butiran penjejakan', 'Tracking details')}>
          <div className="rider-sheet-handle" aria-hidden="true" />
          <div className="rider-status-row"><span className={`rider-status ${live ? 'is-live' : ''}`} role="status"><span className="rider-dot" />{badge}</span><span className="rider-order-ref">#{(order.invoiceNo || order.id || '').slice(-14)}</span></div>
          <h2>{title}</h2><p className="rider-description">{detail}</p>
          <div className="rider-metrics">
            <div><Crosshair size={18} /><span>{text('Ketepatan GPS', 'GPS accuracy')}<strong>{point && location ? `±${Math.round(location.accuracy)} m` : '—'}</strong></span></div>
            <div><Radio size={18} /><span>{text('Kemas kini', 'Last update')}<strong>{point ? lastSeen : '—'}</strong></span></div>
          </div>
          <ol className="rider-progress" aria-label={text('Perjalanan pesanan', 'Order journey')}>
            <li className="is-done"><span><Check size={15} /></span>{text('Disahkan', 'Confirmed')}</li>
            <li className={status === 'in_transit' || finished ? 'is-done' : ''}><span><Truck size={15} /></span>{text('Perjalanan', 'On the way')}</li>
            <li className={finished ? 'is-done' : ''}><span><MapPin size={15} /></span>{text('Dihantar', 'Delivered')}</li>
          </ol>
          <div className="rider-destination"><span className="rider-destination-icon"><MapPin size={20} /></span><div><small>{text('DESTINASI', 'DESTINATION')}</small><strong>{order.name}</strong><p>{order.location}</p>{destination && <small>{text('Pin anggaran berdasarkan alamat', 'Approximate pin based on address')}</small>}{live && point && destination && <em>{text('Jarak terus', 'Straight-line distance')}: {formatRiderDistance(distanceMetres(point, destination))}</em>}</div></div>
          {isAdmin && <div className="rider-controls">
            {anotherOrder && <p className="rider-warning">{text('Perkongsian pesanan lain akan dihentikan jika anda mula untuk pesanan ini.', 'Starting this order will stop sharing for your other order.')}</p>}
            {device.phase === 'auth_required' && <p className="rider-warning">{text('Perkongsian dihentikan. Log masuk semula.', 'Sharing stopped. Sign in again.')}</p>}
            {device.phase === 'permission_denied' && <p className="rider-warning">{text('GPS tidak dibenarkan. Benarkan lokasi tepat dalam tetapan aplikasi atau pelayar, kemudian cuba lagi.', 'GPS permission denied. Allow precise location in app or browser settings, then retry.')}</p>}
            {uploadOffline && <p className="rider-warning">{text('Kemas kini GPS belum dapat dihantar. Semak sambungan dan waktu telefon. Percubaan diteruskan dengan bacaan baharu.', 'GPS updates could not be sent. Check your connection and device clock. Retrying with fresh fixes.')}</p>}
            {sharingThisOrder ? <button disabled={busy} className="rider-button rider-button-stop" onClick={() => void action(stopRiderSharing)}><CircleStop size={19} />{text('Henti perkongsian lokasi', 'Stop location sharing')}</button> : <button disabled={busy || !canStart} className="rider-button rider-button-primary" onClick={() => void action(() => startRiderSharing(order.id!))}><Navigation size={19} />{busy ? text('Menyambung…', 'Connecting…') : text('Mula kongsi lokasi', 'Start sharing location')}</button>}
            {!finished && <p className="rider-privacy"><ShieldCheck size={15} />{isNativeRider() ? text('Selepas anda mula, lokasi dikongsi di latar belakang dengan notifikasi. Hentikan di sini atau melalui notifikasi.', 'Once started, sharing continues in the background with a notification. Stop here or from the notification.') : text('Versi web berkongsi ketika peta ini dibuka. Menutup peta menghentikan GPS.', 'Web sharing works while this map is open. Closing the map stops GPS.')}</p>}
            <div className="rider-actions"><button disabled={busy} onClick={() => void openNavigation()}><Navigation size={18} />{text('Navigasi', 'Navigate')}<ArrowUpRight size={14} /></button>{order.contact && <a href={`tel:${order.contact.replace(/[^+\d]/g, '')}`}><Phone size={18} />{text('Telefon', 'Call')}</a>}</div>
            {onUpdateStatus && !finished && canStartRiderTracking(status) && <button disabled={busy} className="rider-complete" onClick={() => setConfirmFinish(true)}><Check size={17} />{text('Tandakan telah dihantar', 'Mark as delivered')}</button>}
            {live && point && destination && distanceMetres(point, destination) <= 200 && order.contact && <button className="rider-arrival" onClick={() => void action(() => launchWhatsApp({ phone: order.contact, message: text('Salam, rider Restoran Wawasan sudah berhampiran lokasi anda. Boleh saya sahkan tempat serahan?', 'Hello, your Restoran Wawasan rider is nearby. Could you confirm the handover point?') }))}><MessageCircle size={18} />{text('Sahkan tempat serahan melalui WhatsApp', 'Confirm handover point via WhatsApp')}</button>}
          </div>}
          {connection === 'offline' && <button className="rider-retry" onClick={refresh}><WifiOff size={17} />{text('Cuba sambung semula', 'Reconnect')}</button>}
          {error && <p role="alert" className="rider-warning">{error}</p>}
          {confirmFinish && <div className="rider-confirm" role="group" aria-label={text('Pengesahan serahan', 'Confirm handover')}><strong>{text('Pesanan telah diserahkan?', 'Has the order been handed over?')}</strong><p>{text('Perkongsian lokasi akan dihentikan.', 'Location sharing will stop.')}</p><div><button disabled={busy} onClick={() => setConfirmFinish(false)}>{text('Batal', 'Cancel')}</button><button disabled={busy} onClick={() => void action(async () => { await onUpdateStatus?.(order.id!, 'delivered'); await stopRiderSharing(); setConfirmFinish(false); })}>{text('Ya, telah dihantar', 'Yes, delivered')}</button></div></div>}
        </section>
      </div>
    </DialogContent>
  </Dialog>;
}
