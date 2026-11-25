import { getFirestore, getAdminApp } from '../server/firebaseAdmin.js';
import { firebaseConfig } from '../server/config.js';
import { migrateCalendarIndex } from '../server/services/calendarIndexMigration.js';

async function main() {
  const args = process.argv.slice(2);
  const project = args.find(arg => arg.startsWith('--project-id='))?.slice('--project-id='.length);
  const confirmation = args.find(arg => arg.startsWith('--confirm-project-id='))?.slice('--confirm-project-id='.length);
  const apply = args.includes('--apply');
  const verify = args.includes('--verify');
  if (!project || project !== firebaseConfig.projectId) throw new Error('Pass --project-id matching the explicitly configured FIREBASE_PROJECT_ID.');
  if (process.env.FIREBASE_PROJECT_ID?.trim() !== project) throw new Error('Set FIREBASE_PROJECT_ID explicitly.');
  if (process.env.CI || process.env.VITEST || process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_FIRESTORE === 'true') throw new Error('This command must not use the in-memory test database.');
  if (apply && (confirmation !== project || verify)) throw new Error('Apply requires matching --confirm-project-id and cannot be combined with --verify.');
  if (!apply && confirmation) throw new Error('Confirmation is accepted only with --apply.');
  if (args.some(arg => !arg.startsWith('--project-id=') && !arg.startsWith('--confirm-project-id=') && arg !== '--apply' && arg !== '--verify')) throw new Error('Unknown argument.');
  if (getAdminApp().options.projectId !== project) throw new Error('Firebase Admin project mismatch.');
  const result = await migrateCalendarIndex(getFirestore(), apply);
  console.log(JSON.stringify({ project, mode: apply ? 'apply' : verify ? 'verify' : 'dry-run', ...result }));
  if (verify && result.pending !== 0) throw new Error('Index coverage incomplete; leave FIRESTORE_CALENDAR_INDEX_READY disabled.');
}

main().catch(error => {
  console.error('[Calendar index migration]', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
