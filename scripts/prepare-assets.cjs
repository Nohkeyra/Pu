#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function run() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const logoPath = path.join(__dirname, '..', 'public', 'assets', 'wawasan_logo.png');
  const batikPath = path.join(__dirname, '..', 'public', 'assets', 'batik_pattern_hd.jpg');

  console.log('Generating master assets for Capacitor Asset tool...');

  // 1. icon-only.png (1024x1024, logo centered on a solid white background)
  await sharp(logoPath)
    .resize(600, 600, { fit: 'inside' })
    .toBuffer()
    .then(async (logoBuffer) => {
      await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toFile(path.join(assetsDir, 'icon-only.png'));
    });

  // 2. icon-foreground.png (1024x1024, smaller centered transparent logo for adaptive icons)
  await sharp(logoPath)
    .resize(400, 400, { fit: 'inside' })
    .toBuffer()
    .then(async (logoBuffer) => {
      await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toFile(path.join(assetsDir, 'icon-foreground.png'));
    });

  // 3. icon-background.png (1024x1024, solid white background for adaptive icons)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .png()
  .toFile(path.join(assetsDir, 'icon-background.png'));

  // 4. splash.png (2732x2732, batik pattern background with centered logo)
  await sharp(batikPath)
    .resize(2732, 2732, { fit: 'cover' })
    .toBuffer()
    .then(async (bgBuffer) => {
      const logoBuffer = await sharp(logoPath)
        .resize(800, 800, { fit: 'inside' })
        .toBuffer();

      await sharp(bgBuffer)
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png()
        .toFile(path.join(assetsDir, 'splash.png'));

      // 5. splash-dark.png (2732x2732, copy of the splash background)
      await sharp(bgBuffer)
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png()
        .toFile(path.join(assetsDir, 'splash-dark.png'));
    });

  console.log('✅ All master assets generated perfectly in /assets/!');
}

run().catch(err => {
  console.error('Error generating master assets:', err);
  process.exit(1);
});
