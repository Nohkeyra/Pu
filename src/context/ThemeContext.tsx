/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { setSecureItem, getSecureItem } from '@/lib/preferences';
import { db } from '@/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { getApiUrl } from '@/lib/api';

type Theme = 'light' | 'dark';
export type AccentColor = 'sunshine' | 'kiwi';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  updateAccentInDb: (accent: AccentColor, adminToken?: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('app_theme');
    return stored === 'dark' ? 'dark' : 'light';
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    const stored = localStorage.getItem('app_accent');
    return stored === 'kiwi' ? 'kiwi' : 'sunshine';
  });

  // Load initial theme and accent from Capacitor preferences asynchronously on mount
  // to avoid native WebView race conditions and override any stale/empty localStorage state
  useEffect(() => {
    const loadDurableTheme = async () => {
      try {
        const savedTheme = await getSecureItem('app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        }
        const savedAccent = await getSecureItem('app_accent');
        if (savedAccent === 'kiwi' || savedAccent === 'sunshine') {
          setAccentState(savedAccent);
        }
      } catch (err) {
        console.warn('Failed to load theme/accent from preferences on mount:', err);
      }
    };
    loadDurableTheme();
  }, []);

  useEffect(() => {
    // Sync to localStorage / secure storage
    setSecureItem('app_theme', theme);
    
    // Apply class to document.documentElement
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Sync accent to localStorage / secure storage
    setSecureItem('app_accent', accent);
    
    // Apply class to document.documentElement
    if (accent === 'kiwi') {
      document.documentElement.classList.add('accent-kiwi');
    } else {
      document.documentElement.classList.remove('accent-kiwi');
    }
  }, [accent]);

  // Firestore real-time listener for app branding accent color
  useEffect(() => {
    let unsubscribe = () => {};
    if (!db) {
      console.warn('Could not set up Firestore branding sync: Firestore db is undefined.');
      return;
    }
    try {
      const docRef = doc(db, 'settings', 'branding');
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && (data.accent === 'kiwi' || data.accent === 'sunshine')) {
            setAccentState(data.accent);
          }
        }
      }, (error) => {
        console.warn('Firestore branding listener failed (expected if offline or unauthorized):', error.message);
      });
    } catch (err) {
      console.warn('Could not set up Firestore branding sync:', err);
    }
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
  };

  const updateAccentInDb = async (newAccent: AccentColor, adminToken?: string) => {
    setAccentState(newAccent);
    try {
      const response = await fetch(getApiUrl('/api/admin/branding'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ accent: newAccent }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update branding accent.');
      }
    } catch (err) {
      console.error('Failed to update branding accent in database:', err);
      throw err;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accent, setAccent, updateAccentInDb }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
