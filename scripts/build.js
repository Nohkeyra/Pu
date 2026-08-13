import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const client = path.join(dist, 'client');

console.log('🧹 Cleaning dist...');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(client, { recursive: true });

console.log('📦 Building Vite client → dist/client');
execSync('npx vite build', { stdio: 'inherit' });

console.log('⚙️  Bundling server → dist/server.cjs');
execSync(
  'npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs',
  { stdio: 'inherit' }
);

const leaked = fs.readdirSync(client).filter(f => f.endsWith('.cjs'));
if (leaked.length) {
  console.error('❌ Server artifacts leaked into webDir:', leaked);
  process.exit(1);
}

const required = [
  path.join(client, 'index.html'),
  path.join(client, 'assets'),
  path.join(dist, 'server.cjs'),
];
const missing = required.filter(p => !fs.existsSync(p));
if (missing.length) {
  console.error('❌ Missing artifacts:', missing.join(', '));
  process.exit(1);
}

console.log('✅ Build successful!');
