'use strict';

// Verify the effective Google OAuth configuration before publishing an Android APK.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

const normalizeSha1 = (value) => String(value || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();

function validateFirebaseGoogleSignIn(config, expected) {
  const issues = [];
  const project = config?.project_info;
  const projectId = String(project?.project_id || '');
  const projectNumber = String(project?.project_number || '');
  if (projectId !== expected.projectId) {
    issues.push('Firebase project ID in google-services.json does not match the production project.');
  }
  if (projectNumber !== expected.projectNumber) {
    issues.push('Firebase project number does not match the production web configuration.');
  }

  const clients = Array.isArray(config?.client) ? config.client : [];
  const androidClient = clients.find((client) =>
    client?.client_info?.android_client_info?.package_name === expected.packageName
    && typeof client?.client_info?.mobilesdk_app_id === 'string'
    && client.client_info.mobilesdk_app_id.startsWith('1:' + projectNumber + ':android:'));

  if (!androidClient) {
    issues.push('Missing Firebase Android app configuration for ' + expected.packageName + '.');
  } else {
    const oauth = Array.isArray(androidClient.oauth_client) ? androidClient.oauth_client : [];
    const webClient = oauth.some((client) =>
      client?.client_type === 3
      && typeof client.client_id === 'string'
      && client.client_id.endsWith('.apps.googleusercontent.com'));
    if (!webClient) {
      issues.push('Missing Web OAuth client (client_type=3). Enable Google Sign-In and download a new google-services.json.');
    }

    const androidOAuthClients = oauth.filter((client) =>
      client?.client_type === 1
      && client?.android_info?.package_name === expected.packageName
      && /^[a-f0-9]{40}$/.test(normalizeSha1(client?.android_info?.certificate_hash)));
    if (androidOAuthClients.length === 0) {
      issues.push('Missing Android OAuth client with a SHA-1 certificate hash. Register the signing SHA-1 in Firebase.');
    } else if (expected.releaseSha1) {
      const actualSha1 = normalizeSha1(expected.releaseSha1);
      if (!/^[a-f0-9]{40}$/.test(actualSha1)) {
        issues.push('Invalid release keystore SHA-1 passed to the validator.');
      } else if (!androidOAuthClients.some((client) =>
        normalizeSha1(client.android_info.certificate_hash) === actualSha1)) {
        issues.push('Release APK keystore SHA-1 does not match an Android OAuth client. Register the release SHA-1 in Firebase and refresh GOOGLE_SERVICES_JSON_BASE64.');
      }
    }
  }
  return issues;
}

function run() {
  const web = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
  const gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
  const match = gradle.match(/\bapplicationId\s+["']([^"']+)["']/);
  if (!match) throw new Error('Could not read Android applicationId from android/app/build.gradle.');
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'android/app/google-services.json'), 'utf8'));
  const issues = validateFirebaseGoogleSignIn(config, {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || web.projectId,
    projectNumber: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || web.messagingSenderId,
    packageName: match[1],
    releaseSha1: process.env.ANDROID_RELEASE_SHA1 || undefined,
  });
  if (issues.length) {
    console.error('Firebase Android / Google Sign-In validation failed:');
    for (const issue of issues) console.error('- ' + issue);
    console.error('Do not publish this APK. Check project restoran-wawasan, Google provider, signing SHA-1 and updated GOOGLE_SERVICES_JSON_BASE64.');
    process.exitCode = 1;
  } else {
    console.log('Firebase Android Google Sign-In configuration validated for ' + match[1] +
      (process.env.ANDROID_RELEASE_SHA1 ? ' (including release SHA-1).' : '.'));
  }
}

if (require.main === module) {
  try { run(); } catch (error) {
    console.error('Firebase Android verification could not run: ' + error.message);
    process.exitCode = 1;
  }
}
module.exports = { normalizeSha1, validateFirebaseGoogleSignIn };
