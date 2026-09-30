// Filled glyphs from the design (lucide covers the outline icons).
type P = { size?: number; className?: string };

export const FlameIcon = ({ size = 18, className = '' }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="var(--red)" d="M12.3 2.4c.7 3.4 5.7 6.3 5.7 11.3a6 6 0 0 1-12 0c0-2.8 1.5-4.6 2.8-6 .2 1.4.9 2.4 1.8 2.9-.3-3.2.6-5.8 1.7-8.2z" />
  </svg>
);

export const GemIcon = ({ size = 18, className = '' }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="var(--blue)" d="M7 3.5h10l5 6-10 11.5L2 9.5z" />
    <path d="M2.4 9.5h19.2M7 3.5l5 17.5M17 3.5l-5 17.5" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" fill="none" />
  </svg>
);

export const CrownIcon = ({ size = 22, className = '' }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="var(--yellow-dark)" d="M3 7.5l4.8 4.2L12 5l4.2 6.7L21 7.5 19.2 17H4.8z" />
    <rect x="4.8" y="18" width="14.4" height="2.4" rx="1.2" fill="var(--yellow-dark)" />
  </svg>
);

/** Mug outline used for "cups" (matches the design's cup glyph). */
export const CupIcon = ({ size = 18, className = '' }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 5.5h11v8.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14z" />
    <path d="M16 8.5h1.3a2.7 2.7 0 0 1 0 5.4H16" />
  </svg>
);
