import { Preferences } from '@capacitor/preferences';

// Secure preferences wrapper using official Capacitor Preferences plugin
export const getSecureItem = async (key: string): Promise<string | null> => {
  const { value } = await Preferences.get({ key });
  return value;
};

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  await Preferences.set({ key, value });
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn('LocalStorage set warning:', err);
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  await Preferences.remove({ key });
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('LocalStorage remove warning:', err);
  }
};

export const syncPreferencesToLocalStorage = async () => {
  try {
    const { value } = await Preferences.get({ key: 'wawasan_admin_token' });
    if (value) {
      localStorage.setItem('wawasan_admin_token', value);
    } else {
      localStorage.removeItem('wawasan_admin_token');
    }
  } catch (err) {
    console.warn('Preferences sync failed:', err);
  }
};
