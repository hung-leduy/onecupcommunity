// The One Cup mark: an orange cup whose straw is a "1", with a smiling face on a charcoal panel.
// "hello" is the logo's own wink; "cheer" laughs with both eyes closed.
export function Mascot({ mood = 'hello', size = 96, className = '' }: { mood?: 'hello' | 'cheer'; size?: number; className?: string }) {
  const o = 'var(--orange)';
  const face = { stroke: o, strokeWidth: 6, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <svg className={`mascot ${className}`} width={size} height={(size * 150) / 120} viewBox="0 0 120 150" aria-hidden="true">
      <ellipse cx="60" cy="144" rx="30" ry="4.5" fill="#2b2e35" opacity=".1" />
      <path d="M59 14q0-6 6-6h3q6 0 6 6v28h-15Z" fill={o} />
      <path d="M59 13 47.5 19.5q-3.5 2-1.5 5.5l1.5 2.6q2 3.2 5.4 1.3L59 25.5Z" fill={o} />
      <rect x="30" y="38" width="60" height="11" rx="5.5" fill={o} />
      <rect x="17" y="47" width="86" height="16" rx="8" fill={o} />
      <path d="M25 66h70l-8 62q-1.2 8-9 8H42q-7.8 0-9-8Z" fill={o} />
      <path d="M36 74h48l-6.2 46q-.8 5-5.8 5H48q-5 0-5.8-5Z" fill="#2b2e35" />
      {mood === 'cheer' ? (
        <>
          <path d="M47 89q4.5-6.5 9 0" {...face} strokeWidth={5} />
          <path d="M64 89q4.5-6.5 9 0" {...face} strokeWidth={5} />
          <path d="M48 98q12 17 24 0Z" fill={o} stroke={o} strokeWidth="3" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="69" cy="88" r="5.6" fill={o} />
          <path d="M48 101q11 11 25-3" {...face} />
          <path d="M45.5 103.5 49.5 99" {...face} strokeWidth={5} />
        </>
      )}
    </svg>
  );
}

/** Mark + "One Cup" wordmark. `onDark` sets the word in white (orange mark stays). */
export function Logo({ size = 32, onDark = false, className = '' }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <span className={`logo ${onDark ? 'logo--dark' : ''} ${className}`} style={{ fontSize: size * 0.72 }}>
      <Mascot size={size} />
      <span className="logo__word">One Cup</span>
    </span>
  );
}
