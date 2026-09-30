// Counter terminal state shared by the Scan / Today / Help tabs. Readers keep listening on every tab;
// a detection while another tab is open jumps back to Scan to show the result.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, store, VENDOR_TOKEN } from '../api';
import { errorText, useI18n } from '../i18n';
import { useKeyboardWedge, useNfcBridge, type BridgeState, type WedgeBurst } from '../scan/hooks';
import type { Detection } from '../scan/types';
import type { WedgeFormat } from '../scan/uid';
import { startNfcScan } from '../scan/webnfc';

export type Vendor = { id: string; name: string; discountVnd: number; stationLabel: string | null; cluster: string };
export type Settings = { usb: boolean; usbFormat: WedgeFormat; usbGapMs: number; bridge: boolean; bridgeUrl: string; timer: boolean };
export type Result =
  | { kind: 'ok'; code: string; discountVnd: number; method: 'qr' | 'nfc'; ms: number | null }
  | { kind: 'unlinked'; code: string; url: string }
  | { kind: 'duplicate'; code: string }
  | { kind: 'unknown'; method: 'qr' | 'nfc'; value: string }
  | { kind: 'registered'; code: string; url: string; created: boolean }
  | { kind: 'voucher'; status: 'voucher_ok' | 'voucher_used' | 'voucher_invalid' | 'voucher_wrong_vendor'; code: string; titleVi?: string; titleEn?: string; vendor?: string }
  | { kind: 'error'; text: string };

export type Today = {
  day: string;
  scansToday: number;
  drinksTotal: number | null;
  share: number | null;
  byHour: { hour: number; n: number }[];
  savedVnd: number;
  monthCount: number;
  intervention: boolean;
  lastWeekDays: { day: string; drinks_total: number | null; reusable_observed: number | null }[];
  recent: { id: string; tier: number; method: string; created_at: string; discount_vnd: number; displayCode: string; linked: boolean }[];
};

const SETTINGS_KEY = 'onecup.terminalSettings';
const STAFF_KEY = 'onecup.staffName';
// The project's USB reader types a 10-digit decimal, byte-reversed (see docs/HARDWARE-NFC.md).
const DEFAULTS: Settings = { usb: true, usbFormat: 'dec-le', usbGapMs: 50, bridge: false, bridgeUrl: 'ws://localhost:7777', timer: false };

function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(store.get(SETTINGS_KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
  } catch {
    /* audio blocked */
  }
}

type TerminalCtx = {
  token: string;
  vendor: Vendor;
  staff: string;
  logout: () => void;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  result: Result | null;
  clearResult: () => void;
  registerMode: boolean;
  setRegisterMode: (v: boolean) => void;
  handle: (d: Detection) => Promise<void>;
  registerTag: (uid: string) => Promise<void>;
  timerStart: number | null;
  startTimer: () => void;
  burst: WedgeBurst | null;
  bridge: { state: BridgeState; readerName: string | null };
  webNfc: 'off' | 'on' | 'error';
  toggleWebNfc: () => Promise<void>;
  today: Today | null;
  reloadToday: () => void;
  setToday: (t: Today) => void;
};

const Ctx = createContext<TerminalCtx | null>(null);
export const useTerminal = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTerminal outside TerminalProvider');
  return c;
};

export function useVendorSession() {
  const [token, setToken] = useState(() => store.get(VENDOR_TOKEN));
  const [vendor, setVendor] = useState<Vendor | null>(null);
  useEffect(() => {
    if (!token) return;
    api<Vendor>('/api/vendor/me', { token }).then(setVendor, (e) => {
      if (e instanceof ApiError && e.status === 401) {
        store.set(VENDOR_TOKEN, null);
        setToken(null);
      }
    });
  }, [token]);
  return {
    token,
    vendor,
    login: (t: string, v: Vendor, staff: string) => {
      store.set(VENDOR_TOKEN, t);
      store.set(STAFF_KEY, staff || null);
      setToken(t);
      setVendor(v);
    },
    logout: () => {
      store.set(VENDOR_TOKEN, null);
      setToken(null);
      setVendor(null);
    },
  };
}

export function TerminalProvider({ token, vendor, logout, children }: { token: string; vendor: Vendor; logout: () => void; children: ReactNode }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [result, setResult] = useState<Result | null>(null);
  const [registerMode, setRegisterMode] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [burst, setBurst] = useState<WedgeBurst | null>(null);
  const [webNfc, setWebNfc] = useState<'off' | 'on' | 'error'>('off');
  const [today, setToday] = useState<Today | null>(null);
  const stopNfc = useRef<(() => void) | null>(null);
  const inflight = useRef(false);
  const lastValue = useRef({ value: '', at: 0 });

  const setSettings = (patch: Partial<Settings>) =>
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      store.set(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });

  const reloadToday = useCallback(() => {
    api<Today>('/api/vendor/today', { token }).then(setToday, () => {});
  }, [token]);

  useEffect(() => {
    reloadToday();
    const timer = setInterval(() => document.visibilityState === 'visible' && reloadToday(), 20_000);
    return () => clearInterval(timer);
  }, [reloadToday]);

  const showOnScanTab = useCallback(() => {
    if (location.pathname !== '/vendor') navigate('/vendor');
  }, [location.pathname, navigate]);

  const registerTag = useCallback(
    async (uid: string) => {
      try {
        const r = await api('/api/vendor/tags', { token, body: { uid } });
        setResult({ kind: 'registered', code: r.cup.displayCode, url: r.cup.url, created: r.created });
        beep(true);
      } catch (e) {
        setResult({ kind: 'error', text: errorText(t, e) });
        beep(false);
      }
    },
    [token, t],
  );

  const handle = useCallback(
    async (d: Detection) => {
      // Readers can report the same tag twice in a row; typed entries are never dropped.
      const now = performance.now();
      if (inflight.current) return;
      if (d.source !== 'manual' && d.value === lastValue.current.value && now - lastValue.current.at < 1500) return;
      lastValue.current = { value: d.value, at: now };
      inflight.current = true;
      showOnScanTab();
      try {
        if (registerMode) {
          if (d.method !== 'nfc') throw new Error('not_onecup_code');
          await registerTag(d.value);
          return;
        }
        const ms = settings.timer && timerStart ? Math.round(performance.now() - timerStart) : null;
        const r = await api('/api/vendor/scans', { token, body: { method: d.method, source: d.source, value: d.value, txDurationMs: ms ?? undefined } });
        setTimerStart(null);
        const ok = r.status === 'ok' || r.status === 'unlinked' || r.status === 'voucher_ok';
        if (r.status === 'ok') setResult({ kind: 'ok', code: r.cup.displayCode, discountVnd: r.discountVnd, method: d.method, ms });
        else if (r.status === 'unlinked') setResult({ kind: 'unlinked', code: r.cup.displayCode, url: r.cup.url });
        else if (r.status === 'duplicate') setResult({ kind: 'duplicate', code: r.cup.displayCode });
        else if (r.status === 'unknown') setResult({ kind: 'unknown', method: d.method, value: r.uid ?? d.value });
        else if (String(r.status).startsWith('voucher_'))
          setResult({ kind: 'voucher', status: r.status, code: r.voucher, titleVi: r.reward?.titleVi, titleEn: r.reward?.titleEn, vendor: r.reward?.vendor });
        beep(ok);
        reloadToday();
      } catch (e) {
        setResult({ kind: 'error', text: errorText(t, e) });
        beep(false);
      } finally {
        inflight.current = false;
      }
    },
    [registerMode, registerTag, settings.timer, timerStart, token, t, reloadToday, showOnScanTab],
  );

  useKeyboardWedge(
    settings.usb,
    settings.usbFormat,
    handle,
    (raw) => {
      showOnScanTab();
      setResult({ kind: 'error', text: t.vendor.badUid(raw, t.vendor.help.formats[settings.usbFormat]) });
    },
    setBurst,
    settings.usbGapMs,
  );
  const bridge = useNfcBridge(settings.bridge ? settings.bridgeUrl : null, handle);

  // Space bar = "new customer" when the transaction timer is on.
  useEffect(() => {
    if (!settings.timer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setTimerStart(performance.now());
        setResult(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.timer]);

  const handleRef = useRef(handle);
  handleRef.current = handle;
  async function toggleWebNfc() {
    if (stopNfc.current) {
      stopNfc.current();
      stopNfc.current = null;
      setWebNfc('off');
      return;
    }
    try {
      stopNfc.current = await startNfcScan(
        (r) => handleRef.current({ method: 'nfc', source: 'webnfc', value: r.uid, ndefUrl: r.url }),
        () => setResult({ kind: 'error', text: t.errors.bad_uid }),
      );
      setWebNfc('on');
    } catch {
      setWebNfc('error');
      setResult({ kind: 'error', text: t.errors.nfc_unavailable });
    }
  }
  useEffect(() => () => stopNfc.current?.(), []);

  const value: TerminalCtx = {
    token,
    vendor,
    staff: store.get(STAFF_KEY) ?? '',
    logout,
    settings,
    setSettings,
    result,
    clearResult: () => setResult(null),
    registerMode,
    setRegisterMode: (v) => {
      lastValue.current = { value: '', at: 0 }; // the same tag may be tapped again right away in the new mode
      setRegisterMode(v);
      setResult(null);
    },
    handle,
    registerTag,
    timerStart,
    startTimer: () => {
      setTimerStart(performance.now());
      setResult(null);
    },
    burst,
    bridge,
    webNfc,
    toggleWebNfc,
    today,
    reloadToday,
    setToday,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
