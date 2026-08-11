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
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
          console.warn('Push notifications permission not granted');
          return;
        }

        // F-CHAN (audit 2026-08-11): Android 8+ (API 26+, which is all of
        // our minSdk 24 install base running a modern OS) requires every
        // notification to belong to a channel, or it silently falls back to
        // whatever channel ID is in the manifest meta-data (currently
        // "default" — see AndroidManifest.xml). That fallback means every
        // push looked the same to the OS regardless of type, so the
        // customer couldn't set a different sound/vibration/importance for
        // order-status updates specifically. This channel id ('order_status')
        // must match the channelId the server sends in sendOrderStatusPush
        // (server/emailService.ts) — if either side is wrong, notifications
        // silently fall back to the manifest default channel again, so keep
        // them in sync if either side ever changes.
        // createChannel() is a no-op on iOS/web; only takes effect on Android.
        try {
          await PushNotifications.createChannel({
            id: 'order_status',
            name: 'Kemas Kini Tempahan / Order Updates',
            description: 'Pemberitahuan status tempahan (diluluskan, invois, dibatalkan). / Order status notifications (approved, invoiced, cancelled).',
            importance: 4, // HIGH — heads-up notification, matches prior default behaviour
            visibility: 1, // PUBLIC — full content on lockscreen
            vibration: true,
          });
        } catch (channelErr) {
          // Never let channel setup block registration — worst case the
          // notification falls back to the manifest default channel.
          console.warn('Error creating order_status notification channel:', channelErr);
        }

        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration successful, token:', token.value);
          
          // Subscribe to the "new_orders" topic ONLY for an active admin session.
          // This hook runs for every native install (admin and customers alike),
          // and "new_orders" broadcasts every incoming order/cancellation with the
          // customer's name and pax count. Without this guard, any customer with
          // the APK installed would silently receive other customers' order
          // notifications. See wawasan_admin_token in AdminPage.tsx / preferences.ts.
          try {
            const adminToken = await getSecureItem(ADMIN_TOKEN_STORAGE_KEY);
            if (adminToken) {
              await fetch(getApiUrl('/api/admin/subscribe-to-topic'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${adminToken}`,
                },
                body: JSON.stringify({ token: token.value, topic: 'new_orders' })
              });
              console.log('Successfully subscribed to new_orders topic (admin session)');
            } else {
              console.log('No active admin session; skipping new_orders topic subscription.');
            }
          } catch (subscribeErr) {
            console.error('Error subscribing to topic:', subscribeErr);
          }

          // Fetch FCM token and map to user profile if logged in
          try {
            const fcmTokenResult = await FCM.getToken();
            const fcmToken = fcmTokenResult.token;
            tokenRef.current = fcmToken;

            const currentUser = auth.currentUser;
            if (currentUser) {
              const userDocRef = doc(db, 'users', currentUser.uid);
              await setDoc(userDocRef, { fcmToken }, { merge: true });
              console.log('FCM token mapped to user profile on registration:', currentUser.uid);
            }
          } catch (tokenErr) {
            console.error('Error fetching FCM token:', tokenErr);
          }
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received in foreground: ', notification);
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push notification registration failed:', error.error);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          const data = action.notification.data;
          if (data && data.orderId) {
            console.log('Notification has orderId payload:', data.orderId);
            // In a complete implementation, this can deep-link or alert the user.
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
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { fcmToken: tokenRef.current }, { merge: true });
          console.log('FCM token mapped to user profile on auth change:', user.uid);
        } catch (err) {
          console.error('Error mapping FCM token on auth change:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [notificationsEnabled]);
}
