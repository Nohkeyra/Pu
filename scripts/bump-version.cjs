#!/usr/bin/env node
/**
 * Logical app versioning for Restoran Wawasan (Android + package.json).
 *
 * Usage:
 *   node scripts/bump-version.cjs              # print current version
 *   node scripts/bump-version.cjs patch        # 1.2.5 → 1.2.6, code +1
 *   node scripts/bump-version.cjs minor        # 1.2.5 → 1.3.0, code +1
 *   node scripts/bump-version.cjs major        # 1.2.5 → 2.0.0, code +1
 *   node scripts/bump-version.cjs set 1.4.0    # set name, code +1
 *   node scripts/bump-version.cjs patch --ci   # bump + write GITHUB_ENV / GITHUB_OUTPUT
 *
 * Source of truth: android/version.properties (mirrored to android/app/version.properties)
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const propsPaths = [
  path.join(root, 'android', 'version.properties'),
  path.join(root, 'android', 'app', 'version.properties'),
];
const packageJsonPath = path.join(root, 'package.json');
const updateServicePath = path.join(root, 'src', 'services', 'updateService.ts');
const serverPath = path.join(root, 'server.ts');

function readProps(filePath) {
  if (!fs.existsSync(filePath)) return { versionCode: 125, versionName: '1.2.5' };
  const text = fs.readFileSync(filePath, 'utf8');
  const code = Number((text.match(/versionCode\s*=\s*(\d+)/) || [])[1] || 125);
  const name = (text.match(/versionName\s*=\s*([0-9.]+)/) || [])[1] || '1.2.5';
  return { versionCode: code, versionName: name };
}

function writeProps(filePath, versionCode, versionName) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const body =
    `# Android Version Configuration\n` +
    `# Bumped by scripts/bump-version.cjs — do not use date-based versions.\n` +
    `versionCode=${versionCode}\n` +
    `versionName=${versionName}\n`;
  fs.writeFileSync(filePath, body, 'utf8');
}

function parseSemver(name) {
  const m = String(name).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return { major: 1, minor: 2, patch: 5 };
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bump(name, type) {
  const v = parseSemver(name);
  if (type === 'major') {
    v.major += 1;
    v.minor = 0;
    v.patch = 0;
  } else if (type === 'minor') {
    v.minor += 1;
    v.patch = 0;
  } else {
    // patch (default)
    v.patch += 1;
  }
  return formatSemver(v);
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--ci');
  const ci = process.argv.includes('--ci');
  const cmd = args[0] || 'show';

  const current = readProps(propsPaths[0]);
  let nextCode = current.versionCode;
  let nextName = current.versionName;

  if (cmd === 'show' || cmd === 'print') {
    console.log(`${current.versionName} (${current.versionCode})`);
    if (ci) {
      appendGitHub(current.versionCode, current.versionName);
    }
    return;
  }

  if (cmd === 'set') {
    const forced = args[1];
    if (!forced || !/^\d+\.\d+\.\d+/.test(forced)) {
      console.error('Usage: node scripts/bump-version.cjs set 1.4.0');
      process.exit(1);
    }
    nextName = forced.match(/^\d+\.\d+\.\d+/)[0];
    nextCode = current.versionCode + 1;
  } else if (['patch', 'minor', 'major'].includes(cmd)) {
    nextName = bump(current.versionName, cmd);
    nextCode = current.versionCode + 1;
  } else {
    console.error('Unknown command. Use: show | patch | minor | major | set x.y.z');
    process.exit(1);
  }

  for (const p of propsPaths) {
    writeProps(p, nextCode, nextName);
  }

  // Keep package.json version in sync (name only)
  try {
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      pkg.version = nextName;
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
  } catch (e) {
    console.warn('Could not update package.json version:', e.message);
  }

  // Keep src/services/updateService.ts in sync (CURRENT_APP_VERSION and CURRENT_BUILD_NUMBER)
  try {
    if (fs.existsSync(updateServicePath)) {
      let content = fs.readFileSync(updateServicePath, 'utf8');
      content = content.replace(
        /export const CURRENT_APP_VERSION = '[^']+';/,
        `export const CURRENT_APP_VERSION = '${nextName}';`
      );
      content = content.replace(
        /export const CURRENT_BUILD_NUMBER = \d+;/,
        `export const CURRENT_BUILD_NUMBER = ${nextCode};`
      );
      fs.writeFileSync(updateServicePath, content, 'utf8');
    }
  } catch (e) {
    console.warn('Could not update updateService.ts version:', e.message);
  }

  // Keep server.ts version in sync
  try {
    if (fs.existsSync(serverPath)) {
      let content = fs.readFileSync(serverPath, 'utf8');
      content = content.replace(
        /version:\s*"[^"]*"/,
        `version: "${nextName}"`
      );
      fs.writeFileSync(serverPath, content, 'utf8');
    }
  } catch (e) {
    console.warn('Could not update server.ts version:', e.message);
  }

  console.log(`✅ ${current.versionName} (${current.versionCode}) → ${nextName} (${nextCode})`);

  if (ci) {
    appendGitHub(nextCode, nextName);
  }
}

function appendGitHub(versionCode, versionName) {
  const envLine = (k, v) => `${k}=${v}\n`;
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(
      process.env.GITHUB_ENV,
      envLine('VERSION_CODE', versionCode) + envLine('VERSION_NAME', versionName)
    );
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      envLine('version_code', versionCode) + envLine('version_name', versionName)
    );
  }
  console.log(`VERSION_NAME=${versionName}`);
  console.log(`VERSION_CODE=${versionCode}`);
}

main();
