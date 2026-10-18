import type { Request, Response, NextFunction } from 'express';

export interface TelemetryEvent {
  level: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class TelemetryService {
  private serviceName = 'restoran-wawasan-backend';
  private environment = process.env.NODE_ENV || 'development';

  public captureException(error: unknown, context: { req?: Request; metadata?: Record<string, any> } = {}): void {
    const errObj = error instanceof Error ? error : new Error(String(error));
    const requestId = context.req ? (context.req as any).requestId || context.req.headers['x-request-id'] : undefined;

    const event: TelemetryEvent = {
      level: 'error',
      message: errObj.message || 'Unknown Server Error',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      requestId: typeof requestId === 'string' ? requestId : undefined,
      path: context.req?.originalUrl || context.req?.url,
      method: context.req?.method,
      error: {
        name: errObj.name,
        message: errObj.message,
        stack: errObj.stack,
      },
      metadata: context.metadata,
    };

    // Output structured JSON log for centralized collectors (Render / CloudWatch / Datadog / Stackdriver)
    console.error(`[TELEMETRY_ERROR] ${JSON.stringify(event)}`);
  }

  public captureBreadcrumb(message: string, metadata?: Record<string, any>): void {
    const event: TelemetryEvent = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      metadata,
    };
    console.log(`[TELEMETRY_LOG] ${JSON.stringify(event)}`);
  }

  public initProcessHandlers(): void {
    process.on('unhandledRejection', (reason) => {
      this.captureException(reason, {
        metadata: { source: 'unhandledRejection' },
      });
    });

    process.on('uncaughtException', (err) => {
      this.captureException(err, {
        metadata: { source: 'uncaughtException', fatal: true },
      });
      // Allow logs to flush before exiting if critical
      setTimeout(() => process.exit(1), 1000);
    });
  }

  public expressErrorHandler() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (err: any, req: Request, res: Response, _next: NextFunction) => {
      const requestId = (req as any).requestId || req.headers['x-request-id'];
      const statusCode = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;

      this.captureException(err, { req });

      return res.status(statusCode).json({
        success: false,
        error: err?.message || 'Internal Server Error',
        requestId,
      });
    };
  }
}

export const telemetry = new TelemetryService();
