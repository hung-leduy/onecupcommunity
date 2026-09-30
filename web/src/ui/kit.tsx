import { X } from 'lucide-react';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Tone = 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray';

/** Chunky button with a darker bottom edge that presses down. */
export function Btn3D({ tone = 'green', icon, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; icon?: ReactNode }) {
  return (
    <button {...rest} className={`btn3d btn3d--${tone} ${className}`}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function Ring({ value, max, size = 76, stroke = 9 }: { value: number; max: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--green-soft)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--green)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange?.(!checked)}>
      <span />
    </button>
  );
}

/** Bottom sheet dialog. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="sheet__body">
        <div className="sheet__head">
          {title && <h2>{title}</h2>}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Bubble({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="bubble">
      {title && <b className="bubble__title">{title}</b>}
      {children && <span className="bubble__body">{children}</span>}
    </div>
  );
}

export function IconChip({ tone, children, size = 'md' }: { tone: Tone; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`icon-chip icon-chip--${tone} icon-chip--${size}`}>{children}</span>;
}

/** Number with a smaller unit, e.g. 306 g. */
export function Qty({ value, unit }: { value: string; unit?: string }) {
  return (
    <span className="qty">
      {value}
      {unit && <small>{unit}</small>}
    </span>
  );
}

const CONFETTI = [
  { x: 8, y: 22, c: 'var(--green)', r: 18, w: 10, h: 10, d: 0 },
  { x: 20, y: 10, c: 'var(--blue)', r: -30, w: 10, h: 14, d: 0.6 },
  { x: 33, y: 34, c: 'var(--red)', r: 20, w: 9, h: 9, d: 1.1 },
  { x: 6, y: 50, c: 'var(--yellow)', r: 12, w: 9, h: 11, d: 0.3 },
  { x: 70, y: 8, c: 'var(--yellow)', r: 40, w: 8, h: 8, d: 0.9 },
  { x: 92, y: 18, c: 'var(--red)', r: 0, w: 11, h: 11, d: 0.2, round: true },
  { x: 84, y: 44, c: 'var(--green)', r: -20, w: 9, h: 12, d: 1.4 },
  { x: 58, y: 28, c: 'var(--purple)', r: 35, w: 7, h: 7, d: 0.5 },
  { x: 44, y: 6, c: 'var(--green)', r: -10, w: 8, h: 8, d: 1.7 },
];

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {CONFETTI.map((p, i) => (
        <i
          key={i}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.w, height: p.h, background: p.c, borderRadius: p.round ? '50%' : 3, rotate: `${p.r}deg`, animationDelay: `${p.d}s` }}
        />
      ))}
    </div>
  );
}
