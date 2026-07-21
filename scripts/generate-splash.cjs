const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.resolve(__dirname, '../public/assets/wawasan_logo.jpg');
const BG_COLOR = '#052011'; // Deep forest green

const SPLASH_SIZES = [
  { path: 'android/app/src/main/res/drawable/splash.png', w: 1024, h: 1024, logoSize: 300 },
  { path: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320, logoSize: 120 },
  { path: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480, logoSize: 180 },
  { path: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720, logoSize: 250 },
  { path: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960, logoSize: 320 },
  { path: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280, logoSize: 400 },
  { path: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480, logoSize: 120 },
  { path: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800, logoSize: 180 },
  { path: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280, logoSize: 250 },
  { path: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600, logoSize: 320 },
  { path: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920, logoSize: 400 }
];

function generateSplash() {
  if (!fs.existsSync(LOGO_PATH)) {
    console.error(`❌ Logo not found at ${LOGO_PATH}`);
    process.exit(1);
  }

  console.log('🌅 Generating beautiful Android splash screens using ImageMagick...');

  for (const item of SPLASH_SIZES) {
    const dest = path.resolve(__dirname, '..', item.path);
    const dir = path.dirname(dest);
    
    // Ensure parent directory exists
    fs.mkdirSync(dir, { recursive: true });

    // Compose the ImageMagick convert command
    // This creates a canvas of BG_COLOR, resizes the logo, and centers it over the canvas
    const cmd = `convert -size ${item.w}x${item.h} xc:"${BG_COLOR}" \\( "${LOGO_PATH}" -resize ${item.logoSize}x${item.logoSize} \\) -gravity center -composite "${dest}"`;

    console.log(`  -> Creating ${item.path} (${item.w}x${item.h})...`);
    try {
      execSync(cmd);
    } catch (err) {
      console.error(`❌ Failed to generate ${item.path}:`, err.message);
    }
  }

  console.log('✅ All splash screens generated successfully!');
}

generateSplash();
