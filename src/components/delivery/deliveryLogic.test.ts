import { describe, it, expect } from 'vitest';

export function formatDeliveryDistance(meters: number): string {
  if (meters < 0) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function estimateDeliveryEta(meters: number, avgSpeedKmH = 30): number {
  if (meters <= 0) return 0;
  const metersPerMinute = (avgSpeedKmH * 1000) / 60;
  return Math.max(1, Math.ceil(meters / metersPerMinute));
}

export function isWithinArrivalGeofence(distanceMeters: number, thresholdMeters = 200): boolean {
  return distanceMeters >= 0 && distanceMeters <= thresholdMeters;
}

export function generateArrivalWhatsAppMessage(params: {
  customerName: string;
  invoiceNo: string;
  location?: string;
  lang?: 'en' | 'bm';
}): string {
  const { customerName, invoiceNo, location, lang = 'bm' } = params;
  if (lang === 'bm') {
    return `Salam ${customerName}, penghantar katering Restoran Wawasan Pak Usop telah tiba di lokasi ${location ? `(${location}) ` : ''}bersama tempahan #${invoiceNo}. Sila bersedia untuk penerimaan. Terima kasih!`;
  }
  return `Hello ${customerName}, your Restoran Wawasan Pak Usop catering rider has arrived at the location ${location ? `(${location}) ` : ''}with order #${invoiceNo}. Please prepare for receipt. Thank you!`;
}

describe('deliveryLogic', () => {
  describe('formatDeliveryDistance', () => {
    it('formats short distance in meters', () => {
      expect(formatDeliveryDistance(150)).toBe('150 m');
      expect(formatDeliveryDistance(45.6)).toBe('46 m');
      expect(formatDeliveryDistance(999)).toBe('999 m');
    });

    it('formats distance >= 1000m in kilometers with 1 decimal', () => {
      expect(formatDeliveryDistance(1000)).toBe('1.0 km');
      expect(formatDeliveryDistance(2450)).toBe('2.5 km');
      expect(formatDeliveryDistance(12800)).toBe('12.8 km');
    });

    it('handles negative or zero distances gracefully', () => {
      expect(formatDeliveryDistance(0)).toBe('0 m');
      expect(formatDeliveryDistance(-50)).toBe('0 m');
    });
  });

  describe('estimateDeliveryEta', () => {
    it('calculates ETA correctly for given speed', () => {
      // 30 km/h = 500 m/min. 2500m should be 5 mins
      expect(estimateDeliveryEta(2500, 30)).toBe(5);
    });

    it('returns at least 1 minute for small positive distance', () => {
      expect(estimateDeliveryEta(50, 30)).toBe(1);
    });

    it('returns 0 for zero or negative distance', () => {
      expect(estimateDeliveryEta(0)).toBe(0);
      expect(estimateDeliveryEta(-100)).toBe(0);
    });
  });

  describe('isWithinArrivalGeofence', () => {
    it('returns true when rider is within 200m threshold', () => {
      expect(isWithinArrivalGeofence(50)).toBe(true);
      expect(isWithinArrivalGeofence(200)).toBe(true);
      expect(isWithinArrivalGeofence(0)).toBe(true);
    });

    it('returns false when rider is outside threshold', () => {
      expect(isWithinArrivalGeofence(201)).toBe(false);
      expect(isWithinArrivalGeofence(1500)).toBe(false);
    });

    it('returns false for negative values', () => {
      expect(isWithinArrivalGeofence(-10)).toBe(false);
    });
  });

  describe('generateArrivalWhatsAppMessage', () => {
    it('generates BM arrival notification correctly', () => {
      const msg = generateArrivalWhatsAppMessage({
        customerName: 'Encik Razak',
        invoiceNo: 'RW-2026-0042',
        location: 'Blok B Putrajaya',
        lang: 'bm',
      });
      expect(msg).toContain('Salam Encik Razak');
      expect(msg).toContain('#RW-2026-0042');
      expect(msg).toContain('Blok B Putrajaya');
    });

    it('generates EN arrival notification correctly', () => {
      const msg = generateArrivalWhatsAppMessage({
        customerName: 'Ms. Lee',
        invoiceNo: 'RW-2026-0099',
        lang: 'en',
      });
      expect(msg).toContain('Hello Ms. Lee');
      expect(msg).toContain('#RW-2026-0099');
    });
  });
});
