import express, { type NextFunction, type Request, type Response } from 'express';
import type { Config } from './config.ts';
import type { DB } from './db.ts';
import { HttpError, makeCtx } from './http.ts';
import { adminRoutes } from './routes/admin.ts';
import { studentRoutes } from './routes/student.ts';
import { vendorRoutes } from './routes/vendor.ts';

export function createApp(db: DB, config: Config, opts: { now?: () => Date } = {}) {
  const ctx = makeCtx(db, config, opts.now);
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, studyMode: config.studyMode, publicUrl: config.publicUrl });
  });

  studentRoutes(app, ctx);
  vendorRoutes(app, ctx);
  adminRoutes(app, ctx);

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'not_found')));

  // Errors are returned as { error: <code>, ...details }; the web app translates the code.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof HttpError ? err.status : err?.type === 'entity.parse.failed' ? 400 : 500;
    if (status === 500) console.error(err);
    const code = err instanceof HttpError ? err.code : status === 400 ? 'bad_request' : 'server_error';
    res.status(status).json({ error: code, ...(err instanceof HttpError ? err.details : {}) });
  });

  return app;
}
