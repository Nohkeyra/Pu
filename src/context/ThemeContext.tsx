/* eslint-disable react-refresh/only-export-components */
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { setSecureItem, getSecureItem } from '@/lib/preferences';
import { db } from '@/firebaseConfig';
import { getApiUrl } from '@/lib/api';
import { Sun, Moon, Sparkles } from 'lucide-react';

type Theme = 'light' | 'dark';
export type AccentColor = 'sunshine' | 'kiwi';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  updateAccentInDb: (accent: AccentColor, adminToken?: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('app_theme');
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    try {
      const stored = localStorage.getItem('app_accent');
      return stored === 'kiwi' ? 'kiwi' : 'sunshine';
    } catch {
      return 'sunshine';
    }
  });

  // Theme Transition Backdrop-Filter Overlay state
  const [transitionState, setTransitionState] = useState<{
    active: boolean;
    fadingOut: boolean;
    targetTheme: Theme | null;
  }>({
    active: false,
    fadingOut: false,
    targetTheme: null,
  });

  const transitionTimerRef = useRef<{ fade?: ReturnType<typeof setTimeout>; end?: ReturnType<typeof setTimeout> }>({});

  // Cleanup pending transition timers on unmount
  useEffect(() => {
    const timers = transitionTimerRef.current;
    return () => {
      if (timers.fade) clearTimeout(timers.fade);
      if (timers.end) clearTimeout(timers.end);
    };
  }, []);

  // Load initial theme and accent from Capacitor preferences asynchronously on mount
  // to avoid native WebView race conditions and override any stale/empty localStorage state
  useEffect(() => {
    const loadDurableTheme = async () => {
      try {
        const savedTheme = await getSecureItem('app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        } else {
          setTheme('dark');
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

    // Sync Capacitor Status Bar style on Android / iOS
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('StatusBar')) {
      StatusBar.setStyle({
        style: theme === 'dark' ? Style.Dark : Style.Light,
      }).catch(() => {});
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
    let isMounted = true;
    if (!db) {
      console.warn('Could not set up Firestore branding sync: Firestore db is undefined.');
      return;
    }

    import('firebase/firestore')
      .then(({ doc, onSnapshot }) => {
        if (!isMounted) return;
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
      })
      .catch((err) => {
        console.warn('Could not dynamically load firestore module:', err);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const triggerThemeTransition = (nextTheme: Theme) => {
    // Clear any active transition timers to handle rapid toggles gracefully
    if (transitionTimerRef.current.fade) clearTimeout(transitionTimerRef.current.fade);
    if (transitionTimerRef.current.end) clearTimeout(transitionTimerRef.current.end);

    try {
      document.documentElement.classList.add('theme-transitioning');
    } catch {
      // Ignore if document is not available
    }

    setTransitionState({
      active: true,
      fadingOut: false,
      targetTheme: nextTheme,
    });

    setTheme(nextTheme);

    // Phase 1: Hold heavy blur backdrop overlay over viewport while colors switch, then start fading out
    transitionTimerRef.current.fade = setTimeout(() => {
      setTransitionState((prev) => ({ ...prev, fadingOut: true }));
    }, 280);

    // Phase 2: Complete transition cleanup
    transitionTimerRef.current.end = setTimeout(() => {
      setTransitionState({
        active: false,
        fadingOut: false,
        targetTheme: null,
      });
      try {
        document.documentElement.classList.remove('theme-transitioning');
      } catch {
        // Ignore if document is not available
      }
    }, 550);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    triggerThemeTransition(nextTheme);
  };

  const handleSetTheme = (newTheme: Theme) => {
    if (newTheme === theme) return;
    triggerThemeTransition(newTheme);
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
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: handleSetTheme, accent, setAccent, updateAccentInDb }}>
      {children}

      {/* Deliberate, Creative & Premium Theme Switch Backdrop-Filter Blur Transition Overlay */}
      {transitionState.active && transitionState.targetTheme && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center transition-all duration-300 ease-out gpu-accelerated ${
            transitionState.fadingOut
              ? 'opacity-0 scale-102'
              : 'opacity-100 scale-100'
          }`}
          style={{
            backdropFilter: transitionState.fadingOut
              ? 'blur(0px) saturate(100%)'
              : 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: transitionState.fadingOut
              ? 'blur(0px) saturate(100%)'
              : 'blur(20px) saturate(180%)',
            backgroundColor:
              transitionState.targetTheme === 'dark'
                ? 'rgba(12, 16, 14, 0.48)'
                : 'rgba(255, 253, 249, 0.58)',
          }}
        >
          {/* Ambient Radial Color Bloom */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              transitionState.targetTheme === 'dark'
                ? 'bg-[radial-gradient(circle_at_center,rgba(246,153,19,0.20)_0%,rgba(12,16,14,0.35)_70%)]'
                : 'bg-[radial-gradient(circle_at_center,rgba(233,98,18,0.16)_0%,rgba(255,253,249,0.45)_70%)]'
            }`}
          />

          {/* Central Deliberate Theme Badge */}
          <div
            className={`relative z-10 flex items-center gap-3.5 px-5 py-3 rounded-full shadow-2xl border transition-all duration-300 transform ${
              transitionState.fadingOut
                ? 'scale-95 opacity-0 translate-y-3'
                : 'scale-100 opacity-100 translate-y-0'
            } ${
              transitionState.targetTheme === 'dark'
                ? 'bg-[#1c2622]/95 border-[#f69913]/40 text-[#ede5d8] shadow-[0_0_40px_rgba(246,153,19,0.28)]'
                : 'bg-[#fffdf9]/95 border-[#0c453c]/25 text-[#0c453c] shadow-[0_0_40px_rgba(12,69,60,0.22)]'
            }`}
          >
            <div className="relative w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-400/10">
              {transitionState.targetTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-amber-400 animate-bounce-short" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest font-display">
                {transitionState.targetTheme === 'dark' ? 'Mode Malam' : 'Mode Siang'}
              </span>
              <span className="text-[10px] opacity-80 font-medium tracking-tight">
                {transitionState.targetTheme === 'dark' ? 'Restoran Wawasan • Gelap' : 'Restoran Wawasan • Terang'}
              </span>
            </div>
            <Sparkles
              className={`w-4 h-4 ml-1 ${
                transitionState.targetTheme === 'dark' ? 'text-amber-400' : 'text-amber-500'
              } animate-pulse`}
            />
          </div>
        </div>
      )}
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
