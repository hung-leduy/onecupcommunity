// Small SVG charts: thin marks, 4px rounded column ends, 2px lines, hairline solid grid,
// hover tooltips that never gate (every chart also offers a table view or direct labels).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import '../styles/charts.css';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type Tip = { x: number; y: number; content: ReactNode } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.content}
    </div>
  );
}

/** Rounded data end, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export type Column = { key: string; label: string; value: number; tip: ReactNode; emphasis?: boolean; showValue?: boolean };

/**
 * Single-series column chart. `emphasis` columns wear the accent, the rest a light tint
 * of the same hue (the "emphasis" form: one thing is the point, the rest is context).
 */
export function ColumnChart({ data, height = 150, tone = 'blue', caption }: { data: Column[]; height?: number; tone?: 'blue' | 'green'; caption: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const top = 18;
  const axis = 22;
  const plotH = height - top - axis;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = data.length ? width / data.length : 0;
  const barW = Math.max(4, Math.min(24, slot * 0.62));
  const labelEvery = slot < 26 ? Math.ceil(26 / slot) : 1;

  return (
    <figure className="chart" ref={ref} style={{ height }} onPointerLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={caption}>
          <line x1={0} x2={width} y1={top + plotH + 0.5} y2={top + plotH + 0.5} className="chart-axis" />
          {data.map((d, i) => {
            const h = (d.value / max) * plotH;
            const cx = slot * i + slot / 2;
            const x = cx - barW / 2;
            const y = top + plotH - h;
            const show = () => setTip({ x: cx, y: y - 8, content: d.tip });
            return (
              <g key={d.key} tabIndex={0} onPointerEnter={show} onFocus={show} onBlur={() => setTip(null)} className="chart-hit">
                <rect x={slot * i} y={top} width={slot} height={plotH} fill="transparent" />
                <path d={columnPath(x, y, barW, h)} className={`chart-col chart-col--${tone} ${d.emphasis ? 'is-emphasis' : ''}`} />
                {d.showValue && d.value > 0 && (
                  <text x={cx} y={y - 5} textAnchor="middle" className="chart-value">
                    {d.value}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className={`chart-tick ${d.emphasis ? 'is-emphasis' : ''}`}>
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export type SparkPoint = { x: number; y: number | null };

/**
 * One cluster's weekly share: pre-intervention weeks shaded, a dashed marker where the
 * intervention starts, 2px line with a 10% wash, end dot with a surface ring, crosshair tooltip.
 */
export function Sparkline({
  points,
  domain,
  start,
  height = 70,
  format,
  label,
}: {
  points: SparkPoint[];
  domain: [number, number];
  start?: number;
  height?: number;
  format: (p: SparkPoint) => ReactNode;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <div className="chart" ref={ref} style={{ height }} />;
  const pad = 8;
  const x0 = points[0].x;
  const x1 = points[points.length - 1].x;
  const sx = (x: number) => (x1 === x0 ? width / 2 : pad + ((x - x0) / (x1 - x0)) * (width - pad * 2));
  const sy = (y: number) => height - pad - ((y - domain[0]) / (domain[1] - domain[0] || 1)) * (height - pad * 2);
  const valid = points.filter((p) => p.y !== null) as { x: number; y: number }[];
  const line = valid.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join('');
  const area = valid.length ? `${line}L${sx(valid[valid.length - 1].x)},${height - pad}L${sx(valid[0].x)},${height - pad}Z` : '';
  const step = x1 === x0 ? width : (width - pad * 2) / (x1 - x0);
  const startX = start !== undefined ? Math.max(0, Math.min(width, sx(start) - step / 2)) : null;
  const last = valid[valid.length - 1];

  function move(e: React.PointerEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = points[0];
    for (const p of points) if (Math.abs(sx(p.x) - px) < Math.abs(sx(best.x) - px)) best = p;
    setHover(best.x);
    setTip({ x: sx(best.x), y: best.y === null ? height / 2 : sy(best.y) - 10, content: format(best) });
  }

  return (
    <figure className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onPointerMove={move}
          onPointerLeave={() => {
            setTip(null);
            setHover(null);
          }}
        >
          {startX !== null && startX > 0 && <rect x={0} y={0} width={startX} height={height} className="chart-pre" />}
          <path d={area} className="chart-area" />
          <path d={line} className="chart-line" />
          {startX !== null && <line x1={startX} x2={startX} y1={0} y2={height} className="chart-start" />}
          {hover !== null && <line x1={sx(hover)} x2={sx(hover)} y1={0} y2={height} className="chart-cross" />}
          {last && <circle cx={sx(last.x)} cy={sy(last.y)} r={4} className="chart-dot" />}
        </svg>
      )}
      <Tooltip tip={tip} />
    </figure>
  );
}

export type Series = { key: string; label: string; short: string; color: string; values: (number | null)[] };

/** Multi-series line chart on one axis with legend, direct end labels and a crosshair readout. */
export function LineChart({
  xs,
  series,
  height = 240,
  xLabel,
  format,
  caption,
}: {
  xs: number[];
  series: Series[];
  height?: number;
  xLabel: (x: number) => string;
  format: (v: number) => string;
  caption: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const left = 34;
  const right = 30;
  const top = 12;
  const bottom = 26;
  const plotW = Math.max(0, width - left - right);
  const plotH = height - top - bottom;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const maxV = Math.max(1, ...all);
  const tickStep = maxV > 4 ? Math.ceil(maxV / 4) : maxV > 2 ? 1 : 0.5;
  const yMax = Math.ceil(maxV / tickStep) * tickStep;
  const ticks = Array.from({ length: Math.round(yMax / tickStep) + 1 }, (_, i) => i * tickStep);
  const sx = (i: number) => left + (xs.length > 1 ? (i / (xs.length - 1)) * plotW : plotW / 2);
  const sy = (v: number) => top + plotH - (v / yMax) * plotH;

  function move(e: React.PointerEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    xs.forEach((_, i) => {
      if (Math.abs(sx(i) - px) < Math.abs(sx(best) - px)) best = i;
    });
    setHover(best);
  }

  return (
    <figure className="chart" ref={ref} style={{ height: height + 34 }}>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={caption} onPointerMove={move} onPointerLeave={() => setHover(null)}>
          {ticks.map((tv) => (
            <g key={tv}>
              <line x1={left} x2={left + plotW} y1={sy(tv) + 0.5} y2={sy(tv) + 0.5} className={tv === 0 ? 'chart-axis' : 'chart-grid'} />
              <text x={left - 6} y={sy(tv) + 4} textAnchor="end" className="chart-tick">
                {format(tv)}
              </text>
            </g>
          ))}
          {xs.map((x, i) => (
            <text key={x} x={sx(i)} y={height - 6} textAnchor="middle" className="chart-tick">
              {xLabel(x)}
            </text>
          ))}
          {hover !== null && <line x1={sx(hover)} x2={sx(hover)} y1={top} y2={top + plotH} className="chart-cross" />}
          {series.map((s) => {
            const pts = s.values.map((v, i) => (v === null ? null : ([sx(i), sy(v)] as const))).filter(Boolean) as (readonly [number, number])[];
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join('');
            const end = pts[pts.length - 1];
            return (
              <g key={s.key}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {end && (
                  <>
                    <circle cx={end[0]} cy={end[1]} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                    <text x={end[0] + 8} y={end[1] + 4} className="chart-endlabel">
                      {s.short}
                    </text>
                  </>
                )}
                {hover !== null && s.values[hover] !== null && <circle cx={sx(hover)} cy={sy(s.values[hover]!)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <div className="chart-tip" style={{ left: sx(hover), top: 30 }} role="status">
          <b className="chart-tip__title">{xLabel(xs[hover])}</b>
          {series.map((s) => (
            <span key={s.key} className="chart-tip__row">
              <i style={{ background: s.color }} />
              <b>{s.values[hover] === null ? '—' : format(s.values[hover]!)}</b> {s.label}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

/** "Table" toggle for chart cards — the accessible twin of every chart. */
export function useTableToggle() {
  const [table, setTable] = useState(false);
  return { table, toggle: () => setTable((v) => !v) };
}
