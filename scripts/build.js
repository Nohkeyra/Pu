import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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
    // vite creates dist/client itself (outDir + emptyOutDir), but esbuild's
    // --outfile needs dist/ to exist first since it writes dist/server.cjs
    // as a sibling of dist/client, not inside it.
    fs.mkdirSync(dist, { recursive: true });

    // 2. Run Vite build (client only -> dist/client)
    console.log('📦 Running Vite build (client)...');
    execSync('npx vite build', { stdio: 'inherit' });

    // 3. Run esbuild for server (-> dist/server.cjs, sibling of dist/client)
    console.log('🖥️ Bundling server with esbuild...');
    execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit' });

    // 4. Verification
    console.log('🔍 Verifying build artifacts...');
    const requiredClientFiles = ['index.html', 'assets'];
    const missingFiles = [];

    for (const file of requiredClientFiles) {
      if (!fs.existsSync(path.join(client, file))) {
        missingFiles.push(`client/${file}`);
      }
    }
    if (!fs.existsSync(path.join(dist, 'server.cjs'))) {
      missingFiles.push('server.cjs');
    }

    if (missingFiles.length > 0) {
      throw new Error(`Build artifacts missing: ${missingFiles.join(', ')}`);
    }

    const stats = fs.readdirSync(dist);
    console.log(`✅ Build successful! Produced ${stats.length} items in dist/ (client/ + server.cjs).`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
