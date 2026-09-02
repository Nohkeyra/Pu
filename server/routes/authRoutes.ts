import { Router } from 'express';
import { randomUUID, createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, getAdminApp, verifyCustomerIdToken, hasAdminCredentials } from '../firebaseAdmin.js';
import { verifyAdminToken, effectiveJwtSecret, adminLoginLimiter, revokeJti } from '../adminAuth.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

// Constant-time string comparison preventing timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// Module-level cache for hashed credentials to avoid bcrypt hashing DoS on unauthenticated requests
let cachedRawPassHash: { raw: string; hash: string } | null = null;

const fcmTokenLimiter = createDistributedRateLimiter({
  prefix: 'fcm_token',
  limit: 20,
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many FCM token registration requests.' },
});

router.post('/admin/login', adminLoginLimiter, async (req, res) => {
  const { password } = req.body;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  const rawAdminPass = process.env.ADMIN_PASSWORD;

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

  if (typeof password !== 'string' || !password) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }

  let isValid = false;
  if (adminHash) {
    isValid = await bcrypt.compare(password, adminHash);
  } else if (rawAdminPass) {
    isValid = secureCompare(password, rawAdminPass);
  }

  if (isValid) {
    // Background sync credential to Firestore meta/admin_auth only after successful login (not on failed attempts)
    if (rawAdminPass && (!cachedRawPassHash || cachedRawPassHash.raw !== rawAdminPass)) {
      bcrypt.hash(rawAdminPass, 10).then(hash => {
        cachedRawPassHash = { raw: rawAdminPass, hash };
        const db = getFirestore();
        db.collection('meta').doc('admin_auth').set({
          hash,
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(err => {
          console.warn('[Admin Auth] Firestore sync background error:', err);
        });
      }).catch(err => {
        console.warn('[Admin Auth] bcrypt background hash error:', err);
      });
    }

    const token = jwt.sign(
      { role: 'admin', admin: true, timestamp: Date.now() },
      effectiveJwtSecret,
      { expiresIn: '30d', jwtid: randomUUID() }
    );

    // F-AUTH-DIAG (audit 2026-09-02): logged alongside the rejection log in
    // verifyAdminToken's catch block (server/adminAuth.ts) so the two can be
    // cross-referenced in Render logs — same prefix at issuance and at
    // rejection points to a server-side verification problem; a mismatched
    // prefix points to the client sending a different/stale token.
    console.log(`[Admin Auth] Issued admin token (prefix: ${token.slice(0, 12)}…, len ${token.length})`);

    let firebaseCustomToken: string | undefined;
    if (hasAdminCredentials()) {
      try {
        firebaseCustomToken = await getAuth(getAdminApp()).createCustomToken("admin", { admin: true });
      } catch (fbAuthErr) {
        console.warn("[Admin Auth] Failed to generate Firebase custom token:", fbAuthErr);
      }
    }

    return res.json({ success: true, token, firebaseCustomToken });
  } else {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Admin Verify Token Endpoint
router.get('/admin/verify', verifyAdminToken, async (_req, res) => {
  let firebaseCustomToken: string | undefined;
  if (hasAdminCredentials()) {
    try {
      firebaseCustomToken = await getAuth(getAdminApp()).createCustomToken("admin", { admin: true });
    } catch (fbAuthErr) {
      console.warn("[Admin Auth] Failed to generate Firebase custom token:", fbAuthErr);
    }
  }
  return res.json({ success: true, verified: true, firebaseCustomToken });
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
    const formatted = `RW ${String(next).padStart(5, '0')}`;
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
    if (!hasAdminCredentials()) {
      return res.status(503).json({ success: false, error: 'Firebase Admin credentials not configured on server' });
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
    if (!hasAdminCredentials()) {
      return res.status(503).json({ success: false, error: 'Firebase Admin credentials not configured on server' });
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
    const { fcmToken, orderId, invoiceNo, email } = req.body;
    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ success: false, error: 'fcmToken string is required' });
    }

    const cleanToken = fcmToken.trim();
    const uid = await verifyCustomerIdToken(req);
    const db = getFirestore();

    // Case 1: Authenticated Firebase customer
    if (uid) {
      await db.collection('users').doc(uid).set({
        fcmToken: cleanToken,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      if (orderId && typeof orderId === 'string') {
        const orderRef = db.collection('orders').doc(orderId);
        const snap = await orderRef.get();
        if (snap.exists) {
          const data = snap.data();
          if (data && (data.userId === uid || data.uid === uid)) {
            await orderRef.update({
              fcmToken: cleanToken,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      }

      return res.json({ success: true });
    }

    // Case 2: Guest order with proof of ownership (orderId/invoiceNo + matching email)
    if (email && typeof email === 'string' && (orderId || invoiceNo)) {
      const cleanEmail = email.toLowerCase().trim();
      let targetOrderDoc: FirebaseFirestore.DocumentSnapshot | null = null;

      if (orderId && typeof orderId === 'string') {
        const snap = await db.collection('orders').doc(orderId).get();
        if (snap.exists) {
          targetOrderDoc = snap;
        }
      } else if (invoiceNo && typeof invoiceNo === 'string') {
        const snap = await db.collection('orders').where('invoiceNo', '==', invoiceNo.trim()).limit(1).get();
        if (!snap.empty) {
          targetOrderDoc = snap.docs[0];
        }
      }

      if (!targetOrderDoc) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const data = targetOrderDoc.data();
      const orderEmail = (data?.email || data?.customerEmail || '').toLowerCase().trim();

      if (!orderEmail || orderEmail !== cleanEmail) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Email does not match order record' });
      }

      await targetOrderDoc.ref.update({
        fcmToken: cleanToken,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.json({ success: true });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication or order ownership proof (orderId/invoiceNo + email) is required',
    });
  } catch (err) {
    console.error('[FCM] Save user token failed:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
