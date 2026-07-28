import { useEffect, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';
import { Capacitor } from '@capacitor/core';
import { db, auth } from '@/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
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

        await PushNotifications.register();

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
              await updateDoc(userDocRef, { fcmToken });
              console.log('FCM token mapped to user profile on registration:', currentUser.uid);
            }
          } catch (tokenErr) {
            console.error('Error fetching FCM token:', tokenErr);
          }
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received in foreground: ', notification);
        });
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
          await updateDoc(userDocRef, { fcmToken: tokenRef.current });
          console.log('FCM token mapped to user profile on auth change:', user.uid);
        } catch (err) {
          console.error('Error mapping FCM token on auth change:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [notificationsEnabled]);
}
