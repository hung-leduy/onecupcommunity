import { ChartLine, Check, Lock, RefreshCw, Table as TableIcon, TriangleAlert, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { errorText, useI18n } from '../i18n';
import { CupIcon, FlameIcon } from '../ui/icons';
import { Sparkline, useTableToggle } from '../ui/charts';
import { IconChip } from '../ui/kit';
import { useAdmin, type Settings } from './ConsoleApp';

export type ArmRow = { arm: string; letter: string; n: number; scansPerWeek: number | null; retentionW8: number | null };
type OverviewData = {
  settings: Settings;
  week: number;
  vendorsCount: number;
  kpis: {
    participants: number;
    newThisWeek: number;
    activeThisWeek: number;
    activeChange: number | null;
    verifiedScans: number;
    reuseShare: number | null;
    reuseShareBaseline: number | null;
    retentionW8: number | null;
  };
  clusters: { cluster: string; vendors: string[]; startWeek: number; series: { week: number; share: number | null }[]; current: number | null }[];
  arms: ArmRow[];
  vendors: { id: string; name: string; cluster: string; share: number | null; scans: number; staffShare: number | null }[];
  quality: { l1: number; l2: number; l3: number; flagsThisWeek: number; unlinkedScans: number };
};

/** Ordinal ramp for the cumulative arms A → D (validated: monotone, ≥ 2:1 light end on white). */
export const ARM_COLORS: Record<string, string> = { control: '#6fbf83', feedback: '#45a45c', gamification: '#2c8142', rewards: '#1b5a2d' };

export function ArmBadge({ arm, letter }: { arm: string; letter: string }) {
  return (
    <span className="cs-arm" style={{ background: ARM_COLORS[arm], color: arm === 'control' || arm === 'feedback' ? 'var(--ink)' : '#fff' }}>
      {letter}
    </span>
  );
}

export function ArmsTable({ arms }: { arms: ArmRow[] }) {
  const { t, f } = useI18n();
  const o = t.console.overview;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{o.colArm}</th>
            <th />
            <th className="num">{o.colN}</th>
            <th className="num">{o.colScans}</th>
            <th className="num">{o.colRetention}</th>
          </tr>
        </thead>
        <tbody>
          {arms.map((a) => (
            <tr key={a.arm}>
              <td style={{ width: 44 }}>
                <ArmBadge arm={a.arm} letter={a.letter} />
              </td>
              <td className="cs-strong cs-nowrap">{t.console.arms[a.arm]}</td>
              <td className="num muted">{a.n}</td>
              <td className="num cs-strong">{a.scansPerWeek === null ? '—' : f.num(a.scansPerWeek, 1)}</td>
              <td className="num cs-good">{f.pct(a.retentionW8)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Switch between a chart and its table twin. */
export function TableToggle({ state }: { state: { table: boolean; toggle: () => void } }) {
  const { t } = useI18n();
  const label = state.table ? t.console.chart : t.console.table;
  return (
    <button className="icon-btn boxed" onClick={state.toggle} aria-label={label} title={label}>
      {state.table ? <ChartLine size={18} /> : <TableIcon size={18} />}
    </button>
  );
}

export function Meter({ value, max, tone }: { value: number; max: number; tone: 'green' | 'blue' | 'gray' }) {
  return (
    <div className={`cs-meter cs-meter--${tone}`}>
      <i style={{ width: `${max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%` }} />
    </div>
  );
}

export function QualityBars({ q }: { q: { l1: number; l2: number; l3: number } }) {
  const { t, f } = useI18n();
  const o = t.console.overview;
  const max = Math.max(q.l1, q.l2, q.l3, 1);
  return (
    <div className="cs-quality">
      {(
        [
          [o.l1, q.l1, 'green'],
          [o.l2, q.l2, 'blue'],
          [o.l3, q.l3, 'gray'],
        ] as const
      ).map(([label, n, tone]) => (
        <div key={label}>
          <div className="row between">
            <span>{label}</span>
            <b>{f.num(n)}</b>
          </div>
          <Meter value={n} max={max} tone={tone} />
        </div>
      ))}
    </div>
  );
}

function Kpi({ icon, tone, label, value, delta, deltaTone, note }: { icon: ReactNode; tone: 'green' | 'blue' | 'purple' | 'yellow'; label: string; value: ReactNode; delta?: string | null; deltaTone?: 'green' | 'blue' | 'gray'; note?: string }) {
  return (
    <section className="cs-kpi">
      <div className="row">
        <IconChip tone={tone}>{icon}</IconChip>
        <span className="cs-kpi__label">{label}</span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
        <b className="cs-kpi__value">{value}</b>
        {delta && <span className={`cs-delta cs-delta--${deltaTone ?? 'green'}`}>{delta}</span>}
      </div>
      {note && <span className="muted small">{note}</span>}
    </section>
  );
}

export function Overview() {
  const { call } = useAdmin();
  const { t, f } = useI18n();
  const o = t.console.overview;
  const [weeks, setWeeks] = useState<number | 0>(0);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clusterTable = useTableToggle();

  const load = useCallback(() => {
    setLoading(true);
    call<OverviewData>(`/api/admin/overview${weeks ? `?weeks=${weeks}` : ''}`).then(
      (d) => {
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(errorText(t, e));
        setLoading(false);
      },
    );
  }, [call, weeks, t]);
  useEffect(load, [load]);

  if (!data) return error ? <p className="error-box">{error}</p> : <p className="muted">{t.common.loading}</p>;
  const k = data.kpis;
  const s = data.settings;
  const signed = (x: number, text: string) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${text}`;
  const maxShare = Math.max(0.5, ...data.clusters.flatMap((c) => c.series.map((p) => p.share ?? 0)));
  const ppDelta = k.reuseShare !== null && k.reuseShareBaseline !== null ? Math.round((k.reuseShare - k.reuseShareBaseline) * 100) : null;

  return (
    <div className={`cs-page ${loading ? 'is-loading' : ''}`}>
      <header className="cs-head">
        <div>
          <h1>{o.title}</h1>
          <p>{o.sub(f.range(s.pilotStart, s.studyEnd), data.vendorsCount, k.participants)}</p>
        </div>
        <div className="row wrap">
          {s.demo && (
            <span className="cs-demo">
              <TriangleAlert size={18} /> {t.console.demo}
            </span>
          )}
          <select className="cs-select" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} aria-label={t.console.weeks(s.pilotWeeks)}>
            <option value={0}>{t.console.allWeeks}</option>
            {[4, 8].map((w) => (
              <option key={w} value={w}>
                {t.console.weeks(w)}
              </option>
            ))}
          </select>
          <button className="icon-btn boxed" onClick={load} aria-label={t.console.refresh} title={t.console.refresh}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>
      {error && <p className="error-box">{error}</p>}

      <div className="cs-kpis">
        <Kpi icon={<Users size={20} />} tone="green" label={o.participants} value={f.num(k.participants)} delta={k.newThisWeek ? `+${k.newThisWeek}` : null} />
        <Kpi
          icon={<Zap size={20} />}
          tone="blue"
          label={o.active}
          value={f.num(k.activeThisWeek)}
          delta={k.activeChange === null ? null : signed(k.activeChange, f.pct(Math.abs(k.activeChange)))}
          deltaTone={k.activeChange !== null && k.activeChange < 0 ? 'gray' : 'blue'}
        />
        <Kpi icon={<Check size={20} />} tone="purple" label={o.verified} value={f.num(k.verifiedScans)} />
        <Kpi
          icon={<CupIcon size={20} />}
          tone="green"
          label={o.share}
          value={<>{k.reuseShare === null ? '—' : f.num(Math.round(k.reuseShare * 100))}<small>%</small></>}
          delta={ppDelta === null ? null : o.pp(signed(ppDelta, String(Math.abs(ppDelta))))}
          deltaTone={ppDelta !== null && ppDelta < 0 ? 'gray' : 'green'}
        />
        <Kpi
          icon={<FlameIcon size={20} />}
          tone="yellow"
          label={o.retention}
          value={k.retentionW8 === null ? '—' : <>{Math.round(k.retentionW8 * 100)}<small>%</small></>}
          note={k.retentionW8 === null ? o.notYet : undefined}
        />
      </div>

      <div className="cs-grid">
        <section className="card cs-card">
          <div className="cs-card__head">
            <div>
              <h2>{o.clustersTitle}</h2>
              <p>{o.clustersSub}</p>
            </div>
            <div className="cs-legend">
              <span>
                <i className="line" />
                {o.legendShare}
              </span>
              <span>
                <i className="dash" />
                {o.legendStart}
              </span>
              <span>
                <i className="box" />
                {o.legendBefore}
              </span>
              <TableToggle state={clusterTable} />
            </div>
          </div>
          {clusterTable.table ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th />
                    {data.clusters[0]?.series.map((p) => (
                      <th key={p.week} className="num">
                        {p.week}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.clusters.map((c) => (
                    <tr key={c.cluster}>
                      <th scope="row">{o.cluster(c.cluster)}</th>
                      {c.series.map((p) => (
                        <td key={p.week} className={`num ${p.week < c.startWeek ? 'muted' : ''}`}>
                          {f.pct(p.share)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cs-clusters">
              {data.clusters.map((c) => (
                <div key={c.cluster} className="cs-cluster">
                  <div className="cs-cluster__label">
                    <b>{o.cluster(c.cluster)}</b>
                    <span>{c.vendors.join(' · ')}</span>
                    <em>{o.starts(c.startWeek)}</em>
                  </div>
                  <div className="cs-cluster__chart">
                    {c.series.some((p) => p.share !== null) ? (
                      <Sparkline
                        points={c.series.map((p) => ({ x: p.week, y: p.share }))}
                        domain={[0, maxShare]}
                        start={c.startWeek}
                        height={74}
                        label={`${o.cluster(c.cluster)} — ${o.clustersTitle}`}
                        format={(p) => (
                          <>
                            <b>{f.pct(p.y)}</b> · {t.console.weekN(p.x)}
                          </>
                        )}
                      />
                    ) : (
                      <p className="muted small">{o.noShare}</p>
                    )}
                  </div>
                  <div className="cs-cluster__now">
                    <b>{f.pct(c.current)}</b>
                    <span>{o.now}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card cs-card">
          <div className="cs-card__head">
            <div>
              <h2>{o.armsTitle}</h2>
              <p>{o.armsSub}</p>
            </div>
          </div>
          <ArmsTable arms={data.arms} />
        </section>

        <section className="card cs-card">
          <div className="cs-card__head">
            <div>
              <h2>{o.vendorsTitle}</h2>
              <p>{o.vendorsSub}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="cs-vendors">
              <thead>
                <tr>
                  <th>{o.colVendor}</th>
                  <th>{o.colCluster}</th>
                  <th>{o.colShare}</th>
                  <th className="num">{o.colCount}</th>
                  <th className="num">{o.colStaff}</th>
                </tr>
              </thead>
              <tbody>
                {data.vendors.map((v) => (
                  <tr key={v.id}>
                    <td className="cs-strong">{v.name}</td>
                    <td>
                      <span className="cs-cluster-badge">{v.cluster}</span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Meter value={v.share ?? 0} max={maxShare} tone="green" />
                        <b className="cs-share">{f.pct(v.share)}</b>
                      </div>
                    </td>
                    <td className="num cs-strong">{f.num(v.scans)}</td>
                    <td className="num muted">{f.pct(v.staffShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card cs-card">
          <div className="cs-card__head">
            <div>
              <h2>{o.qualityTitle}</h2>
              <p>{o.qualitySub}</p>
            </div>
          </div>
          <QualityBars q={data.quality} />
          <p className="cs-flag">
            {data.quality.flagsThisWeek ? <TriangleAlert size={18} /> : <Lock size={18} />}
            {data.quality.flagsThisWeek ? o.flags(data.quality.flagsThisWeek) : o.noFlags}
          </p>
          {data.quality.unlinkedScans > 0 && <p className="muted small">{o.unlinked(data.quality.unlinkedScans)}</p>}
        </section>
      </div>
    </div>
  );
}
