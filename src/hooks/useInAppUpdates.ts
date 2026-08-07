import { useState, useEffect, useCallback } from 'react';
import {
  CURRENT_APP_VERSION,
  fetchLatestAppVersion,
  subscribeToAppUpdates,
  isUpdateRequired,
  type AppVersionConfig
} from '@/services/updateService';
import { Capacitor } from '@capacitor/core';

const DISMISSED_VERSION_KEY = 'wawasan_dismissed_update_version';

export function useInAppUpdates() {
  const [latestConfig, setLatestConfig] = useState<AppVersionConfig | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const evaluateVersion = useCallback((config: AppVersionConfig) => {
    setLatestConfig(config);
    const { hasUpdate, isForce } = isUpdateRequired(config, CURRENT_APP_VERSION);
    setIsForceUpdate(isForce);

    // Check if user previously dismissed this exact non-mandatory version
    const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
    if (hasUpdate) {
      if (!isForce && dismissed === config.latestVersion) {
        setIsDismissed(true);
        setUpdateAvailable(false);
      } else {
        setIsDismissed(false);
        setUpdateAvailable(true);
      }
    } else {
      setUpdateAvailable(false);
    }
  }, []);

  // 1. Setup real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToAppUpdates((config) => {
      evaluateVersion(config);
    });

    return () => unsubscribe();
  }, [evaluateVersion]);

  // 2. Manual check trigger
  const checkNow = useCallback(async (): Promise<{ hasUpdate: boolean; config: AppVersionConfig }> => {
    setChecking(true);
    try {
      const config = await fetchLatestAppVersion();
      evaluateVersion(config);
      const { hasUpdate } = isUpdateRequired(config, CURRENT_APP_VERSION);
      // Re-enable modal if checked manually even if previously dismissed
      if (hasUpdate) {
        setUpdateAvailable(true);
        setIsDismissed(false);
      }
      return { hasUpdate, config };
    } finally {
      setChecking(false);
    }
  }, [evaluateVersion]);

  const dismissUpdate = useCallback(() => {
    if (latestConfig && !isForceUpdate) {
      localStorage.setItem(DISMISSED_VERSION_KEY, latestConfig.latestVersion);
      setIsDismissed(true);
      setUpdateAvailable(false);
    }
  }, [latestConfig, isForceUpdate]);

  const showUpdateModalManually = useCallback(() => {
    if (latestConfig) {
      setUpdateAvailable(true);
      setIsDismissed(false);
    }
  }, [latestConfig]);

  return {
    currentVersion: CURRENT_APP_VERSION,
    latestConfig,
    updateAvailable,
    isForceUpdate,
    checking,
    isDismissed,
    isNative: Capacitor.isNativePlatform(),
    checkNow,
    dismissUpdate,
    showUpdateModalManually,
  };
}
