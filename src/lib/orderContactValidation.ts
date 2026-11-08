/** Single contact-detail validation policy for both Order Step 3 and its sticky mobile action. */
export interface OrderContactFields {
  eventType: 'pejabat' | 'lain' | '';
  companyName: string;
  customCompany: string;
  name: string;
  contact: string;
  email: string;
  confirmEmail: string;
  date: string;
  time: string;
  location: string;
  delivery: 'delivery' | 'pickup' | '';
}

export type OrderContactField =
  | 'companyName' | 'customCompany' | 'name' | 'contact' | 'email'
  | 'confirmEmail' | 'date' | 'time' | 'location' | 'delivery';

export type OrderContactErrors = Partial<Record<OrderContactField, string>>;

export const ORDER_CONTACT_FOCUS_IDS: Partial<Record<OrderContactField, string>> = {
  companyName: 'order-company-select',
  customCompany: 'custom-company-input',
  name: 'contact-name',
  contact: 'contact-phone',
  email: 'contact-email',
  confirmEmail: 'contact-confirm-email',
  date: 'event-date',
  time: 'event-time',
  location: 'contact-location',
};

export function validateOrderContactDetails(
  state: OrderContactFields,
  tText: (en: string, bm: string) => string,
): OrderContactErrors {
  const errors: OrderContactErrors = {};
  if (state.eventType === 'pejabat') {
    if (!state.companyName?.trim()) {
      errors.companyName = tText('Please select or enter a company/department.', 'Sila pilih atau masukkan syarikat/jabatan.');
    } else if (state.companyName === 'other' && !state.customCompany?.trim()) {
      errors.customCompany = tText('Please enter the company/department name.', 'Sila masukkan nama syarikat/jabatan.');
    }
  }
  if (!state.name?.trim()) {
    errors.name = tText('Please enter your full name.', 'Sila masukkan nama penuh anda.');
  }
  if (!state.contact?.trim() || state.contact.replace(/\D/g, '').length < 10) {
    errors.contact = tText('Please enter a valid phone number.', 'Sila masukkan nombor telefon yang sah.');
  }
  const email = state.email?.trim() ?? '';
  if (!email) {
    errors.email = tText('Please enter your email for invoices.', 'Sila masukkan emel untuk invois.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = tText('Please enter a valid email address.', 'Sila masukkan alamat emel yang sah.');
  } else if (email.toLowerCase() !== (state.confirmEmail ?? '').trim().toLowerCase()) {
    errors.confirmEmail = tText('Email confirmation does not match.', 'Pengesahan emel tidak sepadan.');
  }
  if (!state.date) errors.date = tText('Please select the event date.', 'Sila pilih tarikh majlis.');
  if (!state.time) errors.time = tText('Please select the event time.', 'Sila pilih masa majlis.');
  if (!state.location?.trim()) errors.location = tText('Please enter the delivery/pickup location.', 'Sila masukkan lokasi.');
  if (!state.delivery) errors.delivery = tText('Please choose delivery or pickup.', 'Sila pilih hantar atau ambil sendiri.');
  return errors;
}
