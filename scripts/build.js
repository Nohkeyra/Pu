import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function build() {
  const root = process.cwd();
  const dist = path.join(root, 'dist');

  console.log('🚀 Starting build process...');

  try {
    // 1. Clean dist
    if (fs.existsSync(dist)) {
      console.log('🧹 Cleaning existing dist directory...');
      fs.rmSync(dist, { recursive: true, force: true });
    }
    fs.mkdirSync(dist, { recursive: true });

    // 2. Run Vite build (client -> dist)
    console.log('📦 Running Vite build...');
    execSync('npx vite build', { stdio: 'inherit' });

    // 3. Run esbuild for server (-> dist/server.cjs)
    console.log('🖥️ Bundling server with esbuild...');
    execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit' });

    // 4. Verification
    console.log('🔍 Verifying build artifacts...');
    const requiredFiles = [
      path.join(dist, 'index.html'),
      path.join(dist, 'server.cjs'),
    ];

    const missingFiles = requiredFiles.filter((f) => !fs.existsSync(f));
    if (missingFiles.length > 0) {
      throw new Error(`Build artifacts missing: ${missingFiles.join(', ')}`);
    }

    const stats = fs.readdirSync(dist);
    console.log(`✅ Build successful! Produced ${stats.length} items in dist/ (including index.html, assets, server.cjs).`);

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
