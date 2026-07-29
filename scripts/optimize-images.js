#!/usr/bin/env node
/**
 * Image Optimization Build Script
 * 
 * Run before production builds to compress images in public/assets/.
 * Requires: npm install -D sharp
 * 
 * Usage: node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('❌ sharp is not installed. Run: npm install -D sharp');
    process.exit(1);
  }

  const assetsDir = path.join(__dirname, '..', 'public', 'assets');
  const files = fs.readdirSync(assetsDir).filter(f => 
    /\.(jpe?g|png)$/i.test(f)
  );

  let totalSaved = 0;

  for (const file of files) {
    const inputPath = path.join(assetsDir, file);
    const tempPath = inputPath + '.tmp';
    const origSize = fs.statSync(inputPath).size;

    const img = sharp(inputPath);
    const metadata = await img.metadata();

    // Resize if wider than 1400px
    let pipeline = img;
    if (metadata.width && metadata.width > 1400) {
      pipeline = pipeline.resize(1400, null, { withoutEnlargement: true });
    }

    // Optimize based on format
    if (/\.png$/i.test(file)) {
      await pipeline.png({ quality: 80, compressionLevel: 9 }).toFile(tempPath);
    } else {
      await pipeline.jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(tempPath);
    }

    const newSize = fs.statSync(tempPath).size;
    const saved = origSize - newSize;
    const pct = ((saved / origSize) * 100).toFixed(1);

    if (saved > 0) {
      fs.renameSync(tempPath, inputPath);
      totalSaved += saved;
      console.log(`✓ ${file}: ${(origSize/1024/1024).toFixed(2)}MB → ${(newSize/1024/1024).toFixed(2)}MB (${pct}% smaller)`);
    } else {
      fs.unlinkSync(tempPath);
      console.log(`- ${file}: already optimized`);
    }
  }

  console.log(`\n🎉 Total saved: ${(totalSaved/1024/1024).toFixed(1)}MB`);
}

optimizeImages().catch(console.error);
