import { firestoreQuota, isFirestoreQuotaError } from './firestoreQuota.js';
import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from '../firebaseAdmin.js';
import { malaysiaDate, otwAutoCloseAt, otwEventDate, otwEventMinute, otwSessionForMinute, selectOtwOrders } from '../../src/lib/otwSession.js';
import { createBrevoTransporter, notifyCustomerOfStatusChange } from '../emailService.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';

export class OtwError extends Error {
  status: number;
  constructor(publicCode: string, status = 409) { super(publicCode); this.status = status; }
}

function deliveryOrder(order: Record<string, any>): boolean {
  return order.delivery === 'delivery' || order.delivery?.type === 'delivery';
}

async function notify(orders: Record<string, any>[], status: string) {
  await Promise.allSettled(orders.map(async order => {
    await Promise.allSettled([
      notifyCustomerOfStatusChange(createBrevoTransporter(), order, status,
        process.env.SENDER_EMAIL || process.env.SMTP_USER || '', process.env.SMTP_USER, process.env.SMTP_PASS),
      syncGoogleCalendarEvent(order.id, order),
    ]);
  }));
}

/** One forward 60-minute window, within one meal session and today's MY date. */
export async function startOtwOrders(orderId: string, clock = new Date()) {
  const db = getFirestore(), today = malaysiaDate(clock);
  const sourceRef = db.collection('orders').doc(orderId);
  const sourceSnap = await sourceRef.get(), source = sourceSnap.data();
  if (!sourceSnap.exists || source?.deletedByAdmin) throw new OtwError('ORDER_NOT_FOUND', 404);
  if (!source || otwEventDate(source) !== today) throw new OtwError('OTW_TODAY_ONLY');
  if (!deliveryOrder(source)) throw new OtwError('OTW_DELIVERY_ONLY');
  const minute = otwEventMinute(source.time), session = minute === null ? null : otwSessionForMinute(minute);
  if (minute === null || !session) throw new OtwError('OTW_INVALID_EVENT_TIME');

  // An acknowledged retry returns the original persisted deadline, never restarts it.
  if (source.status === 'in_transit' && source.otwBatchId) {
    const previous = await db.collection('otw_batches').doc(source.otwBatchId).get();
    if (previous.data()?.state === 'active') return { ...previous.data(), batchId: previous.id };
    throw new OtwError('OTW_ORDER_CLOSED');
  }
  if (!['approved', 'billed', 'in_transit'].includes(source.status)) throw new OtwError('ORDER_NOT_ELIGIBLE');
  const all = await db.collection('orders').where('status', 'in', ['approved', 'billed', 'in_transit']).get();
  const selected = selectOtwOrders(all.docs.map<Record<string, any> & { id: string }>(doc => ({ ...doc.data(), id: doc.id })), today, session, deliveryOrder, true)
    .filter(order => {
      const time = otwEventMinute(order.time);
      return time !== null && time >= minute && time <= minute + 60;
    });
  if (!selected.some(order => order.id === orderId)) throw new OtwError('ORDER_CHANGED');
  if (selected.length > 200) throw new OtwError('OTW_GROUP_TOO_LARGE');
  const batchRef = db.collection('otw_batches').doc(randomUUID());
  const startedAt = clock.toISOString(), autoCloseAt = otwAutoCloseAt(clock);
  const outcome = await db.runTransaction(async tx => {
    const snapshots = await Promise.all(selected.map(order => tx.get(db.collection('orders').doc(order.id))));
    const freshSource = snapshots.find(snap => snap.id === orderId)?.data();
    if (freshSource?.status === 'in_transit' && freshSource.otwBatchId) {
      const previous = await tx.get(db.collection('otw_batches').doc(freshSource.otwBatchId));
      if (previous.data()?.state === 'active') return { batch: { ...previous.data(), batchId: previous.id }, orders: [] };
    }
    for (const snap of snapshots) {
      const data = snap.data(), time = otwEventMinute(data?.time);
      if (!snap.exists || !data || data.deletedByAdmin || !deliveryOrder(data) ||
        (!['approved', 'billed'].includes(data.status) && !(data.status === 'in_transit' && !data.otwBatchId)) || otwEventDate(data) !== today ||
        time === null || time < minute || time > minute + 60 || otwSessionForMinute(time) !== session) {
        throw new OtwError('ORDER_CHANGED');
      }
    }
    const batch = { batchId: batchRef.id, orderIds: snapshots.map(snap => snap.id),
      eventDate: today, session, startedAt, autoCloseAt, state: 'active' };
    const orders = snapshots.map(snap => {
      const updates = { status: 'in_transit', otwBatchId: batchRef.id, otwStartedAt: startedAt,
        otwAutoCloseAt: autoCloseAt, updatedAt: FieldValue.serverTimestamp() };
      tx.update(snap.ref, updates);
      return { ...snap.data(), ...updates, id: snap.id };
    });
    tx.set(batchRef, batch);
    return { batch, orders };
  });
  void notify(outcome.orders, 'in_transit').catch(error => console.error('[OTW] Notification failed:', error));
  return outcome.batch;
}

/** Recover due batches after restarts. Transactions also serialize multiple workers. */
export async function completeDueOtwOrders(clock = new Date()) {
  const db = getFirestore();
  // A single-field query works without deploying a new composite index.
  const batches = await db.collection('otw_batches').where('state', '==', 'active').get();
  let completed = 0;
  for (const batch of batches.docs) {
    const deadline = Date.parse(batch.data().autoCloseAt);
    if (!Number.isFinite(deadline) || deadline > clock.getTime()) continue;
    const orders = await db.runTransaction(async tx => {
      const fresh = await tx.get(batch.ref), data = fresh.data();
      if (!data || data.state !== 'active' || Date.parse(data.autoCloseAt) > clock.getTime()) return [];
      const snapshots = await Promise.all((data.orderIds as string[]).map(id => tx.get(db.collection('orders').doc(id))));
      const changed: Record<string, any>[] = [];
      for (const snap of snapshots) {
        const order = snap.data();
        if (!order || order.deletedByAdmin || order.status !== 'in_transit' || order.otwBatchId !== batch.id) continue;
        const updates = { status: 'completed', otwCompletedAt: clock.toISOString(), updatedAt: FieldValue.serverTimestamp(),
          ...(order.riderLocation ? { riderLocation: { ...order.riderLocation, active: false } } : {}),
          ...(order.riderTrackingSession ? { riderTrackingSession: { ...order.riderTrackingSession,
            active: false, endedAt: clock.toISOString(), reason: 'otw_completed' } } : {}) };
        tx.update(snap.ref, updates);
        changed.push({ ...order, ...updates, id: snap.id });
      }
      tx.update(batch.ref, { state: 'completed', completedAt: clock.toISOString() });
      return changed;
    });
    completed += orders.length;
    void notify(orders, 'completed').catch(error => console.error('[OTW] Completion notification failed:', error));
  }
  return completed;
}

export function startOtwWorker(): () => void {
  let running = false;

  const poll = async () => {
    if (running) return;

    running = true;
    try {
      await firestoreQuota.run(() => completeDueOtwOrders());
    }
    catch (error: unknown) {
      if (!isFirestoreQuotaError(error)) console.error('[OTW] Completion check failed; persisted deadlines will be retried:', error);
    }
    finally { running = false; }
  };
  void poll();
  const timer = setInterval(() => void poll(), 30_000);
  timer.unref();
  return () => clearInterval(timer);
}
