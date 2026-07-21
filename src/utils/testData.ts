import type { Order } from '@/types';

export const getDummyCombinedOrders = (): Order[] => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return [
    {
      id: 'TEST-A',
      to: 'DUMMY CORP (TESTING)',
      attn: 'Mr. Tester',
      name: 'Diagnostic Tool',
      contact: '012-3456789',
      email: 'test@example.com',
      dateTime: now.toISOString(),
      location: 'Menara PjH, Putrajaya',
      quantity: 50,
      meals: ['lunch'],
      menu: 'Nasi Lemak Ayam Berempah, Teh Tarik, Buah-buahan',
      prices: { lunch: 12.50 },
      totalAmount: 625.00,
      invoiceNo: 'RW-TEST-A',
      lang: 'bm'
    },
    {
      id: 'TEST-B',
      to: 'DUMMY CORP (TESTING)',
      attn: 'Mr. Tester',
      name: 'Diagnostic Tool',
      contact: '012-3456789',
      email: 'test@example.com',
      dateTime: tomorrow.toISOString(),
      location: 'Menara PjH, Putrajaya',
      quantity: 50,
      meals: ['tea_break'],
      menu: 'Karipap, Kuih Lapis, Kopi O',
      prices: { tea_break: 5.00 },
      totalAmount: 250.00,
      invoiceNo: 'RW-TEST-B',
      lang: 'bm'
    }
  ];
};

export const getDummyConsolidatedOrders = (): Order[] => {
  const now = new Date();
  
  return [
    {
      id: 'CLIENT-A-1',
      to: 'PETRONAS HOLDINGS (TEST)',
      name: 'Client A Test',
      contact: '012-0000001',
      email: 'a@example.com',
      dateTime: now.toISOString(),
      location: 'KLCC Tower 1',
      quantity: 200,
      meals: ['lunch'],
      menu: 'Corporate Buffet Set A',
      prices: { lunch: 35.00 },
      totalAmount: 7000.00,
      invoiceNo: 'RW-CONS-01',
      lang: 'en'
    },
    {
      id: 'CLIENT-B-1',
      to: 'SHELL MALAYSIA (TEST)',
      name: 'Client B Test',
      contact: '012-0000002',
      email: 'b@example.com',
      dateTime: now.toISOString(),
      location: 'Shell House Cyberjaya',
      quantity: 150,
      meals: ['lunch'],
      menu: 'Corporate Buffet Set B',
      prices: { lunch: 28.00 },
      totalAmount: 4200.00,
      invoiceNo: 'RW-CONS-02',
      lang: 'en'
    }
  ];
};
