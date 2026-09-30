// One-Cup NFC bridge — run on the vendor PC that has the USB NFC reader plugged in.
//   npm install && npm start            (Linux needs: sudo apt install pcscd libpcsclite-dev)
// The terminal page (/vendor → Cài đặt → "Kết nối PC/SC bridge") connects to ws://localhost:7777.
import { NFC } from 'nfc-pcsc';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.BRIDGE_PORT ?? 7777);
// Only accept the terminal from these origins (comma-separated). Empty = allow any (dev only).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const wss = new WebSocketServer({
  host: '127.0.0.1', // never expose the reader to the network
  port: PORT,
  verifyClient: ({ origin }) => ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin),
});
const readers = new Map();

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) if (client.readyState === 1) client.send(data);
}

wss.on('connection', (ws) => {
  for (const name of readers.keys()) ws.send(JSON.stringify({ type: 'reader', name, connected: true }));
});

const nfc = new NFC();

nfc.on('reader', (reader) => {
  const name = reader.reader.name;
  readers.set(name, reader);
  console.log(`✔ Reader: ${name}`);
  broadcast({ type: 'reader', name, connected: true });

  // nfc-pcsc needs an AID for ISO 14443-4 cards; NTAG stickers (ISO 14443-3) only report their UID.
  reader.autoProcessing = true;
  reader.aid = 'F222222222';

  reader.on('card', (card) => {
    const uid = String(card.uid ?? '').toUpperCase();
    if (!uid) return;
    console.log(`  tag ${uid} (${card.type ?? 'unknown'}) on ${name}`);
    broadcast({ type: 'uid', uid, reader: name, at: new Date().toISOString() });
  });
  reader.on('card.off', () => broadcast({ type: 'removed', reader: name }));
  reader.on('error', (err) => console.error(`  reader error (${name}):`, err.message));
  reader.on('end', () => {
    readers.delete(name);
    console.log(`✖ Reader removed: ${name}`);
    broadcast({ type: 'reader', name, connected: false });
  });
});

nfc.on('error', (err) => console.error('PC/SC error:', err.message));

console.log(`One-Cup NFC bridge on ws://127.0.0.1:${PORT}${ALLOWED_ORIGINS.length ? ` (origins: ${ALLOWED_ORIGINS.join(', ')})` : ''}`);
console.log('Waiting for a reader… (cắm đầu đọc NFC vào cổng USB)');
