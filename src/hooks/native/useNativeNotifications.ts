import { useEffect, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useSettings } from '@/context/SettingsContext';
import { getApiUrl } from '@/lib/api';
import { getSecureItem } from '@/lib/preferences';

const ADMIN_TOKEN_STORAGE_KEY = 'wawasan_admin_token';

/** Customer token registration requires a Firebase ID token on the server. */
async function syncCustomerFcmToken(fcmToken: string): Promise<void> {
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
      body: JSON.stringify({ fcmToken }),
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

    let active = true;
    const handles = new Set<PluginListenerHandle>();
    const removeOwnedListeners = () => {
      for (const handle of handles) void handle.remove().catch(err => console.warn('[FCM] Listener cleanup failed:', err));
      handles.clear();
    };
    const attach = async (pending: Promise<PluginListenerHandle>): Promise<boolean> => {
      const handle = await pending;
      if (!active) { await handle.remove(); return false; }
      handles.add(handle);
      return true;
    };

    const setupPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (!active) return;
        if (permStatus.receive === 'prompt' || (permStatus.receive as string) === 'prompt-with-rationale') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (!active) return;
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

          if (!active) return;
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

        if (!active) return;
        if (!await attach(PushNotifications.addListener('registration', async (token) => {
          if (!active) return;
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

          if (!active) return;
          tokenRef.current = activePushToken;

          // Both cold-start sessions and fresh sign-ins must subscribe.
          await subscribeAdminToPushTopic(activePushToken);
          if (!active) return;

          try {
            localStorage.setItem('wawasan_fcm_token', activePushToken);
          } catch {
            // Ignore localStorage errors
          }

          // The server requires a verified Firebase session; guest devices
          // must not send an unauthenticated request that will always be rejected.
          await syncCustomerFcmToken(activePushToken);
        }))) return;

        if (!await attach(PushNotifications.addListener('pushNotificationReceived', (notification) => {
          if (!active) return;
          // Do not log potentially private notification payloads.
          window.dispatchEvent(new CustomEvent('wawasan:push_received', { detail: notification }));
        }))) return;

        if (!await attach(PushNotifications.addListener('registrationError', (error) => {
          if (!active) return;
          console.error('Push notification registration failed:', error.error);
        }))) return;

        if (!await attach(PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          if (!active) return;
          // Route through the existing deep-link owner, without logging payloads.
          const data = action.notification.data;
          window.dispatchEvent(new CustomEvent('wawasan:push_action', { detail: data }));
        }))) return;

        await PushNotifications.register();
      } catch (err) {
        active = false;
        removeOwnedListeners();
        console.error('Error setting up push notifications:', err);
      }
    };

    setupPush();

    return () => {
      active = false;
      tokenRef.current = null;
      removeOwnedListeners();
    };
  }, [notificationsEnabled]);

  // Listen to Auth State Changes to map token when user logs in reactively
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !notificationsEnabled) return;

    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (active && user && tokenRef.current) {
        // A user may sign in after the native registration callback already ran.
        await syncCustomerFcmToken(tokenRef.current);
      }
    });

    // Firebase auth can finish before the app saves its server-verified admin
    // session. authService emits this event once saveAdminToken finishes.
    const onAdminSessionChange = () => {
      if (tokenRef.current) void subscribeAdminToPushTopic(tokenRef.current);
    };
    window.addEventListener('admin:login-state-change', onAdminSessionChange);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('admin:login-state-change', onAdminSessionChange);
    };
  }, [notificationsEnabled]);
}
