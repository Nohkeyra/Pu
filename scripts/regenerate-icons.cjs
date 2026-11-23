#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const BACKGROUND = '#080707';
const DENSITIES = [
  ['ldpi', 36, 81], ['mdpi', 48, 108], ['hdpi', 72, 162],
  ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432],
];

// Export packaging only: the owner's supplied on-state is never redrawn.
async function regenerateIcons(root = ROOT) {
  const source = path.join(root, 'assets/launcher-logo.webp');
  // Welcome artwork is selected independently from the approved launcher icon.
  const welcomeDay = path.join(root, 'assets/onboarding-sign-day.webp');
  const welcomeNight = path.join(root, 'assets/onboarding-sign-night.webp');
  const metadata = await sharp(source).metadata();
  if (metadata.width !== metadata.height) throw new Error('Launcher source must be square.');
  const icons = path.join(root, 'public/assets/icons');
  const res = path.join(root, 'android/app/src/main/res');
  await fs.mkdir(icons, { recursive: true });

  const square = async (size, imageScale = 1) => {
    const inner = Math.round(size * imageScale);
    // Feather only the black photographic margin, outside the luminous artwork,
    // so the resized photo cannot leave a hard inner rectangle in launcher masks.
    const edge = Buffer.from(`<svg width="${inner}" height="${inner}"><defs>
      <linearGradient id="x"><stop stop-color="white" stop-opacity="0"/><stop offset="3%" stop-color="white"/><stop offset="97%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>
      <linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset="3%" stop-color="white"/><stop offset="97%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>
      <mask id="edge"><rect width="100%" height="100%" fill="url(#y)"/></mask>
      </defs><rect width="100%" height="100%" fill="url(#x)" mask="url(#edge)"/></svg>`);
    const image = await sharp(source).resize(inner).composite([{ input: edge, blend: 'dest-in' }]).png().toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
      .composite([{ input: image, gravity: 'centre' }]).png().toBuffer();
  };
  const mask = (size, round) => Buffer.from(`<svg width="${size}" height="${size}">
    ${round ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>`
      : `<rect width="${size}" height="${size}" rx="${size * .2}" fill="white"/>`}</svg>`);
  const masked = async (size, scale, round) => sharp(await square(size, scale))
    .composite([{ input: mask(size, round), blend: 'dest-in' }]).png().toBuffer();

  // Derive a stencil from tube/body brightness, rather than exposing the opaque
  // photographic rectangle as Android's themed icon. The RGB artwork is intact.
  const radiance = async (size, stencil = false, photo = source) => {
    const { data, info } = await sharp(photo).resize(size, size).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixels = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < info.width * info.height; i++) {
      const offset = i * info.channels;
      const peak = Math.max(data[offset], data[offset + 1], data[offset + 2]);
      pixels[i * 4] = stencil ? 255 : data[offset];
      pixels[i * 4 + 1] = stencil ? 255 : data[offset + 1];
      pixels[i * 4 + 2] = stencil ? 255 : data[offset + 2];
      pixels[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (peak - 48) / 112)) * 255);
    }
    return sharp(pixels, { raw: { width: size, height: size, channels: 4 } });
  };
  const monochrome = async size => {
    const stencil = await (await radiance(Math.round(size * .62), true)).png().toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } })
      .composite([{ input: stencil, gravity: 'centre' }]).png().toBuffer();
  };

  // Android 108dp layers have a 66dp safe circle. The photograph at 62% keeps
  // its actual luminous contour inside that circle, checked by the asset test.
  await sharp(await square(1024, .9)).toFile(path.join(root, 'assets/icon-only.png'));
  await sharp(await square(1024, .62)).toFile(path.join(root, 'assets/icon-foreground.png'));
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BACKGROUND } })
    .png().toFile(path.join(root, 'assets/icon-background.png'));

  for (const [density, legacy, adaptive] of DENSITIES) {
    const dir = path.join(res, `mipmap-${density}`);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'ic_launcher.png'), await masked(legacy, .9, false));
    await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), await masked(legacy, .82, true));
    await fs.writeFile(path.join(dir, 'ic_launcher_foreground.png'), await square(adaptive, .62));
    await sharp({ create: { width: adaptive, height: adaptive, channels: 4, background: BACKGROUND } })
      .png().toFile(path.join(dir, 'ic_launcher_background.png'));
    await fs.writeFile(path.join(dir, 'ic_launcher_monochrome.png'), await monochrome(adaptive));
  }
  for (const size of [48, 72, 96, 128, 192, 256, 512]) {
    // PWA maskable icons are opaque with no baked rounded border.
    await sharp(await square(size, .82)).webp({ quality: 94, effort: 6 })
      .toFile(path.join(icons, `icon-${size}.webp`));
  }
  // Trace the closed physical rim in each supplied plate. Warm wall reflections
  // are not part of the board; retain only its largest connected silhouette.
  const boardSize = 640;
  const boardMask = async (photo, day) => {
    const data = await sharp(photo).resize(boardSize, boardSize).removeAlpha().raw().toBuffer();
    const blocked = new Uint8Array(boardSize * boardSize);
    const outside = new Uint8Array(boardSize * boardSize);
    const queue = new Int32Array(boardSize * boardSize);
    let head = 0, tail = 0;
    for (let y = 0; y < boardSize; y++) for (let x = 0; x < boardSize; x++) {
      const i = (y * boardSize + x) * 3;
      const low = Math.min(data[i], data[i + 1], data[i + 2]);
      const high = Math.max(data[i], data[i + 1], data[i + 2]);
      const tube = day ? low > 90 && high - low < 40 : low > 175;
      if (!tube) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (x + dx >= 0 && x + dx < boardSize && y + dy >= 0 && y + dy < boardSize) blocked[(y + dy) * boardSize + x + dx] = 1;
      }
    }
    const enqueue = index => {
      if (index >= 0 && !outside[index] && !blocked[index]) { outside[index] = 1; queue[tail++] = index; }
    };
    const neighbours = index => {
      const x = index % boardSize, y = (index - x) / boardSize;
      return [x ? index - 1 : -1, x < boardSize - 1 ? index + 1 : -1, y ? index - boardSize : -1, y < boardSize - 1 ? index + boardSize : -1];
    };
    for (let i = 0; i < boardSize; i++) for (const index of [i, (boardSize - 1) * boardSize + i, i * boardSize, i * boardSize + boardSize - 1]) enqueue(index);
    while (head < tail) for (const next of neighbours(queue[head++])) enqueue(next);

    const visited = new Uint8Array(outside.length);
    let largest = [];
    for (let i = 0; i < outside.length; i++) {
      if (outside[i] || visited[i]) continue;
      head = 0; tail = 1; queue[0] = i; visited[i] = 1;
      while (head < tail) {
        for (const next of neighbours(queue[head++])) {
          if (next >= 0 && !outside[next] && !visited[next]) { visited[next] = 1; queue[tail++] = next; }
        }
      }
      if (tail > largest.length) largest = Array.from(queue.subarray(0, tail));
    }
    const coverage = largest.length / outside.length;
    if (coverage < .4 || coverage > .7) throw new Error(`Welcome ${day ? 'day' : 'night'} rim is not closed; inspect the source before exporting.`);
    const board = Buffer.alloc(boardSize * boardSize * 4);
    for (const i of largest) { board[i * 4] = board[i * 4 + 1] = board[i * 4 + 2] = board[i * 4 + 3] = 255; }
    return sharp(board, { raw: { width: boardSize, height: boardSize, channels: 4 } }).blur(.5)
      .webp({ lossless: true, effort: 6 });
  };
  const illustrations = path.join(root, 'public/assets/illustrations');
  await (await boardMask(welcomeNight, false)).toFile(path.join(illustrations, 'wawasan-native-neon-mask.webp'));
  await (await boardMask(welcomeDay, true)).toFile(path.join(illustrations, 'wawasan-native-neon-day-mask.webp'));
  await sharp(welcomeNight).resize(960, 960).webp({ quality: 91, effort: 6 })
    .toFile(path.join(illustrations, 'wawasan-native-neon.webp'));
  await (await radiance(320, false, welcomeNight)).webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(path.join(illustrations, 'wawasan-native-neon-spill.webp'));
  await sharp(welcomeDay).resize(960, 960)
    .webp({ quality: 91, effort: 6 }).toFile(path.join(illustrations, 'wawasan-native-neon-unlit.webp'));
  await fs.writeFile(path.join(res, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BACKGROUND}</color>\n</resources>\n`);
  console.log('Generated launcher assets and the owner-supplied day/night welcome plates.');
}

module.exports = { regenerateIcons, DENSITIES };
if (require.main === module) regenerateIcons().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
