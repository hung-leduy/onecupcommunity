// Web NFC (Chrome on Android only). Minimal typings — not yet part of lib.dom.
import { serialToHex } from './uid';

type NDEFRecord = { recordType: string; data?: DataView; encoding?: string };
type NDEFReadingEvent = Event & { serialNumber: string; message: { records: NDEFRecord[] } };
type NDEFReaderT = EventTarget & {
  scan(opts?: { signal?: AbortSignal }): Promise<void>;
  write(message: { records: { recordType: string; data: string }[] }, opts?: { signal?: AbortSignal }): Promise<void>;
};

export const webNfcSupported = () => typeof window !== 'undefined' && 'NDEFReader' in window;

const newReader = (): NDEFReaderT => new (window as any).NDEFReader();

export type NfcRead = { uid: string; url?: string };

/** Start listening; returns a stop function. Must be called from a user gesture the first time. */
export async function startNfcScan(onRead: (r: NfcRead) => void, onError: (msg: string) => void): Promise<() => void> {
  const ctrl = new AbortController();
  const reader = newReader();
  reader.addEventListener('reading', (e) => {
    const ev = e as NDEFReadingEvent;
    let url: string | undefined;
    for (const rec of ev.message?.records ?? []) {
      if (rec.recordType === 'url' && rec.data) url = new TextDecoder().decode(rec.data);
    }
    if (ev.serialNumber) onRead({ uid: serialToHex(ev.serialNumber), url });
    else onError('Thẻ không trả về UID (serialNumber)');
  });
  reader.addEventListener('readingerror', () => onError('Không đọc được thẻ, hãy chạm lại'));
  await reader.scan({ signal: ctrl.signal });
  return () => ctrl.abort();
}

/** Write an NDEF URL record so phones open the app when they tap the tag. */
export async function writeNfcUrl(url: string): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    await newReader().write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
