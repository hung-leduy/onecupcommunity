// The One Cup mark, traced from the brand logo: domed lid with a slit, a "1" straw in the lid's
// hole, an orange-rimmed cup on a charcoal panel, two dot eyes and a lopsided smile.
// "hello" is the logo itself; "cheer" closes the eyes and opens the smile.
export function Mascot({ mood = 'hello', size = 96, className = '' }: { mood?: 'hello' | 'cheer'; size?: number; className?: string }) {
  const o = 'var(--orange, #ff7b0f)';
  const c = 'var(--charcoal, #2b2e35)';
  return (
    <svg className={`mascot ${className}`} width={size} height={(size * 150) / 120} viewBox="0 0 120 150" aria-hidden="true">
      <MarkPaths orange={o} charcoal={c} mood={mood} />
    </svg>
  );
}

export function MarkPaths({ orange: o, charcoal: c, mood = 'hello' }: { orange: string; charcoal: string; mood?: 'hello' | 'cheer' }) {
  const line = { stroke: o, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <>
      {/* cup: orange shell, charcoal panel */}
      <path d="M20 71h80l-9 67q-1 7-8 7H37q-7 0-8-7Z" fill={o} />
      <path d="M27.5 80h65l-7.6 55q-.7 5-5 5H40.1q-4.3 0-5-5Z" fill={c} />
      {/* lid: rim, dome, slit, straw hole */}
      <rect x="12" y="58" width="96" height="16" rx="8" fill={o} />
      <path d="M21 61q2-18.5 39-19.5 37 1 39 19.5Z" fill={o} />
      <path d="M22 61.5q38-4 76 0" stroke={c} strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <ellipse cx="62" cy="48.5" rx="13" ry="4.4" fill={c} />
      {/* the "1" straw, leaning right as in the logo */}
      <g transform="rotate(9 62 51)">
      <path d="M55 51V11q0-7 7-7h2q7 0 7 7v40q0 2.5-2.5 2.5h-11Q55 53.5 55 51Z" fill={o} />
      <path d="M58 9 48.5 15" stroke={o} strokeWidth="10" strokeLinecap="round" />
      </g>
      {/* face */}
      {mood === 'cheer' ? (
        <>
          <path d="M56.3 99q4.2-5.5 8.4 0" {...line} strokeWidth="4.4" />
          <path d="M70.3 95q4.2-5.5 8.4 0" {...line} strokeWidth="4.4" />
          <path d="M42 105q12 17 27-3Z" fill={o} stroke={o} strokeWidth="3" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="60.5" cy="98.5" r="4.6" fill={o} />
          <circle cx="74.5" cy="94.5" r="4.6" fill={o} />
          <path d="M42 104.5q10.5 15 26.5 4" {...line} strokeWidth="5.6" />
        </>
      )}
    </>
  );
}

/** Mark + "One Cup" wordmark (big O and C, small "nE", as in the logo). `onDark` sets the word in white. */
export function Logo({ size = 32, onDark = false, className = '' }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <span className={`logo ${onDark ? 'logo--dark' : ''} ${className}`} style={{ fontSize: size * 0.72 }}>
      <Mascot size={size} />
      <span className="logo__word">
        O<small>nE</small> Cup
      </span>
    </span>
  );
}
