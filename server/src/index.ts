import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db.ts';

const config = loadConfig();
const db = openDb(config.dbPath);
const app = createApp(db, config);

// In production the API also serves the built PWA (npm run build → web/dist).
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(`${webDist}/index.html`));
}

app.listen(config.port, () => {
  console.log(`One-Cup API on http://localhost:${config.port} (db: ${config.dbPath}, study mode: ${config.studyMode})`);
  if (config.adminKey === 'change-me-admin') console.warn('⚠ ADMIN_KEY đang dùng giá trị mặc định — đổi trước khi triển khai.');
});
