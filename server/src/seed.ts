// Creates demo vendors and a few QR cups for local testing: npm run seed -w server
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db.ts';
import { newId, newToken } from './domain.ts';

const config = loadConfig();
const db = openDb(config.dbPath);
createApp(db, config); // ensures the schema is in place

const vendors = [
  { name: 'Canteen VGU', pin: '1111', discount: 2000 },
  { name: 'Café Thư viện', pin: '2222', discount: 3000 },
];
for (const v of vendors) {
  const exists = db.prepare('SELECT 1 FROM vendors WHERE pin = ?').get(v.pin);
  if (exists) continue;
  db.prepare('INSERT INTO vendors (id, name, pin, token, discount_vnd, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    newId(), v.name, v.pin, newToken(), v.discount, new Date().toISOString(),
  );
  console.log(`Quầy "${v.name}" — PIN ${v.pin}`);
}
console.log('Xong. Tạo cốc QR trong trang /admin (admin key:', config.adminKey + ')');
