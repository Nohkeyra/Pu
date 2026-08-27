const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function regenerateIcons() {
  const logoPath = path.join(__dirname, '..', 'public', 'assets', 'brand', 'wawasan_logo.png');
  const iconsDir = path.join(__dirname, '..', 'public', 'assets', 'icons');

  if (!fs.existsSync(logoPath)) {
    console.error('❌ Base logo not found at:', logoPath);
    process.exit(1);
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [48, 72, 96, 128, 192, 256, 512];

  console.log('🔄 Regenerating high-quality PWA icons from brand logo...');

  for (const size of sizes) {
    // Calculate inner logo size with 15% padding for maskable/icon appearance
    const innerSize = Math.round(size * 0.78);
    
    const resizedLogo = await sharp(logoPath)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    // Create a rich warm background / dark luxury card background or clean white/transparent with rounded corners
    const canvas = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 24, g: 24, b: 27, alpha: 1 } // #18181b rich dark slate / brand neutral
      }
    });

    const compositeIcon = await canvas
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png({ quality: 100 })
      .toBuffer();

    // Save as webp
    const webpDest = path.join(iconsDir, `icon-${size}.webp`);
    await sharp(compositeIcon)
      .webp({ quality: 90 })
      .toFile(webpDest);

    // Also save as png just in case
    const pngDest = path.join(iconsDir, `icon-${size}.png`);
    await sharp(compositeIcon)
      .png({ quality: 100 })
      .toFile(pngDest);

    console.log(`✓ Generated icon-${size}.webp & icon-${size}.png`);
  }

  console.log('🎉 Successfully regenerated all PWA pop icons in public/assets/icons/!');
}

regenerateIcons().catch(err => {
  console.error('❌ Failed to regenerate icons:', err);
  process.exit(1);
});
