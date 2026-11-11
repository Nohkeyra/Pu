import { Router } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, getAdminApp, verifyFirebaseIdToken, hasAdminCredentials, isFirebaseAdminIdentity, firebaseTokenRevocationId, firebaseSessionRevocationId } from '../firebaseAdmin.js';
import { verifyAdminToken, adminLoginLimiter, signAdminJwt, verifyAdminJwt } from '../adminAuth.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

// Constant-time string comparison preventing timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const fcmTokenLimiter = createDistributedRateLimiter({
  prefix: 'fcm_token',
  limit: 20,
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many FCM token registration requests.' },
});

// Admin Login Endpoint (Rate-limited, Constant-time verification, Custom Claims)
router.post('/admin/login', adminLoginLimiter, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Kata laluan diperlukan.' });
    }

    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword || !expectedPassword.trim()) {
      // Never fall back to a fixed, publicly-known default password
      // ("wawasan2026" previously shipped in source): that would let
      // anyone who has read this file log in as admin on any deployment
      // that forgot to set ADMIN_PASSWORD. Fail closed instead.
      console.error('[Admin Auth] ADMIN_PASSWORD is not configured. Refusing admin login.');
      return res.status(503).json({ success: false, error: 'Log masuk pentadbir tidak dikonfigurasi pada pelayan ini.' });
    }
    if (!secureCompare(password.trim(), expectedPassword.trim())) {
      return res.status(401).json({ success: false, error: 'Kata laluan pentadbir tidak sah.' });
    }

    const adminEmail = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',')[0].trim();
    const adminUid = 'admin_' + createHash('sha256').update(expectedPassword.trim()).digest('hex').slice(0, 12);

    let firebaseCustomToken: string | undefined;
    if (hasAdminCredentials()) {
      try {
        const app = getAdminApp();
        const auth = getAuth(app);
        firebaseCustomToken = await auth.createCustomToken(adminUid, { admin: true, email: adminEmail });
      } catch (fbErr) {
        console.warn('[Admin Auth] Firebase createCustomToken failed:', fbErr);
      }
    }

    const token = signAdminJwt({ uid: adminUid, email: adminEmail, admin: true });

    return res.json({
      success: true,
      token,
      ...(firebaseCustomToken ? { firebaseCustomToken } : {}),
      customClaims: { admin: true },
      admin: true,
    });
  } catch (err) {
    console.error('[Admin Auth] Login error:', err);
    return res.status(500).json({ success: false, error: 'Ralat pelayan semasa log masuk pentadbir.' });
  }
});

// Admin Verify Token Endpoint
router.get('/admin/verify', verifyAdminToken, async (req, res) => {
  const userPayload = (req as any).adminPayload || (req as any).user;
  return res.json({
    success: true,
    verified: true,
    admin: true,
    user: userPayload,
  });
});

// Revoke the presented admin credential, including the Firebase ID tokens used
// by normal admin sign-in. Store only its hash; other devices remain signed in.
// Missing/expired/already-revoked credentials remain idempotent.
router.post('/admin/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const payload = token ? verifyAdminJwt(token) : null;

  // Logout may safely overwrite an existing hash record. Avoid a preliminary
  // Firestore lookup so a read failure cannot be mistaken for an expired token.
  const identity = !payload && token ? await verifyFirebaseIdToken(token, { checkSessionRevocation: false }) : null;
  if (payload?.jti || (identity && isFirebaseAdminIdentity(identity))) {
    try {
      const db = getFirestore();
      // Session records have no TTL: Firebase refresh credentials can outlive an
      // individual ID token. New sign-ins and other auth_time values remain valid.
      const expireAt = new Date(Date.now() + (payload ? 25 * 60 * 60 : 65 * 60) * 1000);
      const sessionKey = identity ? firebaseSessionRevocationId(identity) : null;
      const key = payload ? `jti_${payload.jti}` : sessionKey || firebaseTokenRevocationId(token!);
      await db.collection('admin_revocations').doc(key).set({
        ...(payload ? { jti: payload.jti } : {}),
        uid: payload?.uid || identity!.uid,
        revokedAt: FieldValue.serverTimestamp(),
        ...(!sessionKey ? { expireAt } : { tokenHash: createHash('sha256').update(token!).digest('hex') }),
      });
    } catch (err) {
      console.error('[Admin Logout] Failed to record session revocation:', err);
      return res.status(503).json({
        success: false,
        error: 'Could not revoke this admin session. Please retry logout.',
      });
    }
  }

  return res.json({ success: true, message: 'Log keluar berjaya' });
});

// Admin Subscribe to FCM Topic
router.post('/admin/subscribe-to-topic', verifyAdminToken, async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || typeof token !== 'string' || !topic || typeof topic !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid token and topic strings are required' });
    }
    if (!hasAdminCredentials()) {
      return res.status(503).json({ success: false, error: 'Firebase Admin credentials not configured on server' });
    }

    const app = getAdminApp();
    const messaging = getMessaging(app);
    const response = await messaging.subscribeToTopic([token.trim()], topic.trim());
    console.log("[FCM] Subscribed device token to topic '%s':", topic, response);
    return res.json({ success: true, topic, response });
  } catch (err) {
    console.error('[FCM] Error subscribing token to topic:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Admin Unsubscribe from FCM Topic
router.post('/admin/unsubscribe-from-topic', verifyAdminToken, async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || typeof token !== 'string' || !topic || typeof topic !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid token and topic strings are required' });
    }
    if (!hasAdminCredentials()) {
      return res.status(503).json({ success: false, error: 'Firebase Admin credentials not configured on server' });
    }

    const app = getAdminApp();
    const messaging = getMessaging(app);
    const response = await messaging.unsubscribeFromTopic([token.trim()], topic.trim());
    console.log("[FCM] Unsubscribed device token from topic '%s':", topic, response);
    return res.json({ success: true, topic, response });
  } catch (err) {
    console.error('[FCM] Error unsubscribing token from topic:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Admin Send Test Push Notification
router.post('/admin/send-test-push', verifyAdminToken, async (req, res) => {
  try {
    const { target, topic = 'new_orders', token, title, body } = req.body;
    if (!hasAdminCredentials()) {
      return res.status(503).json({ success: false, error: 'Firebase Admin credentials not configured on server' });
    }
    const app = getAdminApp();
    const messaging = getMessaging(app);
    const pushTitle = title || '🔔 Ujian Notifikasi FCM / FCM Test Push';
    const pushBody = body || 'Notifikasi tolak berfungsi dengan cemerlang pada peranti anda!';
    
    if (target === 'token' && token) {
      const response = await messaging.send({
        token: token.trim(),
        notification: { title: pushTitle, body: pushBody },
        android: {
          notification: {
            channelId: 'order_status',
            sound: 'default',
            priority: 'high',
          },
        },
        data: {
          type: 'test_notification',
          timestamp: new Date().toISOString(),
        },
      });
      return res.json({ success: true, target: 'token', response });
    } else {
      const targetTopic = (topic || 'new_orders').trim();
      const response = await messaging.send({
        topic: targetTopic,
        notification: { title: pushTitle, body: pushBody },
        android: {
          notification: {
            channelId: 'order_status',
            sound: 'default',
            priority: 'high',
          },
        },
        data: {
          type: 'test_topic_notification',
          topic: targetTopic,
          timestamp: new Date().toISOString(),
        },
      });
      return res.json({ success: true, target: 'topic', topic: targetTopic, response });
    }
  } catch (err) {
    console.error('[FCM] Send test push failed:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// User / Customer FCM Token Sync Endpoint
router.post('/user/fcm-token', fcmTokenLimiter, async (req, res) => {
  try {
    const { fcmToken, orderId, invoiceNo } = req.body || {};
    if (typeof fcmToken !== 'string' || !fcmToken.trim() || fcmToken.length > 4096) {
      return res.status(400).json({ success: false, error: 'fcmToken string is required' });
    }
    const cleanToken = fcmToken.trim();
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const identity = token ? await verifyFirebaseIdToken(token) : null;
    if (!identity) return res.status(401).json({ success: false, error: 'Authentication is required' });
    const uid = identity.uid;
    if ((orderId !== undefined && (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(orderId))) ||
        (invoiceNo !== undefined && (typeof invoiceNo !== 'string' || !invoiceNo.trim() || invoiceNo.length > 100))) {
      return res.status(400).json({ success: false, error: 'Invalid order reference' });
    }
    const db = getFirestore();
    // Check ownership and write against one snapshot. Legacy orders without a UID
    // require the verified email from Firebase, never an address in the body.
    const result = await db.runTransaction(async tx => {
      const order = orderId
        ? await tx.get(db.collection('orders').doc(orderId))
        : invoiceNo
          ? (await tx.get(db.collection('orders').where('invoiceNo', '==', invoiceNo.trim()).limit(1))).docs[0]
          : null;
      if ((orderId || invoiceNo) && !order?.exists) return 404;
      if (order) {
        const data = order.data() || {};
        const owner = data.userId || data.uid;
        const email = typeof (data.email || data.customerEmail) === 'string' ? (data.email || data.customerEmail).trim().toLowerCase() : '';
        const ownsOrder = owner ? owner === uid : Boolean(identity.email_verified && identity.email && email && identity.email.trim().toLowerCase() === email);
        if (!ownsOrder || data.deletedByAdmin) return 403;
        tx.update(order.ref, { fcmToken: cleanToken, updatedAt: FieldValue.serverTimestamp() });
      }
      tx.set(db.collection('users').doc(uid), { fcmToken: cleanToken, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return 200;
    });
    return res.status(result).json(result === 200 ? { success: true } : { success: false, error: result === 404 ? 'Order not found' : 'Not authorized for this order' });
  } catch (err) {
    console.error('[FCM] Save user token failed:', err);
    console.error('[authRoutes] /user/fcm-token:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
