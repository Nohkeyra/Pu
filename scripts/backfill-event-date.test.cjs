const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveEventDate, validISODate, parseArgs, runBackfill } = require('./backfill-event-date.cjs');

test('validISODate accepts real dates and rejects normalized/impossible dates', () => {
  assert.equal(validISODate('2026-02-28'), '2026-02-28');
  assert.equal(validISODate('2026-02-31'), null);
  assert.equal(validISODate('31/02/2026'), null);
  assert.equal(validISODate(' 2026-10-24 '), '2026-10-24');
});

test('deriveEventDate preserves a valid eventDate and supports legacy date formats', () => {
  assert.equal(deriveEventDate({ eventDate: '2026-10-24', date: '2026-10-25' }), '2026-10-24');
  assert.equal(deriveEventDate({ date: '25/11/2026' }), '2026-11-25');
  assert.equal(deriveEventDate({ date: '25-11-2026' }), '2026-11-25');
  assert.equal(deriveEventDate({ date: '2026-11-25' }), '2026-11-25');
});

test('deriveEventDate supports Firestore-style timestamps and leaves ambiguous data unresolved', () => {
  assert.equal(deriveEventDate({ date: { _seconds: 1795564800, _nanoseconds: 0 } }), '2026-11-25');
  assert.equal(deriveEventDate({ date: '31/02/2026', dateTime: 'not-a-date' }), null);
  assert.equal(deriveEventDate({}), null);
});

test('apply mode requires explicit confirmation of the selected project', async () => {
  await assert.rejects(
    runBackfill(['--project-id=staging-project', '--apply'], {}),
    /--confirm-project-id matching the selected project ID/,
  );
});

test('default mode is dry-run and never creates a write batch', async () => {
  let batchCreated = false;
  const fakeDb = {
    collection: () => ({
      get: async () => ({
        size: 2,
        docs: [
          { id: 'legacy-1', ref: { id: 'legacy-1' }, data: () => ({ date: '25/11/2026' }) },
          { id: 'bad-1', ref: { id: 'bad-1' }, data: () => ({ date: 'not-a-date' }) },
        ],
      }),
    }),
    batch: () => {
      batchCreated = true;
      throw new Error('Dry run must not create a batch');
    },
  };
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = await runBackfill(['--project-id=staging-project'], fakeDb);
    assert.deepEqual(result, {
      dryRun: true, scanned: 2, planned: 1, updated: 0, skipped: 0, invalid: 1,
    });
    assert.equal(batchCreated, false);
  } finally {
    console.log = originalLog;
  }
});
