// basic preferences wrapper
export const getSecureItem = async (key: string) => {
  return localStorage.getItem(key);
};
export const setSecureItem = async (key: string, value: string) => {
  localStorage.setItem(key, value);
};
export const removeSecureItem = async (key: string) => {
  localStorage.removeItem(key);
};
export const syncPreferencesToLocalStorage = async () => {};
