import { describe, expect, it } from 'vitest';
import { validateOrderContactDetails, type OrderContactFields } from './orderContactValidation';

const english = (en: string) => en;
const valid: OrderContactFields = {
  eventType: 'lain', companyName: '', customCompany: '', name: 'Amin',
  contact: '0123456789', email: 'amin@example.com', confirmEmail: 'amin@example.com',
  date: '2026-12-12', time: '12:00', location: 'Presint 2, Putrajaya', delivery: 'delivery',
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
