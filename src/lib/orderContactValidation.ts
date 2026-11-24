import { getBookingNoticeError } from './dateUtils.js';
import { isRestrictedBookingDay, minimumServingQuantity, MIN_RESTRICTED_DAY_PAX } from './bookingPolicy.js';

/** Single contact-detail validation policy for both Order Step 3 and its sticky mobile action. */
export interface OrderContactFields {
  eventType: 'pejabat' | 'lain' | '';
  guests: number;
  preparationType?: 'meal_box' | 'buffet';
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
  now = Date.now(),
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
  else if (isRestrictedBookingDay(state.date) && state.guests < MIN_RESTRICTED_DAY_PAX) errors.date = tText('Weekend and Putrajaya public holiday orders require at least 60 pax.', 'Tempahan hujung minggu dan cuti umum Putrajaya memerlukan minimum 60 pax.');
  if (!state.time) errors.time = tText('Please select the event time.', 'Sila pilih masa majlis.');
  if (state.date && state.time) {
    const issue = getBookingNoticeError(state.date, state.time, state.guests, now);
    if (issue === 'invalid') errors.time = tText('Please enter a valid event date and time.', 'Sila masukkan tarikh dan masa majlis yang sah.');
    if (issue === 'past') errors.time = tText('Event time cannot be in the past.', 'Masa majlis tidak boleh telah berlalu.');
    if (issue === 'notice') errors.time = tText('Orders of 30 or more require at least 12 hours’ advance notice.', 'Tempahan 30 pack dan ke atas memerlukan sekurang-kurangnya 12 jam notis awal.');
  }
  if (!state.location?.trim()) errors.location = tText('Please enter the delivery/pickup location.', 'Sila masukkan lokasi.');
  if (!state.delivery) errors.delivery = tText('Please choose delivery or pickup.', 'Sila pilih hantar atau ambil sendiri.');
  return errors;
}

/** Restore only as far as the fields that are still present in the draft allow. */
export function getValidOrderStep(
  requestedStep: number,
  state: OrderContactFields & { mealTypes: readonly string[]; guests: number },
): number {
  const step = Number.isFinite(requestedStep) ? Math.min(4, Math.max(1, Math.floor(requestedStep))) : 1;
  if (step > 1 && (!state.eventType || !state.mealTypes.length || !Number.isFinite(state.guests) || state.guests < minimumServingQuantity(state.preparationType))) return 1;
  if (step === 4 && Object.keys(validateOrderContactDetails(state, en => en)).length) return 3;
  return step;
}
