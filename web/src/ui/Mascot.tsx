// The One-Cup mascot: a VGU reusable cup with a sprout. "hello" waves, "cheer" celebrates.
export function Mascot({ mood = 'hello', size = 96, className = '' }: { mood?: 'hello' | 'cheer'; size?: number; className?: string }) {
  const arm = { stroke: 'var(--green)', strokeWidth: 6, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <svg className={`mascot ${className}`} width={size} height={(size * 150) / 120} viewBox="0 0 120 150" aria-hidden="true">
      <ellipse cx="60" cy="143" rx="28" ry="5" fill="#1d3b2a" opacity=".08" />
      {mood === 'cheer' ? (
        <>
          <path d="M35 82 L16 58" {...arm} />
          <path d="M85 82 L104 58" {...arm} />
        </>
      ) : (
        <>
          <path d="M35 86 L19 98" {...arm} />
          <path d="M85 86 L101 98" {...arm} />
        </>
      )}
      <path d="M31 40 H89 L83.2 128 Q82.6 134 76.5 134 H43.5 Q37.4 134 36.8 128 Z" fill="#fff" stroke="#dbeadf" strokeWidth="2" />
      <path d="M60 31 V19" stroke="#3f9e57" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 22 C50 22 42 16 39.5 7.5 C49.5 6.5 58 12 60 22 Z" fill="var(--green)" />
      <path d="M60 25 C68 25 76 20 78.5 12.5 C69.5 11.5 62 15.5 60 25 Z" fill="#74d38b" />
      <rect x="26" y="30" width="68" height="14" rx="7" fill="var(--green)" />
      <rect x="29" y="40" width="62" height="4" rx="2" fill="#3fa75a" opacity=".55" />
      <ellipse cx="49" cy="67" rx="5.5" ry="7.5" fill="#1d3b2a" />
      <ellipse cx="71" cy="67" rx="5.5" ry="7.5" fill="#1d3b2a" />
      <circle cx="51" cy="64" r="2" fill="#fff" />
      <circle cx="73" cy="64" r="2" fill="#fff" />
      <ellipse cx="40.5" cy="80" rx="5" ry="3" fill="#ff9c9c" opacity=".75" />
      <ellipse cx="79.5" cy="80" rx="5" ry="3" fill="#ff9c9c" opacity=".75" />
      {mood === 'cheer' ? (
        <path d="M53.5 78 Q60 90 66.5 78 Z" fill="#1d3b2a" />
      ) : (
        <path d="M54 79 Q60 85 66 79" stroke="#1d3b2a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}
      <rect x="39" y="101" width="42" height="15" rx="3" fill="var(--green)" />
      <text x="60" y="112" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff" fontFamily="var(--font)" letterSpacing=".5">
        VGU
      </text>
    </svg>
  );
}
