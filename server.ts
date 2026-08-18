import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { platformOptimizerMiddleware, detectServerPlatform } from './server/platformDetector.js';
import { getFirestore } from './server/firebaseAdmin.js';

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

  // All AI Studio sandboxes, preview environments & Cloud Run instances
  if (hostname.endsWith('.run.app')) return true;
  if (hostname === 'aistudio.google.com' || hostname.endsWith('.aistudio.google.com') || hostname === 'ai.studio' || hostname.endsWith('.ai.studio')) return true;
  if (hostname.endsWith('.google.com') || hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com')) return true;

  // Local development / Capacitor / testing
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Request ID tracing middleware (X-Request-Id header)
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

  app.use(express.json({ limit: '50mb' }));

  // API & Cloud Run Health Check Endpoint (/health and /api/health)
  const healthCheckHandler = async (req: express.Request, res: express.Response) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    const detectedPlatform = (req as any).detectedPlatform || detectServerPlatform(req);

    // 1. Database Connection Status Check (Firestore)
    let dbStatus: 'connected' | 'disconnected' | 'optional' = 'optional';
    let dbError: string | undefined;
    try {
      const db = getFirestore();
      if (db) {
        await Promise.race([
          db.collection('meta').limit(1).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database response timeout')), 2500))
        ]);
        dbStatus = 'connected';
      }
    } catch (err: any) {
      dbStatus = 'disconnected';
      dbError = err?.message || String(err);
    }

    // 2. Disk Usage Status Check
    let diskStatus = {
      status: 'ok',
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      usedPercentage: 0,
      error: undefined as string | undefined
    };
    try {
      const stats = fs.statfsSync('/');
      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bavail * stats.bsize;
      const usedBytes = totalBytes - freeBytes;
      const usedPercentage = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(2)) : 0;
      diskStatus = {
        status: usedPercentage > 98 ? 'critical' : usedPercentage > 85 ? 'warning' : 'ok',
        totalBytes,
        freeBytes,
        usedBytes,
        usedPercentage,
        error: undefined
      };
    } catch (err: any) {
      diskStatus = {
        status: 'unknown',
        totalBytes: 0,
        freeBytes: 0,
        usedBytes: 0,
        usedPercentage: 0,
        error: err?.message || String(err)
      };
    }

    // Server process is running and able to serve web requests.
    // Cloud Run startup probes require a 200 OK so that container routing is activated.
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

  // Mount Modular API Routers
  app.use('/api/admin', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api', orderRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/admin/menu', menuRoutes);
  app.use('/api', updateRoutes);
  app.use('/api', invoiceRoutes);
  app.use('/api', diagnosticRoutes);
  app.use('/api/widget', widgetRoutes);

  // API 404 handler to ensure /api/* calls return JSON instead of HTML
  app.use('/api/*', (req: express.Request, res: express.Response) => {
    const requestId = (req as any).requestId || req.headers['x-request-id'];
    return res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      requestId
    });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(process.cwd(), 'dist', 'index.html');
      res.sendFile(indexPath);
    });
  }

  // Global Express error handler returning JSON with request ID
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
