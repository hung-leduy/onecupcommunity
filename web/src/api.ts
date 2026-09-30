// Thin fetch wrapper around the One-Cup API. Tokens live in localStorage on this device.

export const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage blocked */ }
  },
};

export const USER_TOKEN = 'onecup.userToken';
export const VENDOR_TOKEN = 'onecup.vendorToken';
export const ADMIN_KEY = 'onecup.adminKey';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Opts = { token?: string | null; admin?: string | null; body?: unknown; method?: string };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.admin) headers['x-admin-key'] = opts.admin;
  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export type Cup = { id: string; kind: 'qr' | 'nfc'; code: string; nfcUid: string | null; url: string; linked: boolean; linkedAt: string | null };

export type Me = {
  user: { id: string; nickname: string; consentResearch: boolean; preferredMethod: string | null };
  features: { impactFeedback: boolean; badges: boolean; rewards: boolean };
  cups: Cup[];
  uses: { total: number; verified: number };
  impact: { cupsAvoided: number; plasticGrams: number; co2eGrams: number } | null;
  badges: { id: string; label: string; earned: boolean }[] | null;
  recent: { id: string; tier: number; verified: number; method: string; source: string; created_at: string; vendor_name: string | null; cup_code: string; discount_vnd: number }[];
};

export const fmtTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
export const fmtVnd = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;
export const tierLabel = (t: number) => (t === 1 ? 'Quầy (xác thực)' : t === 2 ? 'Mã quầy (xác thực)' : 'Tự quét (chưa xác thực)');
