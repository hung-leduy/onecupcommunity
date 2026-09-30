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
