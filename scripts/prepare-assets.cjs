#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function run() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const logoPath = path.join(__dirname, '..', 'public', 'assets', 'brand', 'apk_logo_clean.png');
  const fallbackLogoPath = path.join(__dirname, '..', 'public', 'assets', 'brand', 'wawasan_logo.png');
  const activeLogoPath = fs.existsSync(logoPath) ? logoPath : fallbackLogoPath;
  const batikPath = path.join(__dirname, '..', 'public', 'assets', 'heritage', 'batik_pattern_hd.jpg');

  console.log('Generating master assets for Capacitor Asset tool...');
  console.log('Using logo source:', activeLogoPath);

  // 1. icon-only.png (1024x1024, full logo centered on a 100% transparent background)
  // Sizing: 880x880 fit inside ensures a prominent, bold logo with no surrounding card or background
  await sharp(activeLogoPath)
    .resize(880, 880, { fit: 'inside' })
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
      .toColorspace('srgb').png()
      .toFile(path.join(assetsDir, 'icon-only.png'));
    });

  // 2. icon-foreground.png (1024x1024, transparent background with full-fill logo for adaptive icons)
  // Scaled to fit within the Android adaptive icon safe zone (760x760) so no floral motifs or text get clipped
  await sharp(activeLogoPath)
    .resize(760, 760, { fit: 'inside' })
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
      .toColorspace('srgb').png()
      .toFile(path.join(assetsDir, 'icon-foreground.png'));
    });

  // 3. icon-background.png (1024x1024, 100% transparent background)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .toColorspace('srgb').png()
  .toFile(path.join(assetsDir, 'icon-background.png'));

  // 4. splash.png (2048x2048, batik pattern background with centered logo)
  await sharp(batikPath)
    .resize(2048, 2048, { fit: 'cover' })
    .toBuffer()
    .then(async (bgBuffer) => {
      const logoBuffer = await sharp(activeLogoPath)
        .resize(700, 700, { fit: 'inside' })
        .toBuffer();

      await sharp(bgBuffer)
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .toColorspace('srgb').png()
        .toFile(path.join(assetsDir, 'splash.png'));

      // 5. splash-dark.png (2048x2048, dark background overlay with centered logo)
      const darkOverlay = await sharp({
        create: {
          width: 2048,
          height: 2048,
          channels: 4,
          background: { r: 11, g: 8, b: 7, alpha: 0.85 } // #0B0807 with 85% opacity overlay over batik
        }
      }).png().toBuffer();

      await sharp(bgBuffer)
        .composite([
          { input: darkOverlay, gravity: 'center' },
          { input: logoBuffer, gravity: 'center' }
        ])
        .toColorspace('srgb').png()
        .toFile(path.join(assetsDir, 'splash-dark.png'));
    });

  console.log('✅ All master assets generated perfectly in /assets/!');
}

run().catch(err => {
  console.error('Error generating master assets:', err);
  process.exit(1);
});
