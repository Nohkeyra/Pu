/**
 * Safe, resumable backfill for the orders.eventDate field.
 *
 * Dry-run (default):
 *   FIREBASE_PROJECT_ID=your-project node scripts/backfill-event-date.cjs
 *
 * Apply (requires explicit project confirmation):
 *   FIREBASE_PROJECT_ID=your-project node scripts/backfill-event-date.cjs --apply --confirm-project-id=your-project
 *
 * Uses Application Default Credentials unless service-account credentials are
 * supplied through the existing environment variables. Only eventDate is written;
 * existing date/dateTime/createdAt/status/customer/invoice fields are never changed.
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const TIME_ZONE = 'Asia/Kuala_Lumpur';
const BATCH_SIZE = 400;

function parseArgs(argv) {
  const args = { apply: false, projectId: process.env.FIREBASE_PROJECT_ID || '', confirmProjectId: '' };
  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg.startsWith('--project-id=')) args.projectId = arg.slice('--project-id='.length).trim();
    else if (arg.startsWith('--confirm-project-id=')) args.confirmProjectId = arg.slice('--confirm-project-id='.length).trim();
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function validISODate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(0);
  check.setUTCFullYear(year, month - 1, day);
  if (month < 1 || month > 12 || day < 1 ||
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day) return null;
  return value.trim();
}

function dateInMalaysia(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'object') {
    try {
      if (typeof value.toDate === 'function') {
        const converted = value.toDate();
        if (converted instanceof Date && Number.isFinite(converted.getTime())) return converted;
      }
    } catch {
      // Try the supported seconds-based representations below.
    }
    const seconds = typeof value.seconds === 'number' ? value.seconds
      : typeof value._seconds === 'number' ? value._seconds : null;
    if (seconds !== null && Number.isFinite(seconds)) {
      const date = new Date(seconds * 1000);
      return Number.isFinite(date.getTime()) ? date : null;
    }
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value > 100000000000 ? value : value * 1000);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();

  const isoDatePrefix = /^(\d{4}-\d{2}-\d{2})(?:$|[Tt ])/.exec(input);
  if (isoDatePrefix) {
    const valid = validISODate(isoDatePrefix[1]);
    if (!valid) return null;
    if (input === valid) return new Date(`${valid}T12:00:00+08:00`);
  }

  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(input);
  if (dmy) {
    const day = Number(dmy[1]), month = Number(dmy[2]), year = Number(dmy[3]);
    const valid = validISODate(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    return valid ? new Date(`${valid}T12:00:00+08:00`) : null;
  }

  const date = new Date(input);
  return Number.isFinite(date.getTime()) ? date : null;
}

function deriveEventDate(data) {
  const existing = validISODate(data.eventDate);
  if (existing) return existing;

  for (const value of [data.date, data.dateTime]) {
    const directDate = validISODate(value);
    if (directDate) return directDate;
    const parsed = toDate(value);
    const normalized = dateInMalaysia(parsed);
    if (normalized) return normalized;
  }
  return null;
}

function getAdminApp(projectId) {
  const existing = getApps().find(app => app.options.projectId === projectId);
  if (existing) return existing;

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    }, `event-date-backfill-${projectId}`);
  }
  return initializeApp({ projectId }, `event-date-backfill-${projectId}`);
}

async function runBackfill(argv = process.argv.slice(2), injectedDb = null) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('Dry-run by default. Add --apply --confirm-project-id=<same project ID> to write.');
    return { dryRun: !args.apply, scanned: 0, planned: 0, updated: 0, skipped: 0, invalid: 0 };
  }
  if (!args.projectId) {
    throw new Error('Project ID is required. Set FIREBASE_PROJECT_ID or pass --project-id=<project ID>.');
  }
  if (args.apply && args.confirmProjectId !== args.projectId) {
    throw new Error('Refusing to write: --apply requires --confirm-project-id matching the selected project ID.');
  }
  if (!args.apply && args.confirmProjectId) {
    throw new Error('--confirm-project-id is only accepted together with --apply.');
  }

  const db = injectedDb || getFirestore(getAdminApp(args.projectId));
  const snapshot = await db.collection('orders').get();
  let planned = 0;
  let skipped = 0;
  let invalid = 0;
  const pending = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (validISODate(data.eventDate)) {
      skipped++;
      continue;
    }
    const derived = deriveEventDate({ ...data, eventDate: null });
    if (!derived) {
      invalid++;
      continue;
    }
    planned++;
    pending.push({ ref: doc.ref, eventDate: derived });
  }

  console.log(`Project: ${args.projectId}`);
  console.log(`Orders scanned: ${snapshot.size}`);
  console.log(`Already valid / skipped: ${skipped}`);
  console.log(`Eligible to backfill: ${planned}`);
  console.log(`Missing/ambiguous source date (left untouched): ${invalid}`);
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);

  if (!args.apply) {
    console.log('Dry run only; no Firestore documents were changed.');
    return { dryRun: true, scanned: snapshot.size, planned, updated: 0, skipped, invalid };
  }

  let updated = 0;
  for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
    const batch = db.batch();
    const group = pending.slice(offset, offset + BATCH_SIZE);
    for (const item of group) {
      // Additive update: never overwrite the original legacy date fields or other order data.
      batch.update(item.ref, { eventDate: item.eventDate });
    }
    await batch.commit();
    updated += group.length;
    console.log(`Committed ${updated}/${pending.length} eventDate updates.`);
  }

  console.log(`Backfill complete. Updated: ${updated}; skipped: ${skipped}; ambiguous: ${invalid}.`);
  return { dryRun: false, scanned: snapshot.size, planned, updated, skipped, invalid };
}

if (require.main === module) {
  runBackfill().catch(err => {
    console.error('Backfill aborted:', err.message || err);
    process.exit(1);
  });
}

module.exports = { deriveEventDate, validISODate, parseArgs, runBackfill };
