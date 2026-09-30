// Thin fetch wrapper around the One-Cup API. Tokens live in localStorage on this device.

export const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* storage blocked */
    }
  },
};

export const USER_TOKEN = 'onecup.userToken';
export const VENDOR_TOKEN = 'onecup.vendorToken';
export const ADMIN_KEY = 'onecup.adminKey';

/** The server answers errors with { error: code, ...details }; `code` is translated in the UI. */
export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, any>;
  constructor(status: number, code: string, details: Record<string, any> = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Opts = { token?: string | null; admin?: string | null; body?: unknown; method?: string };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.admin) headers['x-admin-key'] = opts.admin;
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { error, ...details } = data ?? {};
    throw new ApiError(res.status, typeof error === 'string' ? error : 'server_error', details);
  }
  return data as T;
}

/** Download a file from an authenticated endpoint. */
export async function download(path: string, filename: string, opts: Opts = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.admin) headers['x-admin-key'] = opts.admin;
  const res = await fetch(path, { headers });
  if (!res.ok) throw new ApiError(res.status, 'server_error');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await res.blob());
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

// ---- shapes returned by the API ----------------------------------------------------------------

export type Cup = {
  id: string;
  kind: 'qr' | 'nfc';
  code: string;
  displayCode: string;
  nfcUid: string | null;
  url: string;
  linked: boolean;
  linkedAt: string | null;
  createdAt: string;
};

export type ScanRow = {
  id: string;
  tier: 1 | 2 | 3;
  verified: number;
  method: 'qr' | 'nfc';
  source: string;
  created_at: string;
  discount_vnd: number;
  points: number;
  vendor_name: string | null;
  cup_code: string;
};

export type Me = {
  user: {
    id: string;
    nickname: string;
    faculty: string | null;
    intake: string | null;
    consentResearch: boolean;
    consentOpenData: boolean;
    preferredMethod: 'qr' | 'nfc' | null;
    createdAt: string;
  };
  features: { impactFeedback: boolean; gamification: boolean; rewards: boolean };
  study: { studyEnd: string; rewardsEnd: string; rewardsOpen: boolean; ended: boolean };
  cups: Cup[];
  uses: { total: number; verified: number; today: number };
  goal: { daily: number; today: number; streak: number; week: { day: string; status: 'done' | 'today' | 'open' }[] } | null;
  points: number | null;
  impact: { cupsAvoided: number; plasticGrams: number; co2eGrams: number } | null;
  impactPerCup: { plasticGrams: number; co2eGrams: number; singleUseCo2eGrams: number };
  milestones: { next: number | null; list: { target: number; reached: boolean; current: boolean }[] } | null;
  league: { tier: number; topTier: boolean; rank: number; cups: number; daysLeft: number; promote: number } | null;
  recent: ScanRow[];
};

export type League = {
  week: string;
  tier: number;
  topTier: boolean;
  promote: number;
  daysLeft: number;
  rank: number;
  members: { rank: number; name: string; initials: string; cups: number; me: boolean }[];
};

export type Voucher = {
  id: string;
  voucher: string;
  displayCode: string;
  url: string;
  status: 'issued' | 'used';
  titleVi: string;
  titleEn: string;
  vendor: string | null;
  createdAt: string;
  usedAt: string | null;
};

export type Rewards = {
  balance: number;
  open: boolean;
  rewardsEnd: string;
  items: { id: string; titleVi: string; titleEn: string; cost: number; vendor: string | null; affordable: boolean }[];
  vouchers: Voucher[];
};
