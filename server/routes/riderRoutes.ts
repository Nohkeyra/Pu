import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { getInvoiceCallerAuth, isOrderOwnedByCaller } from './invoiceRoutes.js';
import { createBrevoTransporter, notifyCustomerOfStatusChange } from '../emailService.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';
import { canStartRiderTracking, distanceMetres, isFreshRiderLocation, RESTORAN_COORDS, RIDER_FRESH_MS, RIDER_MAX_ACCURACY_M, RIDER_SESSION_MS, validCoordinates, type GpsTelemetry, type RiderSession } from '../../src/lib/riderTracking.js';

const router = Router();
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id);
class TrackingError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}
const ended = (session: RiderSession, now: string, reason: string): RiderSession => ({ ...session, active: false, updatedAt: now, endedAt: now, reason });

// One explicitly started session for the sole rider. All writes remain admin-only.
router.post('/orders/:id/rider-session', verifyAdminToken, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, code: 'INVALID_ORDER' });
  try {
    const db = getFirestore();
    const ref = db.collection('orders').doc(req.params.id);
    const currentRef = db.collection('rider_sessions').doc('active');
    const now = new Date().toISOString();
    const session: RiderSession = { id: randomUUID(), active: true, startedAt: now, updatedAt: now, expiresAt: new Date(Date.now() + RIDER_SESSION_MS).toISOString(), lastSequence: 0 };
    await db.runTransaction(async tx => {
      const [order, current] = await Promise.all([tx.get(ref), tx.get(currentRef)]);
      if (!order.exists || order.data()?.deletedByAdmin) throw new TrackingError(404, 'ORDER_NOT_FOUND');
      if (!canStartRiderTracking(order.data()?.status)) throw new TrackingError(409, 'ORDER_NOT_ELIGIBLE');
      const previousId = current.data()?.orderId;
      const previousRef = validId(previousId) && previousId !== req.params.id ? db.collection('orders').doc(previousId) : null;
      const previous = previousRef ? await tx.get(previousRef) : null;
      if (previousRef && previous?.exists) {
        const data = previous.data();
        tx.update(previousRef, {
          ...(data?.riderTrackingSession ? { riderTrackingSession: ended(data.riderTrackingSession, now, 'replaced') } : {}),
          ...(data?.riderLocation ? { riderLocation: { ...data.riderLocation, active: false } } : {}),
        });
      }
      const data = order.data();
      tx.update(ref, { riderTrackingSession: session, ...(data?.riderLocation ? { riderLocation: { ...data.riderLocation, active: false } } : {}) });
      tx.set(currentRef, { orderId: req.params.id, sessionId: session.id, active: true, updatedAt: now });
    });
    return res.json({ success: true, session });
  } catch (error) {
    if (error instanceof TrackingError) return res.status(error.status).json({ success: false, code: error.code });
    console.error('[Rider session]', error);
    return res.status(500).json({ success: false, code: 'TRACKING_UNAVAILABLE' });
  }
});

router.post('/orders/:id/rider-location', verifyAdminToken, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, code: 'INVALID_ORDER' });
  const input = req.body || {};
  if (typeof input.sessionId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(input.sessionId)
    || !Number.isSafeInteger(input.sequence) || input.sequence < 1 || input.sequence > 1_000_000_000
    || typeof input.active !== 'boolean') return res.status(400).json({ success: false, code: 'INVALID_SESSION' });
  const nowMs = Date.now();
  if (input.active) {
    const capturedMs = typeof input.capturedAt === 'string' ? Date.parse(input.capturedAt) : NaN;
    if (input.source !== 'gps' || !validCoordinates(input.lat, input.lng)
      || !Number.isFinite(input.accuracy) || input.accuracy <= 0 || input.accuracy > RIDER_MAX_ACCURACY_M
      || !Number.isFinite(capturedMs) || nowMs - capturedMs > RIDER_FRESH_MS || capturedMs - nowMs > 15_000
      || !Number.isFinite(input.speed) || input.speed < 0 || input.speed > 300
      || !Number.isFinite(input.heading) || input.heading < 0 || input.heading >= 360) {
      return res.status(400).json({ success: false, code: 'INVALID_GPS_FIX' });
    }
  }
  try {
    const db = getFirestore();
    const ref = db.collection('orders').doc(req.params.id);
    const currentRef = db.collection('rider_sessions').doc('active');
    const now = new Date(nowMs).toISOString();
    const outcome = await db.runTransaction(async tx => {
      const [order, current] = await Promise.all([tx.get(ref), tx.get(currentRef)]);
      if (!order.exists || order.data()?.deletedByAdmin) throw new TrackingError(404, 'ORDER_NOT_FOUND');
      const data = order.data();
      const session = data?.riderTrackingSession as RiderSession | undefined;
      if (!session || session.id !== input.sessionId || current.data()?.sessionId !== input.sessionId || !session.active) throw new TrackingError(409, 'SESSION_REPLACED');
      if (input.sequence <= session.lastSequence) throw new TrackingError(409, 'STALE_SEQUENCE');
      if (!input.active || !canStartRiderTracking(data?.status) || Date.parse(session.expiresAt) <= nowMs) {
        const reason = !input.active ? 'stopped' : !canStartRiderTracking(data?.status) ? 'order_closed' : 'expired';
        const stopped = { ...ended(session, now, reason), lastSequence: input.sequence };
        const location = data?.riderLocation ? { ...data.riderLocation, active: false } : null;
        tx.update(ref, { riderTrackingSession: stopped, ...(location ? { riderLocation: location } : {}) });
        tx.set(currentRef, { orderId: req.params.id, sessionId: session.id, active: false, updatedAt: now });
        return { session: stopped, location, code: reason === 'stopped' ? undefined : 'TRACKING_ENDED' };
      }
      const location: GpsTelemetry = {
        lat: Number(input.lat.toFixed(6)), lng: Number(input.lng.toFixed(6)), accuracy: Number(input.accuracy.toFixed(1)),
        speed: Number(input.speed.toFixed(1)), heading: Math.round(input.heading) % 360,
        source: 'gps', active: true, sessionId: session.id, sequence: input.sequence,
        capturedAt: new Date(input.capturedAt).toISOString(), updatedAt: now,
      };
      const nextSession: RiderSession = { ...session, lastSequence: input.sequence, updatedAt: now };
      // Only an acknowledged real fix can trigger departure; telemetry does not reorder business records.
      const departing = ['approved', 'billed'].includes(data?.status) && distanceMetres(RESTORAN_COORDS, location) >= 100;
      tx.update(ref, { riderLocation: location, riderTrackingSession: nextSession, ...(departing ? { status: 'in_transit' } : {}) });
      return { session: nextSession, location, code: undefined, departedOrder: departing ? { ...data, id: req.params.id, status: 'in_transit' } : null };
    });
    if ('departedOrder' in outcome && outcome.departedOrder) {
      // Preserve the existing status notifications without delaying a GPS acknowledgement.
      const order = outcome.departedOrder;
      void notifyCustomerOfStatusChange(createBrevoTransporter(), order, 'in_transit', process.env.SENDER_EMAIL || process.env.SMTP_USER || '', process.env.SMTP_USER, process.env.SMTP_PASS).catch(() => console.error('[Rider] Status notification failed'));
      void syncGoogleCalendarEvent(req.params.id, order).catch(() => console.error('[Rider] Calendar sync failed'));
    }
    return res.status(outcome.code ? 409 : 200).json({ success: !outcome.code, code: outcome.code, riderLocation: outcome.location, session: outcome.session });
  } catch (error) {
    if (error instanceof TrackingError) return res.status(error.status).json({ success: false, code: error.code });
    console.error('[Rider location]', error);
    return res.status(500).json({ success: false, code: 'TRACKING_UNAVAILABLE' });
  }
});

router.get('/orders/:id/rider-location', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, code: 'INVALID_ORDER' });
  try {
    const caller = await getInvoiceCallerAuth(req);
    if (!caller) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
    const order = await getFirestore().collection('orders').doc(req.params.id).get();
    if (!order.exists || order.data()?.deletedByAdmin) return res.status(404).json({ success: false, code: 'ORDER_NOT_FOUND' });
    const data = order.data() || {};
    if (!isOrderOwnedByCaller(data, caller)) return res.status(403).json({ success: false, code: 'FORBIDDEN' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ success: true, riderLocation: data.riderLocation || null, session: data.riderTrackingSession || null, status: data.status, live: canStartRiderTracking(data.status) && isFreshRiderLocation(data.riderLocation, data.riderTrackingSession) });
  } catch (error) {
    console.error('[Read rider location]', error);
    return res.status(500).json({ success: false, code: 'TRACKING_UNAVAILABLE' });
  }
});

export default router;
