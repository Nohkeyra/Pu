import React, { createContext, useContext, useState, useEffect } from 'react';
import { setSecureItem } from '@/lib/preferences';

export type FontSizeOption = 'sm' | 'base' | 'lg' | 'xl';

interface SettingsContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  developerMode: boolean;
  setDeveloperMode: (enabled: boolean) => void;
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
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
  const [fontSize, setFontSize] = useState<FontSizeOption>(() => {
    try {
      return (localStorage.getItem('fontSize') as FontSizeOption) || 'base';
    } catch {
      return 'base';
    }
  });

  useEffect(() => {
    setSecureItem('notificationsEnabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    setSecureItem('developerMode', String(developerMode));
  }, [developerMode]);

  useEffect(() => {
    setSecureItem('fontSize', fontSize);
    
    // Apply root font size dynamically to scale all rem-based units for eye comfort
    const root = document.documentElement;
    const fontSizeMap: Record<FontSizeOption, string> = {
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px'
    };
    root.style.fontSize = fontSizeMap[fontSize];
  }, [fontSize]);

  return (
    <SettingsContext.Provider 
      value={{ 
        notificationsEnabled, 
        setNotificationsEnabled, 
        developerMode, 
        setDeveloperMode,
        fontSize,
        setFontSize
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
