/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setSecureItem, getSecureItem, removeSecureItem } from '@/lib/preferences';
import { setKeepAwake } from '@/lib/nativeService';

export type FontSizeOption = 'sm' | 'base' | 'lg' | 'xl';
export type StyleProfile = 'DEFAULT' | 'NEO_BRUTALIST' | 'NEON_NIGHT' | 'DARK_EMBER' | 'RETRO_SUNSET' | 'BAUHAUS_POP';

/** Maps each non-default style profile to the CSS class applied on <html>. */
const STYLE_PROFILE_CLASSES: Record<Exclude<StyleProfile, 'DEFAULT'>, string> = {
  NEO_BRUTALIST: 'profile-neo-brutalist',
  NEON_NIGHT: 'profile-neon-night',
  DARK_EMBER: 'profile-dark-ember',
  RETRO_SUNSET: 'profile-retro-sunset',
  BAUHAUS_POP: 'profile-bauhaus-pop',
};

const ALL_PROFILE_CLASSES = Object.values(STYLE_PROFILE_CLASSES);

export const DEFAULT_MAIN_COLOR = '#e03f14'; // Wawasan Tomato Burst
export const DEFAULT_FONT_SIZE_PX = 16;       // 16px
export const DEFAULT_CARD_SCALE = 1.0;        // 100% scale

interface SettingsContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  developerMode: boolean;
  setDeveloperMode: (enabled: boolean) => void;
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  keepAwakeEnabled: boolean;
  setKeepAwakeEnabled: (enabled: boolean) => void;

  // Admin Customize UI
  isAdmin: boolean;
  checkAdminStatus: () => Promise<boolean>;
  customMainColor: string;
  setCustomMainColor: (color: string) => void;
  customFontSizePx: number; // 12px to 22px
  setCustomFontSizePx: (size: number) => void;
  customCardSizeScale: number; // 0.8 to 1.3 (80% to 130%)
  setCustomCardSizeScale: (scale: number) => void;
  currentStyleProfile: StyleProfile;
  setCurrentStyleProfile: (profile: StyleProfile) => void;
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
  
  const [currentStyleProfile, setCurrentStyleProfileState] = useState<StyleProfile>(() => {
    try {
      return (localStorage.getItem('app_style_profile') as StyleProfile) || 'DEFAULT';
    } catch { return 'DEFAULT'; }
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

        const savedStyleProfile = await getSecureItem('app_style_profile');
        if (savedStyleProfile) {
          if (savedStyleProfile === 'DEFAULT' || savedStyleProfile in STYLE_PROFILE_CLASSES) {
            setCurrentStyleProfileState(savedStyleProfile as StyleProfile);
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
    window.addEventListener('admin:session-changed', handleSessionEvent);

    return () => {
      window.removeEventListener('storage', handleSessionEvent);
      window.removeEventListener('admin:session-changed', handleSessionEvent);
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

  // Apply style profile classes to documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...ALL_PROFILE_CLASSES);
    if (currentStyleProfile !== 'DEFAULT') {
      root.classList.add(STYLE_PROFILE_CLASSES[currentStyleProfile]);
    }
    if (isLoaded) {
      setSecureItem('app_style_profile', currentStyleProfile);
    }
  }, [currentStyleProfile, isLoaded]);

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

  const setCurrentStyleProfile = (profile: StyleProfile) => {
    setCurrentStyleProfileState(profile);
  };

  // Reset to Default button logic
  const resetUiToDefault = async () => {
    setCustomMainColorState(DEFAULT_MAIN_COLOR);
    setCustomFontSizePxState(DEFAULT_FONT_SIZE_PX);
    setCustomCardSizeScaleState(DEFAULT_CARD_SCALE);
    setCurrentStyleProfileState('DEFAULT');
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
    root.classList.remove(...ALL_PROFILE_CLASSES);

    await removeSecureItem('app_custom_main_color');
    await removeSecureItem('app_custom_font_size_px');
    await removeSecureItem('app_custom_card_scale');
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
        isAdmin,
        checkAdminStatus,
        customMainColor,
        setCustomMainColor,
        customFontSizePx,
        setCustomFontSizePx,
        customCardSizeScale,
        setCustomCardSizeScale,
        currentStyleProfile,
        setCurrentStyleProfile,
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
