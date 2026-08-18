import { describe, it, expect } from 'vitest';
import { getBMWordsAmount, getENWordsAmount } from './numberToWordsBM';

describe('Number to Words Conversion (BM & EN)', () => {
  it('converts numbers to Bahasa Melayu words correctly', () => {
    expect(getBMWordsAmount(0)).toBe('Kosong');
    expect(getBMWordsAmount(1)).toBe('Satu');
    expect(getBMWordsAmount(10)).toBe('Sepuluh');
    expect(getBMWordsAmount(100)).toBe('Seratus');
    expect(getBMWordsAmount(1250)).toBe('Seribu Dua Ratus Lima Puluh');
    expect(getBMWordsAmount(1250.50)).toBe('Seribu Dua Ratus Lima Puluh dan Lima Puluh Sen');
  });

  it('converts numbers to English words correctly', () => {
    expect(getENWordsAmount(0)).toBe('Zero');
    expect(getENWordsAmount(1)).toBe('One');
    expect(getENWordsAmount(15)).toBe('Fifteen');
    expect(getENWordsAmount(100)).toBe('One Hundred');
    expect(getENWordsAmount(1250)).toBe('One Thousand Two Hundred Fifty');
  });
});
