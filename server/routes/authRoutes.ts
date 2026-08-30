import { Router } from 'express';
import { randomUUID, createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, getAdminApp, verifyCustomerIdToken } from '../firebaseAdmin.js';
import { verifyAdminToken, effectiveJwtSecret, adminLoginLimiter, revokeJti } from '../adminAuth.js';

const router = Router();

// F-SEC (audit 2026-08-30): the raw ADMIN_PASSWORD fallback path (used when
// ADMIN_PASSWORD_HASH isn't set) compared the submitted password with plain
// `===`. String equality in JS short-circuits on the first mismatched byte,
// so response time leaks how many leading characters an attacker guessed
// correctly — a classic timing side-channel. crypto.timingSafeEqual() fixes
// the comparison itself, but it requires both buffers to be the SAME length
// (it throws otherwise), which would leak the real password's length via a
// try/catch branch. Hashing both sides to a fixed-length digest first avoids
// that: every comparison is 32 bytes vs 32 bytes, so there's no length- or
// content-dependent branching before the constant-time comparison runs.
// Note: the bcrypt.compare() path just below (used when ADMIN_PASSWORD_HASH
// is set) was never affected — bcrypt is constant-time internally.
function secureCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// F-SEC (audit 2026-08-14): this endpoint used to fall back to a hardcoded
// literal password ('wawasan123') whenever ADMIN_PASSWORD_HASH and
// ADMIN_PASSWORD were both unset — a value visible to anyone reading the
// public GitHub source. Combined with the previous ADMIN_JWT_SECRET
// auto-generate fallback, a Render deploy missing both env vars would let
// anyone log in as admin with a password known from the repo itself.
// Both production and dev now fail closed: no configured credential means
// no logins are accepted at all (503), rather than silently accepting a
// known password. This applies in dev too — on Termux, set ADMIN_PASSWORD
// in your local .env before `npm run dev` if you need to log in as admin.
router.post('/admin/login', adminLoginLimiter, async (req, res) => {
  const { password } = req.body;
  let adminHash = process.env.ADMIN_PASSWORD_HASH;
  const rawAdminPass = process.env.ADMIN_PASSWORD;

  const db = getFirestore();

  // Auto-sync or load credentials via Firestore meta/admin_auth (Admin SDK only)
  if (adminHash || rawAdminPass) {
    try {
      const hashToSync = adminHash || await bcrypt.hash(rawAdminPass!, 10);
      await db.collection('meta').doc('admin_auth').set({
        hash: hashToSync,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (syncErr) {
      console.warn('[Admin Auth] Auto-sync to Firestore failed (non-fatal):', syncErr);
    }
  } else {
    try {
      const authDoc = await db.collection('meta').doc('admin_auth').get();
      if (authDoc.exists) {
        const data = authDoc.data();
        if (data && data.hash) {
          adminHash = data.hash;
        }
      }
    } catch (dbErr) {
      console.warn('[Admin Auth] Failed to fetch synced credential from Firestore:', dbErr);
    }
  }

  if (!adminHash && !rawAdminPass) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Admin Auth] Login rejected: neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set in production.'
      );
      return res.status(503).json({
        success: false,
        error: 'Admin login is not configured on this server.',
      });
    }
    console.warn(
      '[Admin Auth] Neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set. ' +
      'Dev/local admin login is disabled until one is configured — set ADMIN_PASSWORD in your local .env.'
    );
    return res.status(503).json({
      success: false,
      error: 'Admin login is not configured. Set ADMIN_PASSWORD in your local .env.',
    });
  }

  let isValid = false;
  if (adminHash) {
    isValid = await bcrypt.compare(password, adminHash);
  } else {
    isValid = secureCompare(typeof password === 'string' ? password : '', rawAdminPass!);
  }

  if (isValid) {
    const token = jwt.sign(
      { role: 'admin', admin: true, timestamp: Date.now() },
      effectiveJwtSecret,
      { expiresIn: '12h', jwtid: randomUUID() }
    );

    let firebaseCustomToken: string | null = null;
    try {
      const auth = getAuth(getAdminApp());
      firebaseCustomToken = await auth.createCustomToken('admin_hq_user', { admin: true });
    } catch (err) {
      console.warn('[Admin Auth] Firebase custom token creation failed:', err);
    }

    return res.json({ success: true, token, firebaseCustomToken });
  } else {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Admin Verify Token Endpoint
router.get('/admin/verify', verifyAdminToken, (_req, res) => {
  return res.json({ success: true, verified: true });
});

// Admin Logout Endpoint
router.post('/admin/logout', verifyAdminToken, async (req, res) => {
  try {
    const adminReq = req as any;
    if (adminReq.adminPayload && adminReq.adminPayload.jti) {
      await revokeJti(adminReq.adminPayload.jti, adminReq.adminPayload.exp);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[Admin Auth] Logout error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Admin Branding Update Endpoint
router.post('/admin/branding', verifyAdminToken, async (req, res) => {
  try {
    const { accent } = req.body;
    const db = getFirestore();
    await db.collection('settings').doc('branding').set({ accent }, { merge: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Next Invoice Number Helper
router.get('/admin/next-invoice-number', verifyAdminToken, async (_req, res) => {
  try {
    const db = getFirestore();
    const counterSnap = await db.collection('meta').doc('invoiceCounter').get();
    let next = 1;
    if (counterSnap.exists) {
      const data = counterSnap.data();
      if (data && typeof data.count === 'number') {
        next = data.count + 1;
      }
    }
    const formatted = `RW-${String(next).padStart(4, '0')}`;
    return res.json({ nextInvoiceNo: formatted, next: formatted });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch counter' });
  }
});

// Admin Subscribe to FCM Topic
router.post('/admin/subscribe-to-topic', verifyAdminToken, async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || typeof token !== 'string' || !topic || typeof topic !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid token and topic strings are required' });
    }
    const app = getAdminApp();
    const messaging = getMessaging(app);
    const response = await messaging.subscribeToTopic([token.trim()], topic.trim());
    console.log(`[FCM] Subscribed device token to topic '${topic}':`, response);
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
    const app = getAdminApp();
    const messaging = getMessaging(app);
    const response = await messaging.unsubscribeFromTopic([token.trim()], topic.trim());
    console.log(`[FCM] Unsubscribed device token from topic '${topic}':`, response);
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
router.post('/user/fcm-token', async (req, res) => {
  try {
    const { fcmToken, orderId, email } = req.body;
    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ success: false, error: 'fcmToken string is required' });
    }

    const cleanToken = fcmToken.trim();
    const uid = await verifyCustomerIdToken(req);
    const db = getFirestore();

    if (uid) {
      await db.collection('users').doc(uid).set({
        fcmToken: cleanToken,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    if (orderId && typeof orderId === 'string') {
      const orderRef = db.collection('orders').doc(orderId);
      const snap = await orderRef.get();
      if (snap.exists) {
        await orderRef.update({
          fcmToken: cleanToken,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    if (email && typeof email === 'string' && !uid) {
      const usersSnap = await db.collection('users').where('email', '==', email.trim()).limit(1).get();
      if (!usersSnap.empty) {
        await usersSnap.docs[0].ref.set({
          fcmToken: cleanToken,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[FCM] Save user token failed:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
