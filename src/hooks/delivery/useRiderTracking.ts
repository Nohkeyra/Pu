import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/firebaseConfig';
import { getApiUrl } from '@/lib/api';
import { getStoredAdminToken } from '@/services/authService';
import { getRiderDeviceState, isNativeRider, stopRiderSharing, type RiderDeviceState } from '@/services/riderTrackingService';
import type { GpsTelemetry, RiderSession } from '@/lib/riderTracking';

export function useRiderTracking(orderId: string | undefined, isAdmin: boolean) {
  const [snapshot, setSnapshot] = useState<{ riderLocation: GpsTelemetry | null; session: RiderSession | null; status: string; otwBatchId?: string | null; otwAutoCloseAt?: string | null } | null>(null);
  const [connection, setConnection] = useState<'loading' | 'connected' | 'offline' | 'forbidden'>('loading');
  const [device, setDevice] = useState<RiderDeviceState>({ active: false, phase: 'idle' });
  const [now, setNow] = useState(Date.now);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    if (!orderId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const token = isAdmin ? await getStoredAdminToken() : await auth?.currentUser?.getIdToken();
        if (!token) { if (!disposed) setConnection('forbidden'); return; }
        const response = await fetch(getApiUrl(`/api/orders/${orderId}/rider-location`), {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403 || response.status === 404) { if (!disposed) setConnection('forbidden'); return; }
          throw new Error('Tracking unavailable');
        }
        const data = await response.json();
        if (!disposed) { setSnapshot(data); setConnection('connected'); }
      } catch { if (!disposed) setConnection('offline'); }
      finally { if (!disposed) timer = setTimeout(poll, 5000); }
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [orderId, isAdmin, revision]);

  useEffect(() => {
    let mounted = true;
    const tick = () => {
      setNow(Date.now());
      if (isAdmin) void getRiderDeviceState().then(value => { if (mounted) setDevice(value); }).catch(() => {});
    };
    tick();
    const timer = setInterval(tick, 2000);
    return () => { mounted = false; clearInterval(timer); if (isAdmin && !isNativeRider()) void stopRiderSharing(); };
  }, [isAdmin]);
  return { snapshot, connection, device, now, refresh };
}
