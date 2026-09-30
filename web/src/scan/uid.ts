// USB "keyboard wedge" readers type the UID as text. Depending on the model/firmware it is hex
// (often the full 7-byte UID) or a 10-digit decimal of the first 4 bytes, sometimes byte-reversed.
export type WedgeFormat = 'hex' | 'dec-le' | 'dec-be';

export function wedgeToHex(raw: string, format: WedgeFormat): string | null {
  const s = raw.trim();
  if (format === 'hex') {
    const hex = s.replace(/[\s:\-]/g, '').toUpperCase();
    return /^[0-9A-F]{8}$|^[0-9A-F]{14}$|^[0-9A-F]{20}$/.test(hex) ? hex : null;
  }
  if (!/^\d{1,10}$/.test(s)) return null;
  const n = Number(s);
  if (n > 0xffffffff) return null;
  const be = n.toString(16).toUpperCase().padStart(8, '0');
  return format === 'dec-be' ? be : be.match(/../g)!.reverse().join('');
}

/** Web NFC reports serialNumber as "04:a2:3b:…". */
export const serialToHex = (serial: string) => serial.replace(/:/g, '').toUpperCase();

export const WEDGE_FORMATS: { id: WedgeFormat; label: string }[] = [
  { id: 'hex', label: 'HEX' },
  { id: 'dec-le', label: 'Thập phân, đảo byte' },
  { id: 'dec-be', label: 'Thập phân, không đảo byte' },
];

export type Calibration = { format: WedgeFormat; hex: string | null; match: 'full' | 'prefix' | 'suffix' | 'none' };

/**
 * Interpret a raw reader string under every format. If the tag's real UID is known (e.g. from the
 * NFC Tools app on a phone), mark which interpretation matches it — fully, or only the first 4 bytes
 * (readers that print a 10-digit decimal only carry 4 bytes of a 7-byte NTAG UID — the first or the last 4).
 */
export function calibrate(raw: string, realUid?: string): Calibration[] {
  const real = (realUid ?? '').replace(/[\s:\-]/g, '').toUpperCase();
  return WEDGE_FORMATS.map(({ id }) => {
    const hex = wedgeToHex(raw, id);
    const match = !hex || !real ? 'none' : hex === real ? 'full' : real.startsWith(hex) ? 'prefix' : real.endsWith(hex) ? 'suffix' : 'none';
    return { format: id, hex, match };
  });
}

/**
 * UID from what a keyboard reader typed. A 10-digit decimal can only be a decimal UID, so it is
 * read as one (byte-reversed unless "dec-be" is chosen) even if the terminal is set to HEX.
 */
export function readerToHex(raw: string, format: WedgeFormat): string | null {
  const s = raw.trim();
  if (/^\d{10}$/.test(s)) return wedgeToHex(s, format === 'dec-be' ? 'dec-be' : 'dec-le');
  return wedgeToHex(s, format);
}
