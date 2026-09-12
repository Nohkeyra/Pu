const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function regenerateIcons() {
  const logoPath = path.join(__dirname, '..', 'public', 'assets', 'brand', 'apk_logo_clean.png');
  const fallbackLogoPath = path.join(__dirname, '..', 'public', 'assets', 'brand', 'wawasan_logo.png');
  const activeLogoPath = fs.existsSync(logoPath) ? logoPath : fallbackLogoPath;
  const iconsDir = path.join(__dirname, '..', 'public', 'assets', 'icons');

  if (!fs.existsSync(activeLogoPath)) {
    console.error('❌ Base logo not found at:', activeLogoPath);
    process.exit(1);
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [48, 72, 96, 128, 192, 256, 512];

  console.log('🔄 Regenerating high-quality PWA icons from clean brand logo...');

  const trimmedLogoBuffer = await sharp(activeLogoPath).trim().toBuffer();

  for (const size of sizes) {
    // Calculate inner logo size with proper safe padding for maskable appearance
    const innerSize = Math.round(size * 0.80);
    
    const resizedLogo = await sharp(trimmedLogoBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .toBuffer();

    // Create a pristine white rounded background for web app icon clarity
    const cornerRadius = Math.round(size * 0.22);
    const rectSvg = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#FFFFFF"/>
      </svg>`
    );

    const canvas = await sharp(rectSvg).png().toBuffer();

    const compositeIcon = await sharp(canvas)
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png({ quality: 100 })
      .toBuffer();

    // Save as webp
    const webpDest = path.join(iconsDir, `icon-${size}.webp`);
    await sharp(compositeIcon)
      .webp({ quality: 95, effort: 6 })
      .toFile(webpDest);

    console.log(`✓ Generated icon-${size}.webp`);
  }

  console.log('🎉 Successfully regenerated all PWA icons (.webp) in public/assets/icons/!');
}

regenerateIcons().catch(err => {
  console.error('❌ Failed to regenerate icons:', err);
  process.exit(1);
});

