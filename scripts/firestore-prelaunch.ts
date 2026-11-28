import { getAdminApp, getFirestore } from '../server/firebaseAdmin.js';
import { firebaseConfig } from '../server/config.js';

// Scope is deliberately limited to pre-launch order/invoice test data.
const targets = ['invoice_outbox','invoice_email_previews','invoice_email_preview_chunks','consolidated_invoices','orders_archive','orders','idempotency_keys'] as const;
async function counts(db: FirebaseFirestore.Firestore) {
  const result: Record<string, number> = {};
  for (const name of targets) result[name] = (await db.collection(name).count().get()).data().count;
  return result;
}
async function visibility(db: FirebaseFirestore.Firestore, apply: boolean) {
  const result = { scanned: 0, pending: 0, updated: 0 };
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection('orders').select('deletedByAdmin','deletedByUser').limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) break;
    const batch = db.batch();
    let changes = 0;
    for (const doc of snap.docs) {
      result.scanned++;
      const data = doc.data(), flags: Record<string, boolean> = {};
      for (const field of ['deletedByAdmin','deletedByUser']) {
        if (typeof data[field] !== 'boolean') flags[field] = Boolean(data[field]);
      }
      if (!Object.keys(flags).length) continue;
      result.pending++;
      if (apply) {
        if (!doc.updateTime) throw new Error('Missing updateTime.');
        batch.update(doc.ref, flags, {lastUpdateTime:doc.updateTime});
        changes++;
      }
    }
    if (changes) { await batch.commit(); result.updated += changes; }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 200) break;
  }
  return result;
}
async function main() {
  const args = process.argv.slice(2), project = args.find(a => a.startsWith('--project-id='))?.split('=')[1];
  const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'preview';
  const confirm = args.find(a => a.startsWith('--confirm='))?.split('=')[1];
  if (args.some(a => !['--project-id=','--mode=','--confirm='].some(prefix => a.startsWith(prefix)))) throw new Error('Unknown argument.');
  if (project !== 'restoran-wawasan' || process.env.FIREBASE_PROJECT_ID?.trim() !== project ||
      firebaseConfig.projectId !== project || firebaseConfig.firestoreDatabaseId) throw new Error('Explicitly select restoran-wawasan and the default database.');
  if (process.env.CI || process.env.VITEST || process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_FIRESTORE === 'true' || process.env.FIRESTORE_EMULATOR_HOST)
    throw new Error('Maintenance commands must run locally, not in CI or an emulator.');
  if (!['preview','reset','visibility-preview','visibility-apply','visibility-verify'].includes(mode)) throw new Error('Unknown mode.');
  if (mode === 'reset' && confirm !== 'ALL-TEST-ORDERS-restoran-wawasan') throw new Error('Reset requires --confirm=ALL-TEST-ORDERS-restoran-wawasan.');
  if (mode === 'visibility-apply' && confirm !== project) throw new Error('Backfill requires --confirm=restoran-wawasan.');
  if (getAdminApp().options.projectId !== project) throw new Error('Firebase Admin project mismatch.');
  const db = getFirestore();
  if (mode.startsWith('visibility-')) {
    const result = await visibility(db, mode === 'visibility-apply');
    console.log(JSON.stringify({project,mode,...result},null,2));
    if (mode === 'visibility-verify' && result.pending !== 0) throw new Error('Visibility normalization incomplete.');
    return;
  }
  console.log(JSON.stringify({project,mode,topLevelCounts:await counts(db)},null,2));
  if (mode !== 'reset') return;
  // Run only after stopping order submissions and invoice workers. Never use after launch.
  for (const name of targets) { await db.recursiveDelete(db.collection(name)); console.log('Cleared '+name); }
  const remaining = await counts(db);
  console.log(JSON.stringify({remaining},null,2));
  if (Object.values(remaining).some(n => n !== 0)) throw new Error('New records appeared; stop writers before repeating.');
}
main().catch(err => {console.error('[Firestore maintenance]',err instanceof Error ? err.message : err); process.exitCode = 1;});
