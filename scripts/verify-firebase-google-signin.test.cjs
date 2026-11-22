'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateFirebaseGoogleSignIn } = require('./verify-firebase-google-signin.cjs');

const SHA1 = '7a'.repeat(20);
const otherSHA1 = '9b'.repeat(20);
const expected = {
  projectId: 'restoran-wawasan',
  projectNumber: '1019707766959',
  packageName: 'com.wawasanpakusop.app',
  releaseSha1: SHA1,
};
const valid = () => ({
  project_info: { project_id: expected.projectId, project_number: expected.projectNumber },
  client: [{
    client_info: {
      mobilesdk_app_id: '1:' + expected.projectNumber + ':android:0123456789abcdef',
      android_client_info: { package_name: expected.packageName },
    },
    oauth_client: [
      { client_type: 1, client_id: 'android-id.apps.googleusercontent.com',
        android_info: { package_name: expected.packageName, certificate_hash: SHA1 } },
      { client_type: 3, client_id: 'web-id.apps.googleusercontent.com' },
    ],
  }],
});

test('accepts matching Android app, web OAuth client and release signing SHA-1', () => {
  assert.deepEqual(validateFirebaseGoogleSignIn(valid(), expected), []);
});

test('rejects old google-services.json without OAuth clients', () => {
  const config = valid();
  config.client[0].oauth_client = [];
  const errors = validateFirebaseGoogleSignIn(config, expected);
  assert.ok(errors.some(x => x.includes('Web OAuth')));
  assert.ok(errors.some(x => x.includes('Android OAuth')));
});

test('rejects release keystore not registered as an Android OAuth client', () => {
  const config = valid();
  config.client[0].oauth_client[0].android_info.certificate_hash = otherSHA1;
  assert.ok(validateFirebaseGoogleSignIn(config, expected).some(x => x.includes('Release APK keystore SHA-1')));
});

test('rejects wrong Firebase project and package', () => {
  const config = valid();
  config.project_info.project_id = 'wrong-project';
  config.client[0].client_info.android_client_info.package_name = 'com.different.app';
  const errors = validateFirebaseGoogleSignIn(config, expected);
  assert.ok(errors.some(x => x.includes('project ID')));
  assert.ok(errors.some(x => x.includes('Missing Firebase Android app')));
});

test('accepts multiple Android OAuth clients when the release SHA-1 matches one', () => {
  const config = valid();
  config.client[0].oauth_client.unshift({
    client_type: 1, client_id: 'debug.apps.googleusercontent.com',
    android_info: { package_name: expected.packageName, certificate_hash: otherSHA1 },
  });
  assert.deepEqual(validateFirebaseGoogleSignIn(config, expected), []);
});
