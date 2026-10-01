import { Cloud, Droplet, Store, Ticket } from 'lucide-react';
import { useI18n } from '../i18n';
import { CupIcon } from '../ui/icons';
import { LineChart, useTableToggle } from '../ui/charts';
import { IconChip } from '../ui/kit';
import { ARM_COLORS, ArmBadge, TableToggle } from './Overview';
import { Card, Page, useLoad } from './Pages';

type Band = { value: number; low: number; high: number };
type Analysis = {
  week: number;
  environment: {
    cups: number;
    plasticKg: Band;
    co2eKg: Band;
    perParticipant: number | null;
    outletSavingsVnd: number;
    discountsVnd: number;
    coefficients: { plasticGramsPerCup: number; co2eGramsPerCup: number; uncertainty: number };
    series: { week: number; cups: number; cumulative: number }[];
  };
  h1: {
    clusters: { cluster: string; startWeek: number; pre: number | null; post: number | null; diffPp: number | null }[];
    pre: number | null;
    post: number | null;
    diffPp: number | null;
    series: { week: number; share: number | null }[];
  };
  h2: {
    retentionCurves: { arm: string; letter: string; values: (number | null)[] }[];
    withdrawal: { rewardsEnd: string; started: boolean; arms: { arm: string; letter: string; before: number | null; after: number | null }[] };
  };
  h3: {
    technology: {
      method: string;
      scans: number;
      timed: number;
      p25: number | null;
      median: number | null;
      p75: number | null;
      users: number;
      scansPerWeek: number | null;
      retentionW4: number | null;
    }[];
  };
  heatmap: { dow: number; hour: number; n: number }[];
};

export function AnalysisPage() {
  const { t, f } = useI18n();
  const a = t.console.analysis;
  const { data, error } = useLoad<Analysis>('/api/admin/analysis');
  const retentionTable = useTableToggle();
  if (!data) return error ? <p className="error-box">{error}</p> : <p className="muted">{t.common.loading}</p>;
  const e = data.environment;
  const kg = (b: Band) => (
    <>
      {f.num(b.value, 1)}
      <small> kg</small>
      <span className="cs-range">
        ({f.num(b.low, 1)}–{f.num(b.high, 1)})
      </span>
    </>
  );
  const pp = (x: number | null) => (x === null ? '—' : `${x > 0 ? '+' : ''}${f.num(x, 1)} pp`);
  const secs = (ms: number | null) => (ms === null ? '—' : a.seconds(f.num(ms / 1000, 1)));

  return (
    <Page title={a.title} sub={a.sub}>
      <Card title={a.envTitle} sub={a.envSub(Math.round(e.coefficients.uncertainty * 100))}>
        <div className="cs-kpis">
          <Tile
            tone="green"
            icon={<CupIcon size={20} />}
            label={a.cups}
            value={f.num(e.cups)}
            note={e.perParticipant === null ? undefined : a.perPerson(f.num(e.perParticipant, 1))}
          />
          <Tile tone="blue" icon={<Droplet size={20} />} label={a.plastic} value={kg(e.plasticKg)} />
          <Tile tone="purple" icon={<Cloud size={20} />} label={a.co2} value={kg(e.co2eKg)} />
          <Tile tone="yellow" icon={<Store size={20} />} label={a.savings} value={f.vndShort(e.outletSavingsVnd)} />
          <Tile tone="red" icon={<Ticket size={20} />} label={a.discounts} value={f.vndShort(e.discountsVnd)} />
        </div>
        {e.series.length > 1 && (
          <LineChart
            xs={e.series.map((p) => p.week)}
            series={[{ key: 'cum', label: a.cumulative, short: '', color: 'var(--green)', values: e.series.map((p) => p.cumulative) }]}
            xLabel={(w) => String(w)}
            format={(v) => f.num(v)}
            caption={a.cumulative}
            height={200}
          />
        )}
        <p className="muted small">{a.coefNote(e.coefficients.plasticGramsPerCup, e.coefficients.co2eGramsPerCup)}</p>
      </Card>

      <div className="cs-grid">
        <Card title={a.h1Title} sub={a.h1Sub}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.console.overview.colCluster}</th>
                  <th className="num">{a.colBefore}</th>
                  <th className="num">{a.colAfter}</th>
                  <th className="num">{a.colDiff}</th>
                </tr>
              </thead>
              <tbody>
                {data.h1.clusters.map((c) => (
                  <tr key={c.cluster}>
                    <td className="cs-strong">
                      {t.console.overview.cluster(c.cluster)} <span className="muted small">· {t.console.overview.starts(c.startWeek)}</span>
                    </td>
                    <td className="num">{f.pct(c.pre)}</td>
                    <td className="num cs-strong">{f.pct(c.post)}</td>
                    <td className="num cs-good">{pp(c.diffPp)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="cs-strong">{a.pooled}</td>
                  <td className="num">{f.pct(data.h1.pre)}</td>
                  <td className="num cs-strong">{f.pct(data.h1.post)}</td>
                  <td className="num cs-good">{pp(data.h1.diffPp)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {data.h1.series.length > 1 && (
            <LineChart
              xs={data.h1.series.map((p) => p.week)}
              series={[{ key: 'share', label: a.weeklyShare, short: '', color: 'var(--green)', values: data.h1.series.map((p) => p.share) }]}
              xLabel={(w) => String(w)}
              format={(v) => f.pct(v)}
              caption={a.weeklyShare}
              height={180}
            />
          )}
        </Card>

        <Card title={a.withdrawalTitle} sub={a.withdrawalSub(f.date(data.h2.withdrawal.rewardsEnd))}>
          <table>
            <thead>
              <tr>
                <th>{t.console.overview.colArm}</th>
                <th className="num">{a.before}</th>
                <th className="num">{a.after}</th>
              </tr>
            </thead>
            <tbody>
              {data.h2.withdrawal.arms.map((r) => (
                <tr key={r.arm}>
                  <td className="cs-strong cs-nowrap">
                    <ArmBadge arm={r.arm} letter={r.letter} /> {t.console.arms[r.arm]}
                  </td>
                  <td className="num">{r.before === null ? '—' : f.num(r.before, 2)}</td>
                  <td className="num cs-strong">{r.after === null ? '—' : f.num(r.after, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.h2.withdrawal.started && <p className="muted small">{a.notYet}</p>}
        </Card>
      </div>

      <Card title={a.h2Title} sub={a.h2Sub} action={<TableToggle state={retentionTable} />}>
        {retentionTable.table ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: 8 }, (_, k) => (
                    <th key={k} className="num">
                      {k + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.h2.retentionCurves.map((c) => (
                  <tr key={c.arm}>
                    <th scope="row">
                      {c.letter} · {t.console.arms[c.arm]}
                    </th>
                    {c.values.map((v, k) => (
                      <td key={k} className="num">
                        {f.pct(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <LineChart
            xs={[1, 2, 3, 4, 5, 6, 7, 8]}
            series={data.h2.retentionCurves.map((c) => ({
              key: c.arm,
              label: `${c.letter} · ${t.console.arms[c.arm]}`,
              short: c.letter,
              color: ARM_COLORS[c.arm],
              values: c.values,
            }))}
            xLabel={(k) => a.weekK(k)}
            format={(v) => f.pct(v)}
            caption={a.h2Title}
          />
        )}
      </Card>

      <Card title={a.h3Title} sub={a.h3Sub}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{a.colMethod}</th>
                <th className="num">{a.colScans}</th>
                <th className="num">{a.colTimed}</th>
                <th className="num">{a.colMedian}</th>
                <th className="num">{a.colIqr}</th>
                <th className="num">{a.colUsers}</th>
                <th className="num">{a.colPerWeek}</th>
                <th className="num">{a.colRet4}</th>
              </tr>
            </thead>
            <tbody>
              {data.h3.technology.map((m) => (
                <tr key={m.method}>
                  <td className="cs-strong">{m.method.toUpperCase()}</td>
                  <td className="num">{f.num(m.scans)}</td>
                  <td className="num muted">{f.num(m.timed)}</td>
                  <td className="num cs-strong">{secs(m.median)}</td>
                  <td className="num muted cs-nowrap">{m.p25 === null ? '—' : `${f.num(m.p25 / 1000, 1)}–${f.num((m.p75 ?? 0) / 1000, 1)} s`}</td>
                  <td className="num">{f.num(m.users)}</td>
                  <td className="num">{m.scansPerWeek === null ? '—' : f.num(m.scansPerWeek, 2)}</td>
                  <td className="num cs-good">{f.pct(m.retentionW4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title={a.heatTitle} sub={a.heatSub}>
        <Heatmap cells={data.heatmap} />
      </Card>
    </Page>
  );
}

function Tile({
  tone,
  icon,
  label,
  value,
  note,
}: {
  tone: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="cs-kpi">
      <div className="row">
        <IconChip tone={tone}>{icon}</IconChip>
        <span className="cs-kpi__label">{label}</span>
      </div>
      <b className="cs-kpi__value cs-kpi__value--md">{value}</b>
      {note && <span className="muted small">{note}</span>}
    </section>
  );
}

/** Weekday × hour, one green hue from light (few) to dark (many); values on hover and in the cell title. */
function Heatmap({ cells }: { cells: { dow: number; hour: number; n: number }[] }) {
  const { t } = useI18n();
  const a = t.console.analysis;
  const days = [1, 2, 3, 4, 5, 6, ...(cells.some((c) => c.dow === 0) ? [0] : [])];
  const hours = cells.length ? cells.map((c) => c.hour) : [7, 18];
  const from = Math.min(7, ...hours);
  const to = Math.max(18, ...hours);
  const max = Math.max(1, ...cells.map((c) => c.n));
  const get = (d: number, h: number) => cells.find((c) => c.dow === d && c.hour === h)?.n ?? 0;
  const label = (d: number) => t.weekdays[(d + 6) % 7];
  return (
    <div className="cs-heat-wrap">
      <div className="cs-heat" style={{ gridTemplateColumns: `36px repeat(${to - from + 1}, minmax(16px, 1fr))` }}>
        <span />
        {Array.from({ length: to - from + 1 }, (_, i) => (
          <span key={i} className="cs-heat__h">
            {(from + i) % 2 === 0 ? from + i : ''}
          </span>
        ))}
        {days.map((d) => (
          <Row key={d} label={label(d)}>
            {Array.from({ length: to - from + 1 }, (_, i) => {
              const n = get(d, from + i);
              const pct = Math.round(15 + (n / max) * 85);
              return (
                <i key={i} title={`${label(d)} ${from + i}:00 · ${n}`} style={{ background: n ? `color-mix(in srgb, #1b5a2d ${pct}%, #e9f6ec)` : '#f3f6f4' }} />
              );
            })}
          </Row>
        ))}
      </div>
      <div className="cs-heat__legend">
        {a.less}
        <i />
        {a.more} · max {max}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="cs-heat__d">{label}</span>
      {children}
    </>
  );
}
