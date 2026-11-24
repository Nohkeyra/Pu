import { describe, expect, it } from 'vitest';
import { getValidOrderStep, validateOrderContactDetails, type OrderContactFields } from './orderContactValidation';

const english = (en: string) => en;
const valid: OrderContactFields = {
  eventType: 'lain', guests: 29, companyName: '', customCompany: '', name: 'Amin',
  contact: '0123456789', email: 'amin@example.com', confirmEmail: 'amin@example.com',
  date: '2099-12-12', time: '12:00', location: 'Presint 2, Putrajaya', delivery: 'delivery',
};

describe('Order contact validation used by both Next buttons', () => {
  it('accepts a valid private booking', () => {
    expect(validateOrderContactDetails(valid, english)).toEqual({});
  });
  it('rejects short and empty phone numbers', () => {
    expect(validateOrderContactDetails({ ...valid, contact: '12345' }, english).contact).toBeTruthy();
    expect(validateOrderContactDetails({ ...valid, contact: '' }, english).contact).toBeTruthy();
  });
  it('rejects malformed email even if confirmation matches', () => {
    expect(validateOrderContactDetails({ ...valid, email: 'not-an-email', confirmEmail: 'not-an-email' }, english).email).toBeTruthy();
  });
  it('rejects email mismatch', () => {
    expect(validateOrderContactDetails({ ...valid, confirmEmail: 'another@example.com' }, english).confirmEmail).toBeTruthy();
  });
  it('requires a company for corporate orders', () => {
    expect(validateOrderContactDetails({ ...valid, eventType: 'pejabat' }, english).companyName).toBeTruthy();
  });
  it('requires a custom company when other is selected', () => {
    expect(validateOrderContactDetails({ ...valid, eventType: 'pejabat', companyName: 'other' }, english).customCompany).toBeTruthy();
  });
  it('requires name, date, time and location', () => {
    const errors = validateOrderContactDetails({ ...valid, name: '', date: '', time: '', location: '' }, english);
    expect(errors.name && errors.date && errors.time && errors.location).toBeTruthy();
  });
  it('accepts a valid corporate booking with an entered name', () => {
    expect(validateOrderContactDetails({ ...valid, eventType: 'pejabat', companyName: 'other', customCompany: 'Jabatan A' }, english)).toEqual({});
  });
});

describe('Restored order progress', () => {
  const state = { ...valid, mealTypes: ['tengahari'], guests: 50 };
  it('returns a partially saved review to contact details', () => {
    expect(getValidOrderStep(4, { ...state, name: '', contact: '', email: '', confirmEmail: '' })).toBe(3);
  });
  it('keeps complete reviews and earlier menu progress', () => {
    expect(getValidOrderStep(4, state)).toBe(4);
    expect(getValidOrderStep(2, { ...state, name: '' })).toBe(2);
  });
  it('returns incomplete event details to the first step', () => {
    expect(getValidOrderStep(3, { ...state, eventType: '' })).toBe(1);
    expect(getValidOrderStep(4, { ...state, mealTypes: [] })).toBe(1);
    expect(getValidOrderStep(4, { ...state, guests: 0 })).toBe(1);
  });
  it('rechecks corporate details and bounds invalid stored progress', () => {
    expect(getValidOrderStep(4, { ...state, eventType: 'pejabat' })).toBe(3);
    expect(getValidOrderStep(Number.NaN, state)).toBe(1);
    expect(getValidOrderStep(99, state)).toBe(4);
  });
});

describe('Quantity-based booking notice', () => {
  const now = Date.parse('2026-11-24T21:00:00+08:00');
  const booking = { ...valid, date: '2026-11-25', time: '08:59' };
  it('accepts 29 packs but rejects 30 before the 12-hour cutoff', () => {
    expect(validateOrderContactDetails({ ...booking, guests: 29 }, english, now)).toEqual({});
    expect(validateOrderContactDetails({ ...booking, guests: 30 }, english, now).time).toBeTruthy();
  });
  it('accepts exactly 12 hours and rejects past events', () => {
    expect(validateOrderContactDetails({ ...booking, guests: 30, time: '09:00' }, english, now)).toEqual({});
    expect(validateOrderContactDetails({ ...booking, date: '2026-11-24', time: '20:59', guests: 1 }, english, now).time).toBeTruthy();
  });
});
