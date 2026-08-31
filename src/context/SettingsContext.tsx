/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setSecureItem, getSecureItem, removeSecureItem } from '@/lib/preferences';
import { setKeepAwake } from '@/lib/nativeService';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export type FontSizeOption = 'sm' | 'base' | 'lg' | 'xl';

export const DEFAULT_MAIN_COLOR = '#a3310e'; // Wawasan High Contrast Terracotta (#a3310e > 7.2:1 contrast ratio)
export const DEFAULT_FONT_SIZE_PX = 16;       // 16px
export const DEFAULT_CARD_SCALE = 1.0;        // 100% scale
export const DEFAULT_BATIK_COLOR = '#E6C387';  // Kunyit Gold
export const DEFAULT_BATIK_DENSITY = 4;        // 4x4 Grid

interface SettingsContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  developerMode: boolean;
  setDeveloperMode: (enabled: boolean) => void;
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  keepAwakeEnabled: boolean;
  setKeepAwakeEnabled: (enabled: boolean) => void;
  statusBarHidden: boolean;
  setStatusBarHidden: (hidden: boolean) => void;
  statusBarColor: string;
  setStatusBarColor: (color: string) => void;

  // Haptics & Audio Settings
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  soundEffectsEnabled: boolean;
  setSoundEffectsEnabled: (enabled: boolean) => void;

  // Admin & Hardware Diagnostics UI
  isAdmin: boolean;
  checkAdminStatus: () => Promise<boolean>;
  customMainColor: string;
  setCustomMainColor: (color: string) => void;
  customFontSizePx: number; // 12px to 22px
  setCustomFontSizePx: (size: number) => void;
  customCardSizeScale: number; // 0.8 to 1.3 (80% to 130%)
  setCustomCardSizeScale: (scale: number) => void;
  customBatikColor: string;
  setCustomBatikColor: (color: string) => void;
  batikDensity: number;
  setBatikDensity: (density: number) => void;
  resetUiToDefault: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      return localStorage.getItem('notificationsEnabled') !== 'false';
    } catch {
      return true;
    }
  });

  const [developerMode, setDeveloperMode] = useState(() => {
    try {
      return localStorage.getItem('developerMode') === 'true';
    } catch {
      return false;
    }
  });

  const [fontSize, setFontSizeState] = useState<FontSizeOption>(() => {
    try {
      return (localStorage.getItem('fontSize') as FontSizeOption) || 'base';
    } catch {
      return 'base';
    }
  });

  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(() => {
    try {
      return localStorage.getItem('keepAwakeEnabled') === 'true';
    } catch {
      return false;
    }
  });

  const [statusBarHidden, setStatusBarHidden] = useState(() => {
    try {
      return localStorage.getItem('statusBarHidden') === 'true';
    } catch {
      return false;
    }
  });

  const [statusBarColor, setStatusBarColor] = useState(() => {
    try {
      return localStorage.getItem('statusBarColor') || '#a3310e';
    } catch {
      return '#a3310e';
    }
  });

  // Haptic Feedback & Sound FX
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('wawasan_haptics_enabled');
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  });

  const [soundEffectsEnabled, setSoundEffectsEnabledState] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('wawasan_sound_effects_enabled');
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  });

  const setHapticsEnabled = (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    try {
      localStorage.setItem('wawasan_haptics_enabled', String(enabled));
    } catch {
      // ignore
    }
  };

  const setSoundEffectsEnabled = (enabled: boolean) => {
    setSoundEffectsEnabledState(enabled);
    try {
      localStorage.setItem('wawasan_sound_effects_enabled', String(enabled));
    } catch {
      // ignore
    }
  };

  // Admin Status State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('wawasan_admin_token'));
    } catch {
      return false;
    }
  });

  // Admin Customize UI States
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  
  const [customMainColor, setCustomMainColorState] = useState<string>(() => {
    try { return localStorage.getItem('app_custom_main_color') || DEFAULT_MAIN_COLOR; }
    catch { return DEFAULT_MAIN_COLOR; }
  });
  
  const [customFontSizePx, setCustomFontSizePxState] = useState<number>(() => {
    try {
      const val = localStorage.getItem('app_custom_font_size_px');
      return val ? parseFloat(val) : DEFAULT_FONT_SIZE_PX;
    } catch { return DEFAULT_FONT_SIZE_PX; }
  });
  
  const [customCardSizeScale, setCustomCardSizeScaleState] = useState<number>(() => {
    try {
      const val = localStorage.getItem('app_custom_card_scale');
      return val ? parseFloat(val) : DEFAULT_CARD_SCALE;
    } catch { return DEFAULT_CARD_SCALE; }
  });

  const [customBatikColor, setCustomBatikColorState] = useState<string>(() => {
    try { return localStorage.getItem('app_custom_batik_color') || DEFAULT_BATIK_COLOR; }
    catch { return DEFAULT_BATIK_COLOR; }
  });

  const [batikDensity, setBatikDensityState] = useState<number>(() => {
    try {
      const val = localStorage.getItem('app_custom_batik_density');
      return val ? parseInt(val, 10) : DEFAULT_BATIK_DENSITY;
    } catch { return DEFAULT_BATIK_DENSITY; }
  });

  // Check if admin session token exists in Capacitor Preferences / SharedPreferences
  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    try {
      const token = await getSecureItem('wawasan_admin_token');
      const active = Boolean(token && token.trim().length > 0);
      setIsAdmin(active);
      return active;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, []);

  // Initial load from SharedPreferences / Preferences plugin
  useEffect(() => {
    const loadDurablePreferences = async () => {
      // Verify admin status
      await checkAdminStatus();

      // Load custom UI settings from Preferences (SharedPreferences wrapper)
      try {
        const savedColor = await getSecureItem('app_custom_main_color');
        if (savedColor && savedColor.startsWith('#')) {
          setCustomMainColorState(savedColor);
        }

        const savedFontSize = await getSecureItem('app_custom_font_size_px');
        if (savedFontSize) {
          const parsed = parseFloat(savedFontSize);
          if (!isNaN(parsed) && parsed >= 10 && parsed <= 26) {
            setCustomFontSizePxState(parsed);
          }
        }

        const savedCardScale = await getSecureItem('app_custom_card_scale');
        if (savedCardScale) {
          const parsed = parseFloat(savedCardScale);
          if (!isNaN(parsed) && parsed >= 0.7 && parsed <= 1.5) {
            setCustomCardSizeScaleState(parsed);
          }
        }

        const savedBatikColor = await getSecureItem('app_custom_batik_color');
        if (savedBatikColor && savedBatikColor.startsWith('#')) {
          setCustomBatikColorState(savedBatikColor);
        }

        const savedBatikDensity = await getSecureItem('app_custom_batik_density');
        if (savedBatikDensity) {
          const parsed = parseInt(savedBatikDensity, 10);
          if (!isNaN(parsed) && parsed >= 2 && parsed <= 12) {
            setBatikDensityState(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load custom UI parameters from preferences:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadDurablePreferences();

    // Listen for storage changes and admin session events
    const handleSessionEvent = () => {
      checkAdminStatus();
    };

    window.addEventListener('storage', handleSessionEvent);
    window.addEventListener('admin:login-state-change', handleSessionEvent);

    return () => {
      window.removeEventListener('storage', handleSessionEvent);
      window.removeEventListener('admin:login-state-change', handleSessionEvent);
    };
  }, [checkAdminStatus]);

  // Apply custom main color live across CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (customMainColor) {
      root.style.setProperty('--color-sunshine-cta', customMainColor);
      root.style.setProperty('--color-sunshine-cta-bg', customMainColor);
      root.style.setProperty('--color-sunshine-cta-hover', customMainColor);
      root.style.setProperty('--primary', customMainColor);
      root.style.setProperty('--ring', customMainColor);
      if (isLoaded) {
        setSecureItem('app_custom_main_color', customMainColor);
      }
    }
  }, [customMainColor, isLoaded]);

  // Apply custom font size live across root rem/px scale
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${customFontSizePx}px`;
    root.style.setProperty('--app-font-size', `${customFontSizePx}px`);
    if (isLoaded) {
      setSecureItem('app_custom_font_size_px', String(customFontSizePx));
    }
  }, [customFontSizePx, isLoaded]);

  // Apply custom card scale live across cards & grids
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-card-scale', String(customCardSizeScale));
    root.style.setProperty('--menu-card-scale', String(customCardSizeScale));
    if (isLoaded) {
      setSecureItem('app_custom_card_scale', String(customCardSizeScale));
    }
  }, [customCardSizeScale, isLoaded]);

  // Apply custom Batik accent color live
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--batik-accent-color', customBatikColor);
    if (isLoaded) {
      setSecureItem('app_custom_batik_color', customBatikColor);
    }
  }, [customBatikColor, isLoaded]);

  // Apply custom Batik grid density live
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--batik-density', String(batikDensity));
    if (isLoaded) {
      setSecureItem('app_custom_batik_density', String(batikDensity));
    }
  }, [batikDensity, isLoaded]);

  // Handlers for live updates
  const setCustomMainColor = (color: string) => {
    setCustomMainColorState(color);
  };

  const setCustomFontSizePx = (size: number) => {
    setCustomFontSizePxState(size);
  };

  const setCustomCardSizeScale = (scale: number) => {
    setCustomCardSizeScaleState(scale);
  };

  const setCustomBatikColor = (color: string) => {
    setCustomBatikColorState(color);
  };

  const setBatikDensity = (density: number) => {
    setBatikDensityState(density);
  };

  // Reset to Default button logic
  const resetUiToDefault = async () => {
    setCustomMainColorState(DEFAULT_MAIN_COLOR);
    setCustomFontSizePxState(DEFAULT_FONT_SIZE_PX);
    setCustomCardSizeScaleState(DEFAULT_CARD_SCALE);
    setCustomBatikColorState(DEFAULT_BATIK_COLOR);
    setBatikDensityState(DEFAULT_BATIK_DENSITY);
    setFontSizeState('base');

    const root = document.documentElement;
    root.style.removeProperty('--color-sunshine-cta');
    root.style.removeProperty('--color-sunshine-cta-bg');
    root.style.removeProperty('--color-sunshine-cta-hover');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
    root.style.fontSize = `${DEFAULT_FONT_SIZE_PX}px`;
    root.style.setProperty('--app-card-scale', '1');
    root.style.setProperty('--menu-card-scale', '1');
    root.style.setProperty('--batik-accent-color', DEFAULT_BATIK_COLOR);
    root.style.setProperty('--batik-density', String(DEFAULT_BATIK_DENSITY));

    await removeSecureItem('app_custom_main_color');
    await removeSecureItem('app_custom_font_size_px');
    await removeSecureItem('app_custom_card_scale');
    await removeSecureItem('app_custom_batik_color');
    await removeSecureItem('app_custom_batik_density');
    await removeSecureItem('app_style_profile');
  };

  useEffect(() => {
    setSecureItem('notificationsEnabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    setSecureItem('developerMode', String(developerMode));
  }, [developerMode]);

  useEffect(() => {
    setSecureItem('keepAwakeEnabled', String(keepAwakeEnabled));
    setKeepAwake(keepAwakeEnabled);
  }, [keepAwakeEnabled]);

  useEffect(() => {
    const applyStatusBar = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        if (statusBarHidden) {
          await StatusBar.hide();
        } else {
          await StatusBar.show();
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: statusBarColor });
        }
      } catch (err) {
        console.warn('StatusBar plugin error:', err);
      }
    };
    applyStatusBar();
    if (isLoaded) {
      setSecureItem('statusBarHidden', String(statusBarHidden));
      setSecureItem('statusBarColor', statusBarColor);
    }
  }, [statusBarHidden, statusBarColor, isLoaded]);

  const setFontSize = (size: FontSizeOption) => {
    setFontSizeState(size);
    const fontSizeMap: Record<FontSizeOption, number> = {
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
    };
    setCustomFontSizePxState(fontSizeMap[size]);
  };

  return (
    <SettingsContext.Provider
      value={{
        notificationsEnabled,
        setNotificationsEnabled,
        developerMode,
        setDeveloperMode,
        fontSize,
        setFontSize,
        keepAwakeEnabled,
        setKeepAwakeEnabled,
        statusBarHidden,
        setStatusBarHidden,
        statusBarColor,
        setStatusBarColor,
        hapticsEnabled,
        setHapticsEnabled,
        soundEffectsEnabled,
        setSoundEffectsEnabled,
        isAdmin,
        checkAdminStatus,
        customMainColor,
        setCustomMainColor,
        customFontSizePx,
        setCustomFontSizePx,
        customCardSizeScale,
        setCustomCardSizeScale,
        customBatikColor,
        setCustomBatikColor,
        batikDensity,
        setBatikDensity,
        resetUiToDefault,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
