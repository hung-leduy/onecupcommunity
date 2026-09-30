import { useEffect, useRef, useState } from 'react';
import type { Detection } from './types';
import { wedgeToHex, type WedgeFormat } from './uid';

/**
 * USB NFC readers in keyboard-emulation mode "type" the UID very fast and press Enter.
 * We capture bursts of keystrokes (<50 ms apart) that end with Enter, ignoring normal typing in inputs.
 */
export type WedgeBurst = { raw: string; terminator: string; maxGapMs: number; at: number };

export function useKeyboardWedge(
  enabled: boolean,
  format: WedgeFormat,
  onDetect: (d: Detection) => void,
  onBad: (raw: string) => void,
  onBurst?: (b: WedgeBurst) => void,
  maxGapMs = 50,
) {
  const cb = useRef({ onDetect, onBad, onBurst });
  cb.current = { onDetect, onBad, onBurst };
  useEffect(() => {
    if (!enabled) return;
    let buf = '';
    let last = 0;
    let gap = 0;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const t = performance.now();
      if (t - last > maxGapMs) { buf = ''; gap = 0; } else if (buf) gap = Math.max(gap, t - last);
      last = t;
      // Most readers end with Enter; some are configured to send Tab instead.
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buf.length >= 8) {
          cb.current.onBurst?.({ raw: buf, terminator: e.key, maxGapMs: Math.round(gap), at: Date.now() });
          const hex = wedgeToHex(buf, format);
          hex ? cb.current.onDetect({ method: 'nfc', source: 'usb-hid', value: hex }) : cb.current.onBad(buf);
          e.preventDefault();
        }
        buf = '';
      } else if (e.key.length === 1) {
        buf += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, format, maxGapMs]);
}

export type BridgeState = 'off' | 'connecting' | 'connected' | 'error';

/** Local PC/SC bridge (nfc-bridge/ in this repo) pushes {type:"uid", uid, reader} over WebSocket. */
export function useNfcBridge(url: string | null, onDetect: (d: Detection) => void) {
  const [state, setState] = useState<BridgeState>('off');
  const [readerName, setReaderName] = useState<string | null>(null);
  const cb = useRef(onDetect);
  cb.current = onDetect;
  useEffect(() => {
    if (!url) { setState('off'); return; }
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    const connect = () => {
      setState('connecting');
      ws = new WebSocket(url);
      ws.onopen = () => setState('connected');
      ws.onmessage = (m) => {
        try {
          const msg = JSON.parse(String(m.data));
          if (msg.type === 'uid' && msg.uid) cb.current({ method: 'nfc', source: 'pcsc-bridge', value: String(msg.uid).toUpperCase(), ndefUrl: msg.url });
          if (msg.type === 'reader') setReaderName(msg.connected ? msg.name : null);
        } catch { /* ignore malformed */ }
      };
      ws.onclose = () => {
        if (closed) return;
        setState('error');
        retry = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => { closed = true; clearTimeout(retry); ws?.close(); };
  }, [url]);
  return { state, readerName };
}
