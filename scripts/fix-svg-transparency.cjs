const fs = require('fs');
const sharp = require('sharp');

async function processSvg() {
  const svgPath = 'wawasan_logo_pack.svg';
  let svgContent = fs.readFileSync(svgPath, 'utf8');

  const regex = /href="(data:image\/webp;base64,[^"]+)"/g;
  let match;
  let matches = [];
  while ((match = regex.exec(svgContent)) !== null) {
    matches.push(match[1]);
  }

  console.log(`Found ${matches.length} frames in SVG.`);

  for (let i = 0; i < matches.length; i++) {
    const dataUri = matches[i];
    const base64Data = dataUri.replace(/^data:image\/webp;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const image = sharp(buffer).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let p = 0; p < data.length; p += 4) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      
      const dist = Math.sqrt((255-r)*(255-r) + (255-g)*(255-g) + (255-b)*(255-b));
      if (dist < 35) {
        data[p + 3] = 0;
      } else if (dist < 60) {
        const alphaFactor = (dist - 35) / (60 - 35);
        data[p + 3] = Math.round(data[p + 3] * alphaFactor);
      }
    }

    const newBuffer = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .webp({ quality: 90 })
    .toBuffer();

    const newBase64 = `data:image/webp;base64,${newBuffer.toString('base64')}`;
    svgContent = svgContent.replace(dataUri, newBase64);
    console.log(`Processed frame ${i + 1}/${matches.length}`);
  }

  fs.writeFileSync('public/wawasan_logo_pack.svg', svgContent, 'utf8');
  fs.writeFileSync('wawasan_logo_pack.svg', svgContent, 'utf8');
  console.log('Successfully updated wawasan_logo_pack.svg with transparency!');
}

processSvg().catch(console.error);
