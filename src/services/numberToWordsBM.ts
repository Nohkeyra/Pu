/**
 * Convert numbers to words in Bahasa Melayu (Malay Language)
 * Handles Ringgit Malaysia currency format
 * Example: 1250.50 -> "Seribu Dua Ratus Lima Puluh Ringgit dan Lima Puluh Sen Sahaja"
 */

export const numberToWordsBM = (num: number): string => {
  if (num === 0) return "Kosong Ringgit Malaysia Sahaja";
  
  // Malay number words
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
    // Hundreds
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let result = '';
    
    if (hundred === 1) {
      result = 'Seratus';
    } else {
      result = units[hundred] + ' Ratus';
    }
    
    if (remainder > 0) {
      result += ' ' + convertLessThanThousand(remainder);
    }
    
    return result;
  };

  const convertWholeNumber = (n: number): string => {
    if (n === 0) return 'Kosong';
    
    let result = '';
    let scaleIndex = 0;
    
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        const chunkWords = convertLessThanThousand(chunk);
        if (scaleIndex === 0) {
          result = chunkWords;
        } else if (scaleIndex === 1) {
          // Special case for "Seribu"
          if (chunk === 1) {
            result = 'Seribu' + (result ? ' ' + result : '');
          } else {
            result = chunkWords + ' Ribu' + (result ? ' ' + result : '');
          }
        } else {
          result = chunkWords + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
        }
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }
    
    return result;
  };

  // Split into integer and decimal parts
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  
  // Convert integer part
  let result = convertWholeNumber(intPart) + ' Ringgit Malaysia';
  
  // Convert decimal part (sen)
  if (decPart > 0) {
    result += ' dan ' + convertWholeNumber(decPart) + ' Sen';
  }
  
  return result + ' Sahaja';
};

/**
 * Convert numbers to words in English
 * Example: 1250.50 -> "One Thousand Two Hundred Fifty Ringgit and Fifty Sen Only"
 */
export const numberToWordsEN = (num: number): string => {
  if (num === 0) return "Zero Ringgit Malaysia Only";
  
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
    if (remainder > 0) {
      result += ' ' + convertLessThanThousand(remainder);
    }
    return result;
  };

  const convertWholeNumber = (n: number): string => {
    if (n === 0) return 'Zero';
    
    let result = '';
    let scaleIndex = 0;
    
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        const chunkWords = convertLessThanThousand(chunk);
        if (scaleIndex === 0) {
          result = chunkWords;
        } else {
          result = chunkWords + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
        }
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }
    
    return result;
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  
  let result = convertWholeNumber(intPart) + ' Ringgit Malaysia';
  
  if (decPart > 0) {
    result += ' and ' + convertWholeNumber(decPart) + ' Sen';
  }
  
  return result + ' Only';
};

/**
 * Universal number to words converter based on language
 */
export const numberToWords = (num: number, lang: 'en' | 'bm' = 'bm'): string => {
  return lang === 'en' ? numberToWordsEN(num) : numberToWordsBM(num);
};
