export interface HolidayInfo {
  nameEn: string;
  nameBm: string;
  type: 'national' | 'festive' | 'peak';
  noticeBm?: string;
  noticeEn?: string;
}

export const MALAYSIA_HOLIDAYS: Record<string, HolidayInfo> = {
  // 2026 Major Malaysian Public Holidays & Peak Days
  '2026-01-01': { nameEn: "New Year's Day", nameBm: 'Tahun Baharu 2026', type: 'national' },
  '2026-02-01': { nameEn: 'Federal Territory Day', nameBm: 'Hari Wilayah Persekutuan (KL, Putrajaya)', type: 'national' },
  '2026-02-17': { nameEn: 'Chinese New Year (Day 1)', nameBm: 'Tahun Baru Cina (Hari Pertama)', type: 'festive', noticeBm: 'Musim perayaan puncak: Tempahan catering tinggi.', noticeEn: 'Peak festive season: High catering demand.' },
  '2026-02-18': { nameEn: 'Chinese New Year (Day 2)', nameBm: 'Tahun Baru Cina (Hari Kedua)', type: 'festive' },
  '2026-03-20': { nameEn: 'Hari Raya Aidilfitri (Day 1)', nameBm: 'Hari Raya Aidilfitri (Hari 1)', type: 'festive', noticeBm: 'Musim Perayaan Puncak: Sila pastikan tempahan disahkan awal.', noticeEn: 'Peak Festive Season: Please confirm early.' },
  '2026-03-21': { nameEn: 'Hari Raya Aidilfitri (Day 2)', nameBm: 'Hari Raya Aidilfitri (Hari 2)', type: 'festive' },
  '2026-05-01': { nameEn: 'Labour Day', nameBm: 'Hari Pekerja', type: 'national' },
  '2026-05-27': { nameEn: 'Hari Raya Haji / Aidiladha', nameBm: 'Hari Raya Aidiladha', type: 'festive', noticeBm: 'Musim Korban & Majlis Katering Puncak', noticeEn: 'Peak Qurban & Catering Season' },
  '2026-05-31': { nameEn: 'Wesak Day', nameBm: 'Hari Wesak', type: 'national' },
  '2026-06-01': { nameEn: "Agong's Birthday", nameBm: 'Hari Keputeraan YDP Agong', type: 'national' },
  '2026-06-16': { nameEn: 'Awal Muharram', nameBm: 'Awal Muharram (1 Muharram)', type: 'national' },
  '2026-08-25': { nameEn: 'Maulidur Rasul', nameBm: 'Maulidur Rasul', type: 'national' },
  '2026-08-31': { nameEn: 'National Day (Merdeka)', nameBm: 'Hari Kebangsaan (Merdeka)', type: 'national', noticeBm: 'Hari Kebangsaan - Majlis Katering Jabatan & Puncak', noticeEn: 'National Day - High catering demand' },
  '2026-09-16': { nameEn: 'Malaysia Day', nameBm: 'Hari Malaysia', type: 'national' },
  '2026-11-08': { nameEn: 'Deepavali', nameBm: 'Hari Deepavali', type: 'festive' },
  '2026-12-25': { nameEn: 'Christmas Day', nameBm: 'Hari Krismas', type: 'national' },

  // 2027 Major Holidays
  '2027-01-01': { nameEn: "New Year's Day", nameBm: 'Tahun Baharu 2027', type: 'national' },
  '2027-02-01': { nameEn: 'Federal Territory Day', nameBm: 'Hari Wilayah Persekutuan', type: 'national' },
  '2027-02-06': { nameEn: 'Chinese New Year (Day 1)', nameBm: 'Tahun Baru Cina (Hari 1)', type: 'festive' },
  '2027-02-07': { nameEn: 'Chinese New Year (Day 2)', nameBm: 'Tahun Baru Cina (Hari 2)', type: 'festive' },
  '2027-03-10': { nameEn: 'Hari Raya Aidilfitri (Day 1)', nameBm: 'Hari Raya Aidilfitri (Hari 1)', type: 'festive' },
  '2027-03-11': { nameEn: 'Hari Raya Aidilfitri (Day 2)', nameBm: 'Hari Raya Aidilfitri (Hari 2)', type: 'festive' },
  '2027-05-01': { nameEn: 'Labour Day', nameBm: 'Hari Pekerja', type: 'national' },
  '2027-05-17': { nameEn: 'Hari Raya Haji / Aidiladha', nameBm: 'Hari Raya Aidiladha', type: 'festive' },
  '2027-08-31': { nameEn: 'National Day (Merdeka)', nameBm: 'Hari Kebangsaan (Merdeka)', type: 'national' },
  '2027-09-16': { nameEn: 'Malaysia Day', nameBm: 'Hari Malaysia', type: 'national' },
  '2027-12-25': { nameEn: 'Christmas Day', nameBm: 'Hari Krismas', type: 'national' },
};

/**
 * Checks if a given date string (YYYY-MM-DD) is a Malaysian Public Holiday.
 */
export function getMalaysiaHolidayInfo(dateStr: string): HolidayInfo | null {
  if (!dateStr) return null;
  return MALAYSIA_HOLIDAYS[dateStr] || null;
}

/**
 * Minimum lead notice time for catering orders (default: 2 days ahead).
 */
export function getMinCateringBookingDate(noticeDays = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + noticeDays);
  return d.toISOString().split('T')[0];
}
