import { useState, useEffect, useCallback } from 'react';
import {
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
  getInstalledAppInfo,
  fetchLatestAppVersion,
  subscribeToAppUpdates,
  isUpdateRequired,
  type AppVersionConfig
} from '@/services/updateService';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

const DISMISSED_VERSION_KEY = 'wawasan_dismissed_update_version';

export function useInAppUpdates() {
  const [currentVersion, setCurrentVersion] = useState(CURRENT_APP_VERSION);
  const [currentBuild, setCurrentBuild] = useState(CURRENT_BUILD_NUMBER);
  const [latestConfig, setLatestConfig] = useState<AppVersionConfig | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Initialize native app info on mount
  useEffect(() => {
    let isMounted = true;
    getInstalledAppInfo().then((info) => {
      if (isMounted) {
        setCurrentVersion(info.version);
        setCurrentBuild(info.buildNumber);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const evaluateVersion = useCallback(async (config: AppVersionConfig, isAutoCheck = true) => {
    setLatestConfig(config);
    const localInfo = await getInstalledAppInfo();
    setCurrentVersion(localInfo.version);
    setCurrentBuild(localInfo.buildNumber);

    const { hasUpdate, isForce } = isUpdateRequired(config, localInfo.version, localInfo.buildNumber);
    setIsForceUpdate(isForce);

    // If user is already on the latest or newer release version, NEVER show popup or banner
    if (!hasUpdate) {
      setUpdateAvailable(false);
      setShowNotificationBanner(false);
      setIsForceUpdate(false);
      return;
    }

    // Check if user previously dismissed this exact non-mandatory version
    const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
    if (!isForce && dismissed === config.latestVersion) {
      setIsDismissed(true);
      setUpdateAvailable(false);
      setShowNotificationBanner(false);
      return;
    }

    // Check network type on mobile app background check (WiFi only recommendation)
    if (isAutoCheck && Capacitor.isNativePlatform()) {
      try {
        const netStatus = await Network.getStatus();
        // If on cellular data and update is non-critical, show silent banner instead of modal
        if (netStatus.connectionType === 'cellular' && !isForce) {
          console.log('[UpdateCheck] Cellular network detected. Showing subtle update notification banner.');
          setShowNotificationBanner(true);
          setUpdateAvailable(false);
          setIsDismissed(false);
          return;
        }
      } catch (err) {
        console.warn('[UpdateCheck] Could not verify network status:', err);
      }
    }

    setIsDismissed(false);
    if (isForce) {
      // Force/mandatory updates display the modal directly
      setUpdateAvailable(true);
      setShowNotificationBanner(false);
    } else {
      // Controlled OTA: show subtle banner first, let user decide when to open install modal
      setShowNotificationBanner(true);
      setUpdateAvailable(false);
    }
  }, []);

  // 2. Manual check trigger
  const checkNow = useCallback(async (): Promise<{ hasUpdate: boolean; config: AppVersionConfig }> => {
    setChecking(true);
    try {
      const config = await fetchLatestAppVersion();
      const localInfo = await getInstalledAppInfo();
      setCurrentVersion(localInfo.version);
      setCurrentBuild(localInfo.buildNumber);

      const { hasUpdate, isForce } = isUpdateRequired(config, localInfo.version, localInfo.buildNumber);
      setIsForceUpdate(isForce);

      if (hasUpdate) {
        setUpdateAvailable(true);
        setShowNotificationBanner(false);
        setIsDismissed(false);
      } else {
        setUpdateAvailable(false);
        setShowNotificationBanner(false);
        setIsDismissed(false);
      }
      return { hasUpdate, config };
    } finally {
      setChecking(false);
    }
  }, []);

  // 1. Setup real-time listener & manual event trigger
  useEffect(() => {
    const unsubscribe = subscribeToAppUpdates((config) => {
      evaluateVersion(config, true);
    });

    const handleManualTrigger = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const callback = customEvent.detail?.onResult;
      try {
        const result = await checkNow();
        if (callback) {
          callback(result);
        }
      } catch (err) {
        if (callback) {
          callback({ hasUpdate: false, error: err });
        }
      }
    };

    window.addEventListener('app:check-updates-manually', handleManualTrigger);

    return () => {
      unsubscribe();
      window.removeEventListener('app:check-updates-manually', handleManualTrigger);
    };
  }, [evaluateVersion, checkNow]);

  const dismissUpdate = useCallback(() => {
    if (latestConfig && !isForceUpdate) {
      localStorage.setItem(DISMISSED_VERSION_KEY, latestConfig.latestVersion);
      setIsDismissed(true);
      setUpdateAvailable(false);
      setShowNotificationBanner(false);
    }
  }, [latestConfig, isForceUpdate]);

  const dismissNotificationBanner = useCallback(() => {
    setShowNotificationBanner(false);
  }, []);

  const showUpdateModalManually = useCallback(() => {
    if (latestConfig) {
      setUpdateAvailable(true);
      setShowNotificationBanner(false);
      setIsDismissed(false);
    }
  }, [latestConfig]);

  return {
    currentVersion,
    currentBuild,
    latestConfig,
    updateAvailable,
    showNotificationBanner,
    isForceUpdate,
    checking,
    isDismissed,
    isNative: Capacitor.isNativePlatform(),
    checkNow,
    dismissUpdate,
    dismissNotificationBanner,
    showUpdateModalManually,
  };
}
