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

  console.log('Generating master assets and Android launcher icons...');
  console.log('Using logo source:', activeLogoPath);

  // Both entry points share the same source and launcher export pipeline.
  await require('./regenerate-icons.cjs').regenerateIcons();
  const trimmedLogoBuffer = await sharp(activeLogoPath).trim().toBuffer();

  // 4. splash.png (2048x2048, batik pattern background with centered logo)
  if (fs.existsSync(batikPath)) {
    const bgBuffer = await sharp(batikPath)
      .resize(2048, 2048, { fit: 'cover' })
      .toBuffer();

    const splashLogoBuffer = await sharp(trimmedLogoBuffer)
      .resize(800, 800, { fit: 'inside', kernel: 'lanczos3' })
      .toBuffer();

    await sharp(bgBuffer)
      .composite([{ input: splashLogoBuffer, gravity: 'center' }])
      .png({ compressionLevel: 8 })
      .toFile(path.join(assetsDir, 'splash.png'));

    // 5. splash-dark.png (2048x2048, dark overlay over batik with centered logo)
    const darkOverlay = await sharp({
      create: {
        width: 2048,
        height: 2048,
        channels: 4,
        background: { r: 11, g: 8, b: 7, alpha: 0.88 }
      }
    }).png().toBuffer();

    await sharp(bgBuffer)
      .composite([
        { input: darkOverlay, gravity: 'center' },
        { input: splashLogoBuffer, gravity: 'center' }
      ])
      .png({ compressionLevel: 8 })
      .toFile(path.join(assetsDir, 'splash-dark.png'));
  }

  console.log('✅ All master assets and Android launcher icons generated successfully!');
}

run().catch(err => {
  console.error('Error generating master assets:', err);
  process.exit(1);
});

