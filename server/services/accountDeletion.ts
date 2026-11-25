import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getFirestore } from '../firebaseAdmin.js';

const PAGE_SIZE = 400;

// The marker survives a failed request. Subsequent authenticated requests
// resume by querying only remaining documents. Retain historical orders.
export async function deleteCustomerData(
  uid: string,
  removeAuthUser: (uid: string) => Promise<void> = (id) => getAuth(getAdminApp()).deleteUser(id),
  db = getFirestore()
): Promise<void> {
  if (!uid || uid.includes('/')) throw new Error('Invalid customer identity');
  const marker = db.collection('account_deletions').doc(uid);
  await marker.set({ status: 'deleting', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  for (const collection of ['calendar_notes', 'company_presets'] as const) {
    for (;;) {
      const page = await db.collection(collection).where('userId', '==', uid).limit(PAGE_SIZE).get();
      if (page.empty) break;
      const batch = db.batch();
      for (const doc of page.docs) batch.delete(doc.ref);
      await batch.commit();
    }
  }
  // Remove device tokens without deleting retained historical invoices.
  for (const field of ['userId', 'uid'] as const) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = db.collection('orders').where(field, '==', uid).limit(PAGE_SIZE);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      if (page.empty) break;
      const batch = db.batch();
      let changes = 0;
      for (const doc of page.docs) {
        const data = doc.data();
        if ((data.userId || data.uid) === uid && data.fcmToken) {
          batch.update(doc.ref, { fcmToken: null });
          changes++;
        }
      }
      if (changes) await batch.commit();
      cursor = page.docs[page.docs.length - 1];
      if (page.size < PAGE_SIZE) break;
    }
  }
  await db.collection('users').doc(uid).delete();
  // If Auth deletion fails, the user can reauthenticate and retry.
  // Keep the marker so an old token cannot recreate personal data.
  try { await removeAuthUser(uid); }
  catch (error) {
    if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
  }
  // If this bookkeeping write fails, the deletion itself already succeeded.
  await marker.set({ status: 'deleted', updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(error => {
    console.error('[Account deletion] Completion marker update failed', error);
  });
}
