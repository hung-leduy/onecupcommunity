export type ScanMethod = 'qr' | 'nfc';
export type ScanSource = 'camera' | 'webnfc' | 'usb-hid' | 'pcsc-bridge' | 'manual';

/** One identification event from any input device. value = QR payload or normalised NFC UID (hex). */
export type Detection = { method: ScanMethod; source: ScanSource; value: string; ndefUrl?: string };
