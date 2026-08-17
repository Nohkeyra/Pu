import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  const root = process.cwd();
  const dist = path.join(root, 'dist');
  const client = path.join(dist, 'client');

  console.log('🚀 Starting build process...');

  try {
    // 1. Clean dist
    if (fs.existsSync(dist)) {
      console.log('🧹 Cleaning existing dist directory...');
      fs.rmSync(dist, { recursive: true, force: true });
    }
    fs.mkdirSync(dist, { recursive: true });

    // 2. Run Vite build (client -> dist/client)
    console.log('📦 Running Vite build...');
    execSync('npx vite build', { stdio: 'inherit' });

    // 3. Run esbuild for server (-> dist/server.cjs)
    console.log('🖥️ Bundling server with esbuild...');
    execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit' });

    // 4. Mirror client files to top-level dist/ so artifact uploader finds index.html directly
    if (fs.existsSync(client)) {
      console.log('📋 Mirroring client files to top-level dist/ for artifact validation...');
      fs.readdirSync(client).forEach((item) => {
        const srcPath = path.join(client, item);
        const destPath = path.join(dist, item);
        copyRecursiveSync(srcPath, destPath);
      });
    }

    // 5. Verification
    console.log('🔍 Verifying build artifacts...');
    const requiredFiles = [
      path.join(dist, 'index.html'),
      path.join(dist, 'server.cjs'),
      path.join(client, 'index.html')
    ];

    const missingFiles = requiredFiles.filter((f) => !fs.existsSync(f));
    if (missingFiles.length > 0) {
      throw new Error(`Build artifacts missing: ${missingFiles.join(', ')}`);
    }

    const stats = fs.readdirSync(dist);
    console.log(`✅ Build successful! Produced ${stats.length} top-level items in dist/ (index.html, assets, server.cjs, client/).`);

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
