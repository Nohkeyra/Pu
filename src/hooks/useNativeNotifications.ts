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
          console.log('Push registration successful, native token:', token.value);
          
          try {
            localStorage.setItem('wawasan_device_token', token.value);
          } catch {
            // Ignore localStorage errors
          }

          // Subscribe to the "new_orders" topic ONLY for an active admin session.
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
          try {
            localStorage.setItem('wawasan_fcm_token', activePushToken);
          } catch {
            // Ignore localStorage errors
          }

          // Sync with backend API
          fetch(getApiUrl('/api/user/fcm-token'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcmToken: activePushToken, deviceToken: token.value })
          }).catch(err => console.warn('[FCM] Server token sync failed:', err));

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
