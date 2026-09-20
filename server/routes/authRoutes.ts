import { Router } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, getAdminApp, verifyCustomerIdToken, hasAdminCredentials } from '../firebaseAdmin.js';
import { verifyAdminToken, adminLoginLimiter, signAdminJwt } from '../adminAuth.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

// Constant-time string comparison preventing timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
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

    const adminEmail = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'madnor.noisy@gmail.com').split(',')[0].trim();
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
      firebaseCustomToken: firebaseCustomToken || token,
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

// Admin Logout Endpoint
router.post('/admin/logout', async (_req, res) => {
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
      let targetOrderDoc = null;

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
