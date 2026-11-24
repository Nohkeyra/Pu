import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

const WELCOME_KEY = 'wawasan_native_welcome_completed_v1';
const COMPLETED = 'true';

type WelcomeStage = 'checking' | 'welcome' | 'complete';

function readWelcomeFallback(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === COMPLETED;
  } catch {
    return false;
  }
}

function writeWelcomeFallback() {
  try {
    localStorage.setItem(WELCOME_KEY, COMPLETED);
  } catch (error) {
    console.warn('Could not mirror native welcome completion:', error);
  }
}

export function useNativeWelcome(enabled: boolean) {
  const [stage, setStage] = useState<WelcomeStage>(() =>
    enabled && readWelcomeFallback() ? 'complete' : 'checking'
  );

  useEffect(() => {
    if (!enabled || stage !== 'checking') return;

    let active = true;
    const resolveWelcome = (completed: boolean) => {
      if (!active) return;
      active = false;
      clearTimeout(timeout);
      if (completed) writeWelcomeFallback();
      setStage(completed ? 'complete' : 'welcome');
    };
    const timeout = setTimeout(() => resolveWelcome(false), 1000);

    void Preferences.get({ key: WELCOME_KEY }).then(
      ({ value }) => resolveWelcome(value === COMPLETED),
      (error) => {
        if (!active) return;
        console.warn('Could not read native welcome preference:', error);
        resolveWelcome(false);
      }
    );

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [enabled, stage]);

  const completeWelcome = () => {
    // A synchronous mirror covers a slow or unavailable native bridge.
    writeWelcomeFallback();
    void Preferences.set({ key: WELCOME_KEY, value: COMPLETED }).catch((error) => {
      console.warn('Could not save native welcome completion:', error);
    });
    setStage('complete');
  };

  return { stage, completeWelcome };
}
