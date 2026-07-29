/**
 * Convert numbers to words in Bahasa Melayu (Malay Language)
 * Handles Ringgit Malaysia currency format
 * Example: 1250.50 -> "Seribu Dua Ratus Lima Puluh Ringgit dan Lima Puluh Sen Sahaja"
 */

export const getBMWordsAmount = (num: number): string => {
  if (num === 0) return "Kosong";
  const units = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Lapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
    'Enam Belas', 'Tujuh Belas', 'Lapan Belas', 'Sembilan Belas'
  ];
  const tens = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh', 'Enam Puluh', 'Tujuh Puluh', 'Lapan Puluh', 'Sembilan Puluh'];
  const scales = ['', 'Ribu', 'Juta', 'Bilion', 'Trilion'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      return tens[ten] + (unit !== 0 ? ' ' + units[unit] : '');
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let result = (hundred === 1) ? 'Seratus' : units[hundred] + ' Ratus';
    if (remainder > 0) result += ' ' + convertLessThanThousand(remainder);
    return result;
  };

  const convertWhole = (n: number): string => {
    if (n === 0) return 'Kosong';
    let result = '';
    let scaleIndex = 0;
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        const chunkWords = convertLessThanThousand(chunk);
        if (scaleIndex === 0) result = chunkWords;
        else if (scaleIndex === 1) result = (chunk === 1 ? 'Seribu' : chunkWords + ' Ribu') + (result ? ' ' + result : '');
        else result = chunkWords + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }
    return result;
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let res = convertWhole(intPart);
  if (decPart > 0) {
    res += ' dan ' + convertWhole(decPart) + ' Sen';
  }
  return res;
};

export const getENWordsAmount = (num: number): string => {
  if (num === 0) return "Zero";
  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      return tens[ten] + (unit !== 0 ? '-' + units[unit] : '');
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let result = units[hundred] + ' Hundred';
    if (remainder > 0) result += ' ' + convertLessThanThousand(remainder);
    return result;
  };

  const convertWhole = (n: number): string => {
    if (n === 0) return 'Zero';
    let result = '';
    let scaleIndex = 0;
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        const chunkWords = convertLessThanThousand(chunk);
        if (scaleIndex === 0) result = chunkWords;
        else result = chunkWords + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }
    return result;
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let res = convertWhole(intPart);
  if (decPart > 0) {
    res += ' and ' + convertWhole(decPart) + ' Sen';
  }
  return res;
};

export const getBilingualWordsInTotal = (num: number): { bm: string; en: string } => {
  const bmWords = getBMWordsAmount(num);
  const enWords = getENWordsAmount(num);
  return {
    bm: `Ringgit Malaysia: ${bmWords} sahaja.`,
    en: `Ringgit Malaysia: ${enWords} only.`,
  };
};

export const numberToWordsBM = (num: number): string => {
  return `Ringgit Malaysia: ${getBMWordsAmount(num)} sahaja.`;
};

export const numberToWordsEN = (num: number): string => {
  return `Ringgit Malaysia: ${getENWordsAmount(num)} only.`;
};

export const numberToWords = (num: number, lang: 'en' | 'bm' = 'bm'): string => {
  return lang === 'en' ? numberToWordsEN(num) : numberToWordsBM(num);
};
