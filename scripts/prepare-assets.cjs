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

  // 1. icon-only.png (1024x1024, full logo centered on a 100% transparent background)
  const trimmedLogoBuffer = await sharp(activeLogoPath).trim().toBuffer();
  
  const iconOnlyLogo = await sharp(trimmedLogoBuffer)
    .resize(900, 900, { fit: 'inside', kernel: 'lanczos3' })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: iconOnlyLogo, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, 'icon-only.png'));

  // 2. icon-foreground.png (1024x1024, transparent background for Android adaptive icons)
  // Scaled to fit within the Android adaptive icon safe zone (680x680 inside 1024x1024 canvas = ~66% safe diameter)
  const iconFgLogo = await sharp(trimmedLogoBuffer)
    .resize(680, 680, { fit: 'inside', kernel: 'lanczos3' })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: iconFgLogo, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, 'icon-foreground.png'));

  // 3. icon-background.png (1024x1024, pure white background #FFFFFF)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, 'icon-background.png'));

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

  // 6. Direct generation of Android mipmap icons
  const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidResDir)) {
    const densities = [
      { name: 'mipmap-mdpi', legacySize: 48, adaptiveSize: 108 },
      { name: 'mipmap-hdpi', legacySize: 72, adaptiveSize: 162 },
      { name: 'mipmap-xhdpi', legacySize: 96, adaptiveSize: 216 },
      { name: 'mipmap-xxhdpi', legacySize: 144, adaptiveSize: 324 },
      { name: 'mipmap-xxxhdpi', legacySize: 192, adaptiveSize: 432 }
    ];

    console.log('Generating crisp Android mipmap launcher icons...');

    for (const d of densities) {
      const targetDir = path.join(androidResDir, d.name);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // (a) ic_launcher_foreground.png (Adaptive icon foreground, 108dp base, logo in safe 66% zone)
      const fgInnerSize = Math.round(d.adaptiveSize * 0.66);
      const fgLogo = await sharp(trimmedLogoBuffer)
        .resize(fgInnerSize, fgInnerSize, { fit: 'inside', kernel: 'lanczos3' })
        .toBuffer();

      await sharp({
        create: {
          width: d.adaptiveSize,
          height: d.adaptiveSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([{ input: fgLogo, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

      // (b) ic_launcher_background.png (Pure white solid #FFFFFF)
      await sharp({
        create: {
          width: d.adaptiveSize,
          height: d.adaptiveSize,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_background.png'));

      // (c) ic_launcher.png (Legacy square launcher icon with elegant rounded corners on white canvas)
      const legacyInnerSize = Math.round(d.legacySize * 0.82);
      const legacyLogo = await sharp(trimmedLogoBuffer)
        .resize(legacyInnerSize, legacyInnerSize, { fit: 'inside', kernel: 'lanczos3' })
        .toBuffer();

      // Rounded rect mask for legacy icon
      const cornerRadius = Math.round(d.legacySize * 0.2);
      const rectSvg = Buffer.from(
        `<svg width="${d.legacySize}" height="${d.legacySize}">
          <rect x="0" y="0" width="${d.legacySize}" height="${d.legacySize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#FFFFFF"/>
        </svg>`
      );

      const legacyBg = await sharp(rectSvg).png().toBuffer();

      await sharp(legacyBg)
        .composite([{ input: legacyLogo, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(targetDir, 'ic_launcher.png'));

      // (d) ic_launcher_round.png (Legacy round launcher icon with circular white badge)
      const circleSvg = Buffer.from(
        `<svg width="${d.legacySize}" height="${d.legacySize}">
          <circle cx="${d.legacySize / 2}" cy="${d.legacySize / 2}" r="${d.legacySize / 2}" fill="#FFFFFF"/>
        </svg>`
      );

      const roundBg = await sharp(circleSvg).png().toBuffer();
      const roundInnerSize = Math.round(d.legacySize * 0.76);
      const roundLogo = await sharp(trimmedLogoBuffer)
        .resize(roundInnerSize, roundInnerSize, { fit: 'inside', kernel: 'lanczos3' })
        .toBuffer();

      await sharp(roundBg)
        .composite([{ input: roundLogo, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(targetDir, 'ic_launcher_round.png'));

      console.log(`✓ Generated ${d.name} launcher icons (adaptive: ${d.adaptiveSize}px, legacy: ${d.legacySize}px)`);
    }
  }

  console.log('✅ All master assets and Android launcher icons generated successfully!');
}

run().catch(err => {
  console.error('Error generating master assets:', err);
  process.exit(1);
});

