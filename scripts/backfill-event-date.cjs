/**
 * Backfill script for Firestore orders collection.
 * Ensures all existing order documents have 'eventDate' (YYYY-MM-DD) populated
 * derived from 'date' or 'dateTime'.
 *
 * Usage: node scripts/backfill-event-date.cjs
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID || 'wawasan-pak-usop';
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  return initializeApp({ projectId });
}

function deriveEventDate(data) {
  if (data.eventDate && typeof data.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.eventDate.trim())) {
    return data.eventDate.trim();
  }

  if (data.date && typeof data.date === 'string') {
    const trimmed = data.date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }

  const raw = data.dateTime || data.date;
  if (!raw) return null;

  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(d);
  } catch {
    return null;
  }
}

async function runBackfill() {
  console.log('🚀 Starting eventDate backfill for orders...');
  const app = getAdminApp();
  const db = getFirestore(app);

  const snapshot = await db.collection('orders').get();
  console.log(`📦 Found ${snapshot.size} total orders.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let batch = db.batch();
  let batchOps = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const derived = deriveEventDate(data);

    if (derived && (!data.eventDate || data.eventDate !== derived || !data.date)) {
      const updates = {};
      if (!data.eventDate || data.eventDate !== derived) updates.eventDate = derived;
      if (!data.date) updates.date = derived;

      batch.update(doc.ref, updates);
      batchOps++;
      updatedCount++;

      if (batchOps >= 400) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchOps} updates.`);
        batch = db.batch();
        batchOps = 0;
      }
    } else {
      skippedCount++;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
    console.log(`💾 Committed final batch of ${batchOps} updates.`);
  }

  console.log(`✅ Backfill complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
}

if (require.main === module) {
  runBackfill().catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  });
}

module.exports = { deriveEventDate, runBackfill };
