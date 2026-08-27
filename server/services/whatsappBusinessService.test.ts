import { describe, it, expect, beforeEach } from 'vitest';
import { WhatsAppBusinessService } from './whatsappBusinessService';

describe('WhatsAppBusinessService', () => {
  let service: WhatsAppBusinessService;

  beforeEach(() => {
    service = new WhatsAppBusinessService({
      defaultAdminPhone: '60173157731'
    });
  });

  describe('normalizePhoneNumber', () => {
    it('normalizes local Malaysian phone format with 0 prefix', () => {
      expect(service.normalizePhoneNumber('017-3157731')).toBe('60173157731');
      expect(service.normalizePhoneNumber('012 345 6789')).toBe('60123456789');
    });

    it('handles already-prefixed numbers', () => {
      expect(service.normalizePhoneNumber('+60 17-315 7731')).toBe('60173157731');
      expect(service.normalizePhoneNumber('60173157731')).toBe('60173157731');
    });

    it('falls back to default admin number if empty', () => {
      expect(service.normalizePhoneNumber('')).toBe('60173157731');
    });
  });

  describe('generateWhatsAppUrl', () => {
    it('generates a valid wa.me URL with encoded text', () => {
      const url = service.generateWhatsAppUrl('017-3157731', 'Hello Pak Usop');
      expect(url).toBe('https://wa.me/60173157731?text=Hello%20Pak%20Usop');
    });
  });

  describe('formatInvoiceMessage', () => {
    it('includes Bank Muamalat payment details and invoice number in BM', () => {
      const msg = service.formatInvoiceMessage({
        customerName: 'Ahmad Faiz',
        invoiceNo: 'RW-2026-001',
        eventDate: '2026-09-15',
        pax: 100,
        totalAmount: 1500,
        recipientPhone: '0123456789',
        lang: 'bm'
      });

      expect(msg).toContain('Ahmad Faiz');
      expect(msg).toContain('RW-2026-001');
      expect(msg).toContain('Bank Muamalat');
      expect(msg).toContain('16010000-405710');
      expect(msg).toContain('RM 1500.00');
      expect(msg).toContain('017-3157731');
    });

    it('formats invoice message in English when lang is en', () => {
      const msg = service.formatInvoiceMessage({
        customerName: 'Sarah Jenkins',
        invoiceNo: 'RW-2026-002',
        eventDate: '2026-10-01',
        pax: 50,
        totalAmount: 850,
        recipientPhone: '0123456789',
        lang: 'en'
      });

      expect(msg).toContain('Hello *Sarah Jenkins*');
      expect(msg).toContain('Invoice No:* RW-2026-002');
      expect(msg).toContain('Total Amount:* RM 850.00');
      expect(msg).toContain('Bank Muamalat');
    });
  });

  describe('formatOrderForwardMessage', () => {
    it('formats an order forward summary for restaurant admins', () => {
      const msg = service.formatOrderForwardMessage({
        orderId: 'RW-ORD-999',
        customerName: 'Encik Razak',
        contactNumber: '0198765432',
        eventDate: '2026-09-20',
        eventTime: '12:30 PM',
        pax: 80,
        mealType: 'lunch',
        totalAmount: 1200,
        selectedDishes: [{ name: 'Ayam Masak Merah' }, { name: 'Dalca Sayur' }],
        deliveryAddress: 'Menara PjH Putrajaya'
      });

      expect(msg).toContain('TEMPAHAN KATERING BARU');
      expect(msg).toContain('Encik Razak');
      expect(msg).toContain('0198765432');
      expect(msg).toContain('Ayam Masak Merah');
      expect(msg).toContain('Menara PjH Putrajaya');
      expect(msg).toContain('RM 1200.00');
    });
  });

  describe('sendTextMessage', () => {
    it('returns wa_link_generated with valid WhatsApp URL', () => {
      const result = service.sendTextMessage({
        recipientPhone: '017-3157731',
        text: 'Test message'
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('wa_link_generated');
      expect(result.whatsappUrl).toContain('https://wa.me/60173157731');
    });
  });
});
