// Fake bridge for testing the terminal without hardware: type a UID + Enter to "tap" it.
//   node mock.js
import readline from 'node:readline';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ host: '127.0.0.1', port: Number(process.env.BRIDGE_PORT ?? 7777) });
wss.on('connection', (ws) => ws.send(JSON.stringify({ type: 'reader', name: 'MOCK reader', connected: true })));
const rl = readline.createInterface({ input: process.stdin });
console.log('Mock bridge on ws://127.0.0.1:7777 — nhập UID (VD 04A23B4C5D6E7F) rồi Enter:');
rl.on('line', (line) => {
  const uid = line.trim().replace(/[:\s-]/g, '').toUpperCase();
  if (!uid) return;
  for (const c of wss.clients) c.send(JSON.stringify({ type: 'uid', uid, reader: 'MOCK reader' }));
  console.log(`→ sent ${uid} to ${wss.clients.size} client(s)`);
});
