import { getAssetUrl } from '@/lib/utils';

export interface BankDetails {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
}

export const getBankDetails = (): BankDetails => {
  const bankName = (import.meta.env?.VITE_BANK_NAME) || 
                   (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.BANK_NAME) || 
                   'BANK MUAMALAT';
                   
  const bankAccountName = (import.meta.env?.VITE_BANK_ACCOUNT_NAME) || 
                          (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.BANK_ACCOUNT_NAME) || 
                          'RESTORAN WAWASAN';
                          
  const bankAccountNumber = (import.meta.env?.VITE_BANK_ACCOUNT_NUMBER) || 
                            (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.BANK_ACCOUNT_NUMBER) || 
                            '16010000-405710';
                            
  return { bankName, bankAccountName, bankAccountNumber };
};

export const PDF_COLORS = {
  primaryGreen: '#1E392A',
  secondaryGreen: '#2D5A40',
  tertiaryGreen: '#4A7C59',
  warmGold: '#C5A059',
  darkGold: '#A68238',
  lightGold: '#DFBE7A',
  darkCharcoal: '#1A1A1A',
  mediumGray: '#4A4A4A',
  lightGray: '#8A8A8A',
  subtleGray: '#D5D5D5',
  borderGray: '#E5E5E5',
  cardBg: '#FAFAF8',
  warmBg: '#F5F5F0',
  white: '#FFFFFF',
  dangerRed: '#B91C1C',
  successGreen: '#15803D',
};

let cachedLogoBase64: string | null = null;
let cachedBatikHeaderBase64: string | null = null;

export const getCachedLogoBase64 = (): string | null => cachedLogoBase64;
export const setCachedLogoBase64 = (val: string | null) => { cachedLogoBase64 = val; };

export const preloadBatikHeaderForPDF = (): Promise<string> => {
  if (cachedBatikHeaderBase64) return Promise.resolve(cachedBatikHeaderBase64);
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve('');
      return;
    }

    const tryLoad = (sources: string[], index: number = 0) => {
      if (index >= sources.length) {
        resolve('');
        return;
      }

      const img = new Image();
      const src = sources[index];

      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1200, 240);
            ctx.drawImage(img, 0, 0, 1200, 240);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(0, 0, 1200, 240);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            cachedBatikHeaderBase64 = dataUrl;
            resolve(dataUrl);
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        }
      };

      img.onerror = () => tryLoad(sources, index + 1);
      img.src = src;
    };

    const sources = [
      getAssetUrl('assets/heritage/batik_pattern_hd.jpg'),
      getAssetUrl('assets/heritage/batik_vector_pattern.png'),
      getAssetUrl('assets/heritage/batik_pattern.jpg'),
      '/assets/heritage/batik_pattern_hd.jpg',
      '/assets/heritage/batik_vector_pattern.png'
    ];

    tryLoad(sources);
  });
};
