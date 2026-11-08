const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wawasan-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, text) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  };
  write('scripts/bump-version.cjs', fs.readFileSync(path.join(__dirname, 'bump-version.cjs')));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Release Test');
  git('config', 'user.email', 'release@example.invalid');
  const version = (name, code) => write('android/version.properties', `versionName=${name}\nversionCode=${code}\n`);
  const tag = (name, code, annotated = false) => {
    version(name, code); git('add', '.'); git('commit', '-qm', `Version ${name}`);
    if (annotated) git('tag', '-a', `v${name}`, '-m', 'Release');
    else git('tag', `v${name}`);
  };
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  const run = (...args) => spawnSync(process.execPath, ['scripts/bump-version.cjs', ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_ENV: path.join(root, 'github-env'), GITHUB_OUTPUT: path.join(root, 'github-output') },
  });
  return { root, write, git, version, tag, read, run };
}

test('source rollback cannot reuse a published tag or Android build code', t => {
  const f = fixture(t);
  f.tag('1.3.177', 309);
  f.version('1.3.176', 308);
  f.write('package.json', '{"version":"1.3.176"}');
  f.write('src/services/updateService.ts', "export const CURRENT_APP_VERSION = '1.3.176';\nexport const CURRENT_BUILD_NUMBER = 308;\nexport const DEFAULT_APK_URL = 'old';\n");
  const r = f.run('patch', '--ci', '--release');
  assert.equal(r.status, 0, r.stderr);
  assert.match(f.read('android/version.properties'), /versionName=1.3.178/);
  assert.match(f.read('android/version.properties'), /versionCode=310/);
  assert.equal(f.read('android/app/version.properties'), f.read('android/version.properties'));
  assert.equal(JSON.parse(f.read('package.json')).version, '1.3.178');
  assert.match(f.read('src/services/updateService.ts'), /CURRENT_BUILD_NUMBER = 310/);
  assert.match(f.read('src/services/updateService.ts'), /v1.3.178\/app-release-signed.apk/);
  assert.match(f.read('github-env'), /VERSION_NAME=1.3.178/);
  assert.match(f.read('github-output'), /version_code=310/);
});

test('release ordering is numeric, accepts annotated tags and keeps the highest code', t => {
  const f = fixture(t);
  f.tag('1.3.9', 400);
  f.tag('1.3.10', 300, true);
  f.git('tag', 'v2026.08.08-0243');
  f.version('1.2.5', 125);
  const r = f.run('minor', '--release');
  assert.equal(r.status, 0, r.stderr);
  assert.match(f.read('android/version.properties'), /versionName=1.4.0/);
  assert.match(f.read('android/version.properties'), /versionCode=401/);
});

test('local bumps keep their previous behavior; first release can have no tags', t => {
  const f = fixture(t);
  f.version('1.3.176', 308);
  assert.equal(f.run('patch', '--release').status, 0);
  assert.match(f.read('android/version.properties'), /versionName=1.3.177/);
  f.tag('1.3.200', 500);
  f.version('1.3.176', 308);
  assert.equal(f.run('patch').status, 0);
  assert.match(f.read('android/version.properties'), /versionName=1.3.177/);
  assert.match(f.read('android/version.properties'), /versionCode=309/);
});

test('an explicit release downgrade fails before modifying source files', t => {
  const f = fixture(t);
  f.tag('1.3.177', 309);
  f.version('1.3.176', 308);
  const before = f.read('android/version.properties');
  const r = f.run('set', '1.3.177', '--release');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Release version must exceed 1.3.177/);
  assert.equal(f.read('android/version.properties'), before);
});
