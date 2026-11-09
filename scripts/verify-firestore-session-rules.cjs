// Explicit emulator-only check. Never accepts a remote host or a live project.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = process.env.FIRESTORE_RULES_TEST_HOST || '';
assert.match(host, /^127\.0\.0\.1:\d+$/, 'Set FIRESTORE_RULES_TEST_HOST to a local Firestore emulator.');
const project = 'demo-local-audit';
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const uid = 'session-rules-audit-admin';
const authTime = 1700000000;
const record = `admin_revocations/firebase_session_${uid}_${authTime}`;
const order = 'orders/session-rules-audit-order';
const settings = 'settings/session-rules-audit';
const profile = `users/${uid}`;
const ownOrder = 'orders/session-rules-admin-owned';
const paths = [record, order, settings, profile, ownOrder];
let checks = 0;

function token(userId, admin = null, session = authTime) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  // Unsigned identities are accepted by the emulator only.
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    iss: `https://securetoken.google.com/${project}`, aud: project,
    sub: userId, user_id: userId, iat: now, exp: now + 3600,
    auth_time: session, ...(admin === null ? {} : { admin }), firebase: { identities: {}, sign_in_provider: 'custom' },
  })}.`;
}

async function request(path, credential, method = 'GET', fields) {
  return fetch(`${base}/${path}`, {
    method, headers: { ...(credential ? { Authorization: `Bearer ${credential}` } : {}), 'Content-Type': 'application/json' },
    ...(fields ? { body: JSON.stringify({ fields }) } : {}), signal: AbortSignal.timeout(10_000),
  });
}
async function expectStatus(path, credential, expected, method, fields) {
  const response = await request(path, credential, method, fields);
  assert.equal(response.status, expected, `${method || 'GET'} ${path}: ${await response.text()}`);
  checks++;
}

async function main() {
  try {
    const loaded = await fetch(`http://${host}/emulator/v1/projects/${project}:securityRules`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') }] } }),
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(loaded.status, 200, await loaded.text());
    for (const path of paths) await request(path, 'owner', 'DELETE');
    await expectStatus(order, 'owner', 200, 'PATCH', { userId: { stringValue: 'session-rules-owner' } });
    await expectStatus(settings, 'owner', 200, 'PATCH', { value: { stringValue: 'local-fixture' } });
    await expectStatus(profile, 'owner', 200, 'PATCH', { name: { stringValue: 'local-fixture' } });
    await expectStatus(ownOrder, 'owner', 200, 'PATCH', { userId: { stringValue: uid } });
    await expectStatus(order, null, 403);
    await expectStatus(order, token('session-rules-owner'), 200);
    await expectStatus(order, token('session-rules-other'), 403);
    await expectStatus(order, token(uid, true), 200);
    await expectStatus(settings, token(uid, true), 200, 'PATCH', { value: { stringValue: 'before-logout' } });

    await expectStatus(record, 'owner', 200, 'PATCH', { uid: { stringValue: uid } });
    await expectStatus(order, token(uid, true), 403);
    await expectStatus(profile, token(uid, true), 403);
    await expectStatus(ownOrder, token(uid, true), 403);
    await expectStatus(order, token(uid, true, authTime + 1), 200);
    await expectStatus(settings, token(uid, true), 403, 'PATCH', { value: { stringValue: 'after-logout' } });
    await expectStatus(settings, token(uid, true, authTime + 1), 200, 'PATCH', { value: { stringValue: 'other-device' } });
    await expectStatus(record, token('session-rules-owner'), 403);
    await expectStatus(order, token('session-rules-owner'), 200);
    console.log(`PASS: ${checks} emulator assertions; revoked admin reads/writes denied, other sessions and owner access retained.`);
  } finally {
    for (const path of paths) await request(path, 'owner', 'DELETE');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
