import { Preferences } from '@capacitor/preferences';

// Secure preferences wrapper using official Capacitor Preferences plugin
export const getSecureItem = async (key: string): Promise<string | null> => {
  const { value } = await Preferences.get({ key });
  return value;
};

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  await Preferences.set({ key, value });
};

export const removeSecureItem = async (key: string): Promise<void> => {
  await Preferences.remove({ key });
};

export const syncPreferencesToLocalStorage = async () => {};
