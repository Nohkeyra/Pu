const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { DENSITIES } = require('./regenerate-icons.cjs');
const root = path.resolve(__dirname, '..');
const res = path.join(root, 'android/app/src/main/res');

async function pixels(file) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}
function brightRadius(data, info, useAlpha = false) {
  let radius = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if ((useAlpha ? data[i + 3] : Math.max(data[i], data[i + 1], data[i + 2])) > 110) {
      radius = Math.max(radius, Math.hypot(x - info.width / 2, y - info.height / 2));
    }
  }
  return radius;
}

test('the launcher master remains the exact owner-supplied neon image', () => {
  const source = fs.readFileSync(path.join(root, 'assets/launcher-logo.webp'));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'),
    'cb1044428d7d1c2fac7de03299ec9f28f7da4560ea76e1f5394740fb9ca8e1f7');
});

for (const [density, legacy, adaptive] of DENSITIES) {
  test(`${density}: legacy, adaptive and themed icons retain full artwork inside masks`, async () => {
    const dir = path.join(res, `mipmap-${density}`);
    for (const [name, size] of [['ic_launcher', legacy], ['ic_launcher_round', legacy],
      ['ic_launcher_foreground', adaptive], ['ic_launcher_background', adaptive], ['ic_launcher_monochrome', adaptive]]) {
      const meta = await sharp(path.join(dir, name + '.png')).metadata();
      assert.equal(meta.width, size, name);
      assert.equal(meta.height, size, name);
      assert.equal(meta.format, 'png', name);
    }
    const fg = await pixels(path.join(dir, 'ic_launcher_foreground.png'));
    assert.ok(brightRadius(fg.data, fg.info) <= adaptive * 33 / 108 + 1.5, 'luminous contour must fit Android safe circle');
    const mono = await pixels(path.join(dir, 'ic_launcher_monochrome.png'));
    assert.equal(mono.data[3], 0, 'themed icon cannot be an opaque photo rectangle');
    const visible = [...mono.data].filter((v, i) => i % 4 === 3 && v > 110).length;
    assert.ok(visible > adaptive * adaptive * .08 && visible < adaptive * adaptive * .4, 'visible logo stencil, not empty or solid');
    assert.ok(brightRadius(mono.data, mono.info, true) <= adaptive * 33 / 108 + 1.5);
    const round = await pixels(path.join(dir, 'ic_launcher_round.png'));
    assert.equal(round.data[3], 0, 'round legacy corners must be transparent');
  });
}

test('PWA maskable icons are opaque and retain the luminous logo inside their safe circle', async () => {
  for (const size of [48, 72, 96, 128, 192, 256, 512]) {
    const icon = await pixels(path.join(root, `public/assets/icons/icon-${size}.webp`));
    assert.equal(icon.info.width, size);
    assert.equal(icon.info.height, size);
    assert.equal(icon.data[3], 255, 'the browser supplies the mask, not baked transparent corners');
    assert.ok(brightRadius(icon.data, icon.info) <= size * .4 + 1.5);
  }
});

test('Android adaptive resources use their separate alpha stencil for themed icons', () => {
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    assert.match(fs.readFileSync(path.join(res, `mipmap-anydpi-v26/${name}.xml`), 'utf8'),
      /<monochrome android:drawable="@mipmap\/ic_launcher_monochrome"/);
  }
});

test('onboarding mask preserves the closed logo body while removing its photographed wall', async () => {
  const mask = await pixels(path.join(root, 'public/assets/illustrations/wawasan-native-neon-mask.webp'));
  assert.equal(mask.data[3], 0);
  const center = (Math.floor(mask.info.height / 2) * mask.info.width + Math.floor(mask.info.width / 2)) * 4;
  assert.ok(mask.data[center + 3] > 245, 'the body remains opaque behind the tubes');
  const source = await sharp(path.join(root, 'assets/launcher-logo.webp')).resize(mask.info.width, mask.info.height).removeAlpha().raw().toBuffer();
  let bright = 0, cut = 0;
  for (let i = 0; i < mask.info.width * mask.info.height; i++) {
    if (Math.max(source[i * 3], source[i * 3 + 1], source[i * 3 + 2]) > 210) {
      bright++;
      if (mask.data[i * 4 + 3] < 180) cut++;
    }
  }
  assert.ok(bright > 1000);
  assert.ok(cut / bright < .001, 'retain the owner-supplied luminous artwork');
});

test('FCM uses the transparent stencil rather than the opaque launcher photograph', () => {
  assert.match(fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8'),
    /default_notification_icon"\s+android:resource="@mipmap\/ic_launcher_monochrome"/);
});
