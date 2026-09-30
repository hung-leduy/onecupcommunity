// Scan actions shared by the scan page and the deep links.
import { api, type Me, type ScanRow } from '../api';

export type ScanResult = Me & { scan: ScanRow & { id: string } };

/** What a scanned QR payload means for the student app. */
export function classifyQr(text: string): { kind: 'station'; vendorId: string; code: string } | { kind: 'cup'; code: string } | null {
  const station = text.match(/\/s\/([\w-]+)\/(\d{6})(?:[/?#]|$)/);
  if (station) return { kind: 'station', vendorId: station[1], code: station[2] };
  const cup = text.match(/\/c\/([A-Za-z0-9]{4,16})(?:[/?#]|$)/) ?? text.trim().match(/^(?:OCC-?)?([A-Za-z0-9]{6})$/i);
  if (cup) return { kind: 'cup', code: cup[1].toUpperCase() };
  return null;
}

export const stationScan = (token: string, body: { vendorId?: string; code: string; cupId?: string }) =>
  api<ScanResult>('/api/me/scans/station', { token, body });

export const selfScan = (token: string, body: { code?: string; nfcUid?: string; cupId?: string }) =>
  api<ScanResult>('/api/me/scans/self', { token, body });
