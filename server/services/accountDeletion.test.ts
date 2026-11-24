import { describe, it, expect, vi } from 'vitest';
import { getFirestore } from '../firebaseAdmin.js';
import { deleteCustomerData } from './accountDeletion.js';

describe('resumable account deletion', () => {
  it('retains records owned by others and invoice history, resumes after Auth failure', async () => {
    const db = getFirestore();
    const uid = 'deletion_fixture_owner';
    await db.collection('users').doc(uid).set({ name: 'fixture' });
    await db.collection('calendar_notes').doc('deletion_fixture_note').set({ userId: uid });
    await db.collection('company_presets').doc('deletion_fixture_preset').set({ userId: uid });
    await db.collection('company_presets').doc('deletion_fixture_other').set({ userId: 'other' });
    await db.collection('orders').doc('deletion_fixture_order').set({ userId: uid, invoiceNo: 'RW TEST', fcmToken: 'fixture-token' });
    const remove = vi.fn(async () => {}).mockRejectedValueOnce(new Error('Auth unavailable'));
    await expect(deleteCustomerData(uid, remove, db)).rejects.toThrow('Auth unavailable');
    expect((await db.collection('account_deletions').doc(uid).get()).data()?.status).toBe('deleting');
    expect((await db.collection('users').doc(uid).get()).exists).toBe(false);
    expect((await db.collection('calendar_notes').doc('deletion_fixture_note').get()).exists).toBe(false);
    expect((await db.collection('company_presets').doc('deletion_fixture_preset').get()).exists).toBe(false);
    expect((await db.collection('company_presets').doc('deletion_fixture_other').get()).exists).toBe(true);
    expect((await db.collection('orders').doc('deletion_fixture_order').get()).data()).toMatchObject({ invoiceNo: 'RW TEST', fcmToken: null });
    await deleteCustomerData(uid, remove, db);
    expect(remove).toHaveBeenCalledTimes(2);
    expect((await db.collection('account_deletions').doc(uid).get()).data()?.status).toBe('deleted');
  });
});
