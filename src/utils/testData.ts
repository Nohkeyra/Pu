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
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  // Single client, multiple orders across different dates — this is the
  // real-world shape of a consolidated invoice (e.g. Gas District Cooling
  // ordering catering for several separate meetings across a month).
  return [
    {
      id: 'CONS-TEST-1',
      to: 'GAS DISTRICT COOLING (TEST)',
      attn: 'Test Contact',
      name: 'Diagnostic Tool',
      contact: '012-0000001',
      email: 'test@example.com',
      dateTime: daysAgo(10),
      location: 'GDC Plant, Putrajaya',
      quantity: 15,
      meals: ['breakfast'],
      menu: 'Set Box Makanan & Minuman',
      prices: { breakfast: 8.00 },
      totalAmount: 120.00,
      invoiceNo: 'RW-CONS-TEST-1',
      lang: 'en'
    },
    {
      id: 'CONS-TEST-2',
      to: 'GAS DISTRICT COOLING (TEST)',
      attn: 'Test Contact',
      name: 'Diagnostic Tool',
      contact: '012-0000001',
      email: 'test@example.com',
      dateTime: daysAgo(7),
      location: 'GDC Plant, Putrajaya',
      quantity: 20,
      meals: ['hi_tea'],
      menu: 'Set Box Makanan & Minuman',
      prices: { hi_tea: 8.00 },
      totalAmount: 160.00,
      invoiceNo: 'RW-CONS-TEST-2',
      lang: 'en'
    },
    {
      id: 'CONS-TEST-3',
      to: 'GAS DISTRICT COOLING (TEST)',
      attn: 'Test Contact',
      name: 'Diagnostic Tool',
      contact: '012-0000001',
      email: 'test@example.com',
      dateTime: daysAgo(3),
      location: 'GDC Plant, Putrajaya',
      quantity: 25,
      meals: ['breakfast', 'lunch'],
      menu: 'Breakfast: oglio; Lunch: nasi arab',
      prices: { breakfast: 10.00, lunch: 22.00 },
      totalAmount: 800.00,
      invoiceNo: 'RW-CONS-TEST-3',
      lang: 'en'
    }
  ];
};
