import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import fs from 'fs';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { platformOptimizerMiddleware, detectServerPlatform } from './server/platformDetector.js';
import { getFirestore } from './server/firebaseAdmin.js';

import authRoutes from './server/routes/authRoutes.js';
import orderRoutes from './server/routes/orderRoutes.js';
import menuRoutes from './server/routes/menuRoutes.js';
import updateRoutes from './server/routes/updateRoutes.js';
import invoiceRoutes from './server/routes/invoiceRoutes.js';
import diagnosticRoutes from './server/routes/diagnosticRoutes.js';
import widgetRoutes from './server/routes/widgetRoutes.js';
import imageRoutes, { antiHotlinkGuard } from './server/routes/imageRoutes.js';

dotenv.config();

const ALLOWED_ORIGINS = [
  'https://restoran-wawasan-bio.onrender.com',
  'https://restoran-wawasan.pxxl.click',
  'http://localhost:3000',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  ...(process.env.ADDITIONAL_ALLOWED_ORIGINS
    ? process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : []),
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // SECURITY FIX: Removed broad .google.com / .web.app / .firebaseapp.com wildcards
  // that allowed any subdomain (including attacker-owned ones) to bypass CORS.
  const ALLOWED_HOSTS = new Set([
    'aistudio.google.com',
    'ai.studio',
    'claude.ai',
    'anthropic.com',
    'localhost',
    '127.0.0.1',
  ]);

  if (ALLOWED_HOSTS.has(hostname)) return true;

  if (hostname.endsWith('.onrender.com')) return true;
  if (hostname.endsWith('.run.app')) return true;
  if (hostname.endsWith('.aistudio.google.com')) return true;
  if (hostname.endsWith('.claude.ai')) return true;
  if (hostname.endsWith('.anthropic.com')) return true;

  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  app.use(compression() as any);
  app.set('trust proxy', 1);

  app.use(platformOptimizerMiddleware);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
      xFrameOptions: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );

  const apiLimiter = rateLimit({ windowMs: 60_000, max: 120 });
  app.use('/api/', apiLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth', authLimiter);

  // SECURITY FIX: Reduced from 50mb to 5mb general limit.
  app.use(express.json({ limit: '5mb' }));

  // Anti-hotlink protection for static images
  app.use(antiHotlinkGuard);

  const healthCheckHandler = async (req: express.Request, res: express.Response) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    const detectedPlatform = (req as any).detectedPlatform || detectServerPlatform(req);

    let dbStatus: 'connected' | 'disconnected' | 'optional' = 'optional';
    let dbError: string | undefined;
    try {
      const db = getFirestore();
      if (db) {
        await Promise.race([
          db.collection('meta').limit(1).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database response timeout')), 2000))
        ]);
        dbStatus = 'connected';
      }
    } catch (err: any) {
      dbStatus = 'disconnected';
      dbError = err?.message || String(err);
    }

    function getDiskStatus() {
      try {
        if (process.platform === 'win32') {
          return { status: 'unsupported', platform: 'win32' };
        }
        const stats = fs.statfsSync('/');
        const total = Number(stats.blocks) * Number(stats.bsize);
        const free  = Number(stats.bavail)  * Number(stats.bsize);
        const used  = total - free;

        if (!Number.isFinite(total) || total <= 0) {
          return { status: 'unavailable' };
        }

        const usedPercentage = Number(((used / total) * 100).toFixed(1));

        return {
          status: usedPercentage > 98 ? 'critical' : usedPercentage > 85 ? 'warning' : 'ok',
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          usedPercentage: usedPercentage,
          error: undefined
        };
      } catch (err) {
        return { status: 'error', error: (err as Error).message };
      }
    }
    const diskStatus = getDiskStatus();

    res.status(200).json({
      status: 'ok',
      platform: detectedPlatform,
      service: {
        name: 'restoran-wawasan-backend',
        status: 'running',
        uptime,
        timestamp
      },
      database: {
        status: dbStatus,
        ...(dbError ? { error: dbError } : {})
      },
      disk: diskStatus
    });
  };

  app.get('/health', healthCheckHandler);
  app.get('/api/health', healthCheckHandler);

  app.get('/', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'client'))
        ? path.join(process.cwd(), 'dist', 'client')
        : path.join(process.cwd(), 'dist');
      const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(process.cwd(), 'dist', 'index.html');

      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }

    next();
  });

  // Route handlers (exact paths mapped inside routers)
  app.use('/api', authRoutes);
  app.use('/api', orderRoutes);
  app.use('/api', menuRoutes);
  app.use('/api', updateRoutes);
  app.use('/api', invoiceRoutes);
  app.use('/api', diagnosticRoutes);
  app.use('/api', widgetRoutes);
  app.use('/api', imageRoutes);

  app.use('/api/*', (req: express.Request, res: express.Response) => {
    const requestId = (req as any).requestId || req.headers['x-request-id'];
    return res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      requestId
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const clientSubDir = path.join(process.cwd(), 'dist', 'client');
    const distPath = fs.existsSync(path.join(clientSubDir, 'index.html'))
      ? clientSubDir
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(process.cwd(), 'dist', 'index.html');
      res.sendFile(indexPath);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = (req as any).requestId || req.headers['x-request-id'];
    console.error(`[GlobalError] [ReqID: ${requestId}]`, err);
    const statusCode = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
    return res.status(statusCode).json({
      success: false,
      error: err?.message || 'Internal Server Error',
      requestId
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

startServer();
