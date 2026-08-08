import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import { platformOptimizerMiddleware, detectServerPlatform } from './server/platformDetector.js';

// Import modular API routers
import authRoutes from './server/routes/authRoutes.js';
import orderRoutes from './server/routes/orderRoutes.js';
import menuRoutes from './server/routes/menuRoutes.js';
import updateRoutes from './server/routes/updateRoutes.js';
import invoiceRoutes from './server/routes/invoiceRoutes.js';
import diagnosticRoutes from './server/routes/diagnosticRoutes.js';
import widgetRoutes from './server/routes/widgetRoutes.js';

dotenv.config();

const ALLOWED_ORIGINS = [
  'https://restoran-wawasan-bio.onrender.com',
  'https://restoran-wawasan.pxxl.click',
  'http://localhost:3000',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];

const TRUSTED_ORIGIN_SUFFIXES = ['.run.app', '.ai.studio', '.google.com'];
const TRUSTED_ORIGIN_HOSTS = ['run.app', 'ai.studio', 'google.com'];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (TRUSTED_ORIGIN_HOSTS.includes(hostname)) return true;
  if (TRUSTED_ORIGIN_SUFFIXES.some(suffix => hostname.endsWith(suffix))) return true;

  if (/^https:\/\/ais-(dev|pre)-[a-z0-9-]+\.asia-southeast1\.run\.app$/.test(origin)) return true;
  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(compression() as any);
  app.set('trust proxy', 1);

  app.use(platformOptimizerMiddleware);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '50mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      platform: (req as any).detectedPlatform || detectServerPlatform(req),
      timestamp: new Date().toISOString()
    });
  });

  // Mount Modular API Routers
  app.use('/api/admin', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api', orderRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api', updateRoutes);
  app.use('/api', invoiceRoutes);
  app.use('/api', diagnosticRoutes);
  app.use('/api/widget', widgetRoutes);

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
