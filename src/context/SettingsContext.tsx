import React, { createContext, useContext, useState, useEffect } from 'react';
import { setSecureItem } from '@/lib/preferences';

interface SettingsContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  developerMode: boolean;
  setDeveloperMode: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') !== 'false';
  });
  const [developerMode, setDeveloperMode] = useState(() => {
    return localStorage.getItem('developerMode') === 'true';
  });

  useEffect(() => {
    setSecureItem('notificationsEnabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    setSecureItem('developerMode', String(developerMode));
  }, [developerMode]);

  return (
    <SettingsContext.Provider 
      value={{ 
        notificationsEnabled, 
        setNotificationsEnabled, 
        developerMode, 
        setDeveloperMode 
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
