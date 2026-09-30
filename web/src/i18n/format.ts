export type Lang = 'vi' | 'en';

const TZ = 'Asia/Ho_Chi_Minh'; // campus time, whatever the device is set to

/** Locale-aware formatters: "2,5 kg" / "3.000 đ" in Vietnamese, "2.5 kg" / "3,000 ₫" in English. */
export function makeFormat(lang: Lang) {
  const locale = lang === 'vi' ? 'vi-VN' : 'en-GB';
  const nf = (opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts);
  const currency = lang === 'vi' ? 'đ' : '₫';
  const splitDay = (day: string) => day.slice(0, 10).split('-');
  return {
    num: (n: number, digits = 0) => nf({ maximumFractionDigits: digits }).format(n),
    pct: (x: number | null | undefined, digits = 0) => (x === null || x === undefined ? '—' : nf({ style: 'percent', maximumFractionDigits: digits }).format(x)),
    vnd: (n: number) => `${nf().format(n)} ${currency}`,
    vndShort: (n: number) => (n >= 10_000 ? `${nf({ maximumFractionDigits: 0 }).format(n / 1000)}k ${currency}` : `${nf().format(n)} ${currency}`),
    /** Grams as { value, unit } so the unit can be typeset smaller, switching to kg from 1 000 g. */
    mass: (g: number) =>
      g >= 1000 ? { value: nf({ maximumFractionDigits: 1 }).format(g / 1000), unit: 'kg' } : { value: nf({ maximumFractionDigits: g < 10 ? 1 : 0 }).format(g), unit: 'g' },
    time: (iso: string) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(new Date(iso)),
    dateTime: (iso: string) => {
      const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).formatToParts(new Date(iso));
      const p = (type: string) => parts.find((x) => x.type === type)?.value ?? '';
      return `${p('hour')}:${p('minute')} ${p('day')}/${p('month')}`;
    },
    /** "YYYY-MM-DD" → "30/06/2027" (both languages use day-first dates). */
    date: (day: string) => {
      const [y, m, d] = splitDay(day);
      return `${d}/${m}/${y}`;
    },
    dateShort: (day: string) => {
      const [, m, d] = splitDay(day);
      return `${d}/${m}`;
    },
    range: (from: string, to: string) => {
      const [, m1, d1] = splitDay(from);
      const [y2, m2, d2] = splitDay(to);
      return `${d1}/${m1} – ${d2}/${m2}/${y2}`;
    },
  };
}

export type Format = ReturnType<typeof makeFormat>;
