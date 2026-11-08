import { useEffect, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';
import { Capacitor } from '@capacitor/core';
import { db, auth } from '@/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useSettings } from '@/context/SettingsContext';
import { getApiUrl } from '@/lib/api';
import { getSecureItem } from '@/lib/preferences';

const ADMIN_TOKEN_STORAGE_KEY = 'wawasan_admin_token';

/** Customer token registration requires a Firebase ID token on the server. */
async function syncCustomerFcmToken(fcmToken: string, deviceToken?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return; // Guests cannot use the authenticated customer endpoint.

  try {
    const idToken = await user.getIdToken();
    // An auth change during getIdToken must not associate the token with the old account.
    if (auth.currentUser?.uid !== user.uid) return;

    const response = await fetch(getApiUrl('/api/user/fcm-token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fcmToken, ...(deviceToken ? { deviceToken } : {}) }),
    });
    if (!response.ok) {
      console.warn('[FCM] Server token sync rejected:', response.status);
    }
  } catch (err) {
    console.warn('[FCM] Server token sync failed:', err);
  }
}

/** Subscribe only after admin sign-in, and report HTTP failures accurately. */
async function subscribeAdminToPushTopic(fcmToken: string): Promise<void> {
  try {
    const adminToken = await getSecureItem(ADMIN_TOKEN_STORAGE_KEY);
    if (!adminToken) return;

    const response = await fetch(getApiUrl('/api/admin/subscribe-to-topic'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ token: fcmToken, topic: 'new_orders' }),
    });
    if (!response.ok) {
      console.warn('[FCM] Admin topic subscription rejected:', response.status);
    }
  } catch (err) {
    console.warn('[FCM] Admin topic subscription failed:', err);
  }
}

export function useNativeNotifications() {
  const { notificationsEnabled } = useSettings();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!notificationsEnabled) {
      console.log('Push notifications are disabled in settings.');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications: Web environment detected, skipping registration.');
      return;
    }

    const setupPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt' || (permStatus.receive as string) === 'prompt-with-rationale') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
          console.warn('Push notifications permission status:', permStatus.receive);
          return;
        }

        // Android 8+ (API 26+) notification channel creation
        try {
          await PushNotifications.createChannel({
            id: 'order_status',
            name: 'Kemas Kini Tempahan / Order Updates',
            description: 'Pemberitahuan status tempahan (diluluskan, invois, dibatalkan). / Order status notifications.',
            importance: 4, // HIGH — heads-up notification
            visibility: 1, // PUBLIC — full content on lockscreen
            vibration: true,
          });

          await PushNotifications.createChannel({
            id: 'new_orders',
            name: 'Tempahan Baharu (Admin) / New Orders',
            description: 'Notifikasi tempahan baharu dan permintaan pembatalan bagi pentadbir.',
            importance: 5, // MAX importance
            visibility: 1,
            vibration: true,
          });
        } catch (channelErr) {
          console.warn('Error creating notification channels:', channelErr);
        }

        await PushNotifications.addListener('registration', async (token) => {
          // Never log device push tokens; they can be used to address this device.
          
          try {
            localStorage.setItem('wawasan_device_token', token.value);
          } catch {
            // Ignore localStorage errors
          }

          // Fetch FCM token with native token fallback
          let activePushToken = token.value;
          try {
            const fcmTokenResult = await FCM.getToken();
            if (fcmTokenResult?.token) {
              activePushToken = fcmTokenResult.token;
            }
          } catch (fcmErr) {
            console.warn('[PushNotifications] FCM.getToken failed, using native device token fallback:', fcmErr);
          }

          tokenRef.current = activePushToken;

          // Both cold-start sessions and fresh sign-ins must subscribe.
          await subscribeAdminToPushTopic(activePushToken);

          try {
            localStorage.setItem('wawasan_fcm_token', activePushToken);
          } catch {
            // Ignore localStorage errors
          }

          // The server requires a verified Firebase session; guest devices
          // must not send an unauthenticated request that will always be rejected.
          await syncCustomerFcmToken(activePushToken, token.value);

          const currentUser = auth.currentUser;
          if (currentUser) {
            try {
              const userDocRef = doc(db, 'users', currentUser.uid);
              await setDoc(userDocRef, { 
                fcmToken: activePushToken, 
                pushToken: token.value, 
                updatedAt: new Date().toISOString() 
              }, { merge: true });
              console.log('Push token mapped to user profile on registration:', currentUser.uid);
            } catch (userDocErr) {
              console.warn('Failed to update user profile with push token:', userDocErr);
            }
          }
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received in foreground: ', notification);
          window.dispatchEvent(new CustomEvent('wawasan:push_received', { detail: notification }));
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push notification registration failed:', error.error);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          const data = action.notification.data;
          window.dispatchEvent(new CustomEvent('wawasan:push_action', { detail: data }));
          if (data && data.orderId) {
            console.log('Notification has orderId payload:', data.orderId);
          }
        });

        await PushNotifications.register();
      } catch (err) {
        console.error('Error setting up push notifications:', err);
      }
    };

    setupPush();

    // Cleanup listeners if component unmounts
    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [notificationsEnabled]);

  // Listen to Auth State Changes to map token when user logs in reactively
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !notificationsEnabled) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && tokenRef.current) {
        // A user may sign in after the native registration callback already ran.
        await syncCustomerFcmToken(tokenRef.current);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { fcmToken: tokenRef.current }, { merge: true });
          console.log('FCM token mapped to user profile on auth change:', user.uid);
        } catch (err) {
          console.error('Error mapping FCM token on auth change:', err);
        }
      }
    });

    // Firebase auth can finish before the app saves its server-verified admin
    // session. authService emits this event once saveAdminToken finishes.
    const onAdminSessionChange = () => {
      if (tokenRef.current) void subscribeAdminToPushTopic(tokenRef.current);
    };
    window.addEventListener('admin:login-state-change', onAdminSessionChange);

    return () => {
      unsubscribe();
      window.removeEventListener('admin:login-state-change', onAdminSessionChange);
    };
  }, [notificationsEnabled]);
}
