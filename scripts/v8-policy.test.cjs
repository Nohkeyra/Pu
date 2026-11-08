const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

// Import dependency-free TS modules using the project's minimum Node 22 runtime.
// Child process ensures a consistent strip-types mode when called via node --test.
const runner = `
import assert from 'node:assert/strict';
import { evaluateVerifiedOrderAccess as access } from './src/lib/verifiedOrdering.ts';
import { getNativeStartRoute as start, getCustomerHomePath as home } from './src/lib/appEntryRoutes.ts';
assert.equal(access(null).status, 401);
assert.equal(access({uid:'a',emailVerified:false}).status, 403);
assert.equal(access({uid:'a',emailVerified:true},'b').code,'ORDER_OWNER_MISMATCH');
assert.deepEqual(access({uid:'a',emailVerified:true},'a'),{allowed:true,uid:'a'});
assert.deepEqual(access({uid:'a',emailVerified:true},null),{allowed:true,uid:'a'});
assert.equal(start(false,false),'/login');
assert.equal(start(true,false),'/app');
assert.equal(start(true,true),'/admin');
assert.equal(home(true,false),'/app');
assert.equal(home(false,false),'/');
assert.equal(home(false,true),'/app');
`;
test('V8 verified ordering and platform entry policy', () => {
  execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', runner], {
    cwd: resolve(__dirname, '..'), stdio: 'pipe', timeout: 10000,
  });
});
