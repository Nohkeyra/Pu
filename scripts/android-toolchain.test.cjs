const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const semver = require('semver');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Capacitor 8 Android SDK, Gradle, AGP and AndroidX baselines stay aligned', () => {
  const gradle = read('android/build.gradle'), properties = read('android/gradle/wrapper/gradle-wrapper.properties');
  const versions = read('android/variables.gradle');
  const agp = gradle.match(/com.android.tools.build:gradle:([\d.]+)/)[1];
  const wrapper = properties.match(/gradle-([\d.]+)-all.zip/)[1];
  assert.ok(semver.gte(agp, '8.13.0'));
  assert.ok(semver.gte(wrapper, '8.14.3'));
  for (const [key, floor] of Object.entries({ minSdkVersion: 24, compileSdkVersion: 36, targetSdkVersion: 36 })) {
    assert.ok(Number(versions.match(new RegExp(`${key} = (\\d+)`))[1]) >= floor, key);
  }
  for (const [key, floor] of Object.entries({ androidxActivityVersion: '1.11.0', androidxAppCompatVersion: '1.7.1', androidxCoordinatorLayoutVersion: '1.3.0', androidxCoreVersion: '1.17.0', androidxFragmentVersion: '1.8.9', coreSplashScreenVersion: '1.2.0', androidxWebkitVersion: '1.14.0', cordovaAndroidVersion: '14.0.1' })) {
    assert.ok(semver.gte(versions.match(new RegExp(`${key} = '([^']+)'`))[1], floor), key);
  }
  assert.match(read('android/app/src/main/AndroidManifest.xml'), /android:configChanges="[^"]*\bdensity\b/);
  assert.doesNotMatch(read('android/gradle.properties'), /android.suppressUnsupportedCompileSdk/);
});

test('wrapper checksum, verified distribution and CI restoration refer to the same release', () => {
  const properties = read('android/gradle/wrapper/gradle-wrapper.properties');
  const workflow = read('.github/workflows/build-apk.yml');
  const wrapper = properties.match(/gradle-([\d.]+)-all.zip/)[1];
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'android/gradle/wrapper/gradle-wrapper.jar'))).digest('hex');
  assert.ok(workflow.includes(`/gradle/v${wrapper}/gradle/wrapper/gradle-wrapper.jar`));
  assert.ok(workflow.includes(`WRAPPER_SHA=${hash}`));
  assert.match(properties, /^distributionSha256Sum=[a-f\d]{64}$/m);
  assert.doesNotMatch(workflow, /npm install -g @capacitor\/cli/);
});

for (const [nodeVersion, javaVersion, expected] of [[20, '21.0.13', /Node.js 22\+/], [22, '17.0.20', /JDK 21\+/]]) {
  test(`local build rejects Node ${nodeVersion} / Java ${javaVersion} before installing or building`, t => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wawasan-build-guard-'));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    for (const [name, body] of Object.entries({
      node: `#!/bin/sh\necho ${nodeVersion}\n`,
      java: `#!/bin/sh\necho 'openjdk version "${javaVersion}"' >&2\n`,
      npm: `#!/bin/sh\ntouch '${temp}/npm-was-called'\n`,
    })) fs.writeFileSync(path.join(temp, name), body, { mode: 0o755 });
    const result = spawnSync('/bin/bash', [path.join(root, 'scripts/build-apk.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${temp}:/usr/bin:/bin` } });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, expected);
    assert.ok(!fs.existsSync(path.join(temp, 'npm-was-called')));
  });
}
