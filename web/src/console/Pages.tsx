import { Download, Plus, Printer } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { download, type Cup } from '../api';
import { QrImage } from '../QrImage';
import { errorText, useI18n } from '../i18n';
import { ColumnChart, LineChart, useTableToggle } from '../ui/charts';
import { Btn3D, Toggle } from '../ui/kit';
import { useAdmin } from './ConsoleApp';
import { ARM_COLORS, ArmBadge, ArmsTable, QualityBars, TableToggle, type ArmRow } from './Overview';

const ARMS = ['control', 'feedback', 'gamification', 'rewards'];

function useLoad<T>(path: string) {
  const { call } = useAdmin();
  const { t } = useI18n();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    call<T>(path).then(
      (d) => {
        setData(d);
        setError(null);
      },
      (e) => setError(errorText(t, e)),
    );
  }, [call, path, t]);
  useEffect(reload, [reload]);
  return { data, error, reload, setData };
}

function Page({ title, sub, actions, children }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="cs-page">
      <header className="cs-head">
        <div>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        {actions && <div className="row wrap">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

function Card({ title, sub, action, children }: { title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card cs-card">
      <div className="cs-card__head">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ---- outlets, pilot settings and rewards ---------------------------------------------------------

type VendorRow = { id: string; name: string; pin: string; discountVnd: number; stationLabel: string | null; cluster: string };
type RewardRow = { id: string; titleVi: string; titleEn: string; cost: number; vendorId: string | null; vendor: string | null; active: boolean; issued: number; used: number };
const CLUSTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function VendorsPage() {
  const { call, settings, reloadSettings } = useAdmin();
  const { t, f } = useI18n();
  const p = t.console.vendorsPage;
  const vendors = useLoad<VendorRow[]>('/api/admin/vendors');
  const rewards = useLoad<RewardRow[]>('/api/admin/rewards');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const act = async (fn: () => Promise<unknown>) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: t.common.saved });
    } catch (e) {
      setMsg({ ok: false, text: errorText(t, e) });
    }
  };
  const patchVendor = (id: string, body: Partial<VendorRow>) => act(async () => {
    await call(`/api/admin/vendors/${id}`, { method: 'PATCH', body });
    vendors.reload();
  });

  const clustersInUse = [...new Set((vendors.data ?? []).map((v) => v.cluster))].sort();

  return (
    <Page title={p.title} sub={p.sub}>
      {msg && <p className={msg.ok ? 'notice' : 'error-box'}>{msg.text}</p>}
      <Card title={t.console.nav.vendors}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{p.name}</th>
                <th>{t.console.overview.colCluster}</th>
                <th>{p.station}</th>
                <th>{p.pin}</th>
                <th className="num">{p.discount}</th>
              </tr>
            </thead>
            <tbody>
              {vendors.data?.map((v) => (
                <tr key={v.id}>
                  <td>
                    <input className="cs-inline" defaultValue={v.name} onBlur={(e) => e.target.value !== v.name && patchVendor(v.id, { name: e.target.value })} aria-label={p.name} />
                  </td>
                  <td>
                    <select className="cs-inline" value={v.cluster} onChange={(e) => patchVendor(v.id, { cluster: e.target.value })} aria-label={t.console.overview.colCluster}>
                      {CLUSTERS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="cs-inline" defaultValue={v.stationLabel ?? ''} onBlur={(e) => e.target.value !== (v.stationLabel ?? '') && patchVendor(v.id, { stationLabel: e.target.value })} aria-label={p.station} />
                  </td>
                  <td>
                    <input className="cs-inline" defaultValue={v.pin} inputMode="numeric" onBlur={(e) => e.target.value !== v.pin && patchVendor(v.id, { pin: e.target.value })} aria-label={p.pin} />
                  </td>
                  <td className="num">
                    <input
                      className="cs-inline num"
                      defaultValue={v.discountVnd}
                      inputMode="numeric"
                      onBlur={(e) => Number(e.target.value) !== v.discountVnd && patchVendor(v.id, { discountVnd: Number(e.target.value) })}
                      aria-label={p.discount}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          className="cs-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            act(async () => {
              await call('/api/admin/vendors', {
                body: { name: fd.get('name'), pin: fd.get('pin'), cluster: fd.get('cluster'), stationLabel: fd.get('station'), discountVnd: Number(fd.get('discount') || 0) },
              });
              form.reset();
              vendors.reload();
            });
          }}
        >
          <input name="name" placeholder={p.name} required />
          <select name="cluster" defaultValue="A" aria-label={t.console.overview.colCluster}>
            {CLUSTERS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input name="station" placeholder={p.station} />
          <input name="pin" placeholder={p.pin} inputMode="numeric" required />
          <input name="discount" placeholder={p.discount} inputMode="numeric" />
          <Btn3D className="sm" icon={<Plus size={18} />}>
            {p.add}
          </Btn3D>
        </form>
      </Card>

      {settings && (
        <Card title={p.pilotTitle}>
          <form
            className="cs-form cs-form--grid"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const clusterStarts = Object.fromEntries(clustersInUse.map((c) => [c, Number(fd.get(`start-${c}`))]));
              act(async () => {
                await call('/api/admin/settings', {
                  method: 'PUT',
                  body: { pilotStart: fd.get('pilotStart'), pilotWeeks: Number(fd.get('pilotWeeks')), studyEnd: fd.get('studyEnd'), rewardsEnd: fd.get('rewardsEnd'), clusterStarts },
                });
                reloadSettings();
              });
            }}
          >
            <label className="field">
              {p.pilotStart}
              <input type="date" name="pilotStart" defaultValue={settings.pilotStart} required />
            </label>
            <label className="field">
              {p.pilotWeeks}
              <input type="number" name="pilotWeeks" min={1} max={52} defaultValue={settings.pilotWeeks} required />
            </label>
            <label className="field">
              {p.rewardsEnd}
              <input type="date" name="rewardsEnd" defaultValue={settings.rewardsEnd} required />
            </label>
            <label className="field">
              {p.studyEnd}
              <input type="date" name="studyEnd" defaultValue={settings.studyEnd} required />
            </label>
            {clustersInUse.map((c) => (
              <label key={c} className="field">
                {p.clusterStart(c)}
                <input type="number" name={`start-${c}`} min={1} max={52} defaultValue={settings.clusterStarts[c] ?? 1} required />
              </label>
            ))}
            <div className="row" style={{ alignSelf: 'end' }}>
              <Btn3D className="sm">{t.common.save}</Btn3D>
            </div>
          </form>
          <p className="muted small">{f.range(settings.pilotStart, settings.studyEnd)}</p>
        </Card>
      )}

      <Card title={p.rewardsTitle}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{p.titleVi}</th>
                <th>{p.titleEn}</th>
                <th className="num">{p.cost}</th>
                <th>{p.vendor}</th>
                <th className="num">{p.issued}</th>
                <th className="num">{p.used}</th>
                <th>{p.active}</th>
              </tr>
            </thead>
            <tbody>
              {rewards.data?.map((r) => (
                <tr key={r.id}>
                  <td className="cs-strong">{r.titleVi}</td>
                  <td>{r.titleEn}</td>
                  <td className="num">{r.cost}</td>
                  <td>{r.vendor ?? p.anyVendor}</td>
                  <td className="num">{r.issued}</td>
                  <td className="num">{r.used}</td>
                  <td>
                    <Toggle
                      checked={r.active}
                      label={p.active}
                      onChange={(v) =>
                        act(async () => {
                          rewards.setData(await call<RewardRow[]>(`/api/admin/rewards/${r.id}`, { method: 'PATCH', body: { active: v } }));
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          className="cs-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            act(async () => {
              rewards.setData(
                await call<RewardRow[]>('/api/admin/rewards', { body: { titleVi: fd.get('titleVi'), titleEn: fd.get('titleEn'), cost: Number(fd.get('cost')), vendorId: fd.get('vendorId') || null } }),
              );
              form.reset();
            });
          }}
        >
          <input name="titleVi" placeholder={p.titleVi} required />
          <input name="titleEn" placeholder={p.titleEn} />
          <input name="cost" placeholder={p.cost} inputMode="numeric" required />
          <select name="vendorId" defaultValue="" aria-label={p.vendor}>
            <option value="">{p.anyVendor}</option>
            {vendors.data?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <Btn3D className="sm" icon={<Plus size={18} />}>
            {p.addReward}
          </Btn3D>
        </form>
      </Card>
    </Page>
  );
}

// ---- participants ----------------------------------------------------------------------------

type FacultyRow = { faculty: string | null; total: number } & Record<string, number>;
type Participants = {
  total: number;
  byFaculty: FacultyRow[];
  registrations: { week: number; n: number }[];
  list: {
    participant: string;
    faculty: string | null;
    intake: string | null;
    arm: string;
    consentResearch: boolean;
    consentOpenData: boolean;
    cups: number;
    verified: number;
    unverified: number;
    lastActive: string | null;
  }[];
};

function FacultyTable({ rows }: { rows: FacultyRow[] }) {
  const { t } = useI18n();
  const p = t.console.participantsPage;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{p.faculty}</th>
            {ARMS.map((a, i) => (
              <th key={a} className="num">
                <ArmBadge arm={a} letter={'ABCD'[i]} />
              </th>
            ))}
            <th className="num">{p.total2}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.faculty ?? '-'}>
              <td className="cs-strong">{r.faculty ? (t.faculties[r.faculty] ?? r.faculty) : '—'}</td>
              {ARMS.map((a) => (
                <td key={a} className="num">
                  {r[a]}
                </td>
              ))}
              <td className="num cs-strong">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ParticipantsPage() {
  const { t, f } = useI18n();
  const p = t.console.participantsPage;
  const { data, error } = useLoad<Participants>('/api/admin/participants');
  const [limit, setLimit] = useState(100);
  if (!data) return error ? <p className="error-box">{error}</p> : <p className="muted">{t.common.loading}</p>;
  const research = data.list.filter((x) => x.consentResearch).length;
  const open = data.list.filter((x) => x.consentOpenData).length;
  const peak = Math.max(0, ...data.registrations.map((r) => r.n));

  return (
    <Page title={p.title} sub={p.sub}>
      <div className="cs-kpis cs-kpis--3">
        <section className="cs-kpi">
          <span className="cs-kpi__label">{p.total}</span>
          <b className="cs-kpi__value">{f.num(data.total)}</b>
        </section>
        <section className="cs-kpi">
          <span className="cs-kpi__label">{p.research}</span>
          <b className="cs-kpi__value">{f.pct(data.total ? research / data.total : null)}</b>
          <span className="muted small">{f.num(research)}</span>
        </section>
        <section className="cs-kpi">
          <span className="cs-kpi__label">{p.openData}</span>
          <b className="cs-kpi__value">{f.pct(data.total ? open / data.total : null)}</b>
          <span className="muted small">{f.num(open)}</span>
        </section>
      </div>
      <div className="cs-grid">
        <Card title={p.byFaculty}>
          <FacultyTable rows={data.byFaculty} />
        </Card>
        <Card title={p.registrations}>
          <ColumnChart
            tone="green"
            height={190}
            caption={p.registrations}
            data={data.registrations.map((r) => ({
              key: String(r.week),
              label: String(r.week),
              value: r.n,
              emphasis: r.n === peak,
              showValue: r.n === peak,
              tip: (
                <>
                  <b>{r.n}</b> · {t.console.weekN(r.week)}
                </>
              ),
            }))}
          />
        </Card>
      </div>
      <Card title={p.list} sub={p.showing(Math.min(limit, data.list.length), data.list.length)}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{p.colId}</th>
                <th>{p.faculty}</th>
                <th>{p.colIntake}</th>
                <th>{p.colArm}</th>
                <th className="num">{p.colCups}</th>
                <th className="num">{p.colVerified}</th>
                <th className="num">{p.colSelf}</th>
                <th>{p.colLast}</th>
                <th>{p.colConsent}</th>
              </tr>
            </thead>
            <tbody>
              {data.list.slice(0, limit).map((x) => (
                <tr key={x.participant}>
                  <td>
                    <code>{x.participant}</code>
                  </td>
                  <td>{x.faculty ? (t.faculties[x.faculty] ?? x.faculty) : '—'}</td>
                  <td>{x.intake ?? '—'}</td>
                  <td>
                    <ArmBadge arm={ARMS['ABCD'.indexOf(x.arm)] ?? 'control'} letter={x.arm} />
                  </td>
                  <td className="num">{x.cups}</td>
                  <td className="num cs-strong">{x.verified}</td>
                  <td className="num muted">{x.unverified}</td>
                  <td className="muted">{x.lastActive ? f.dateTime(x.lastActive) : '—'}</td>
                  <td className="muted small">{[x.consentResearch && 'R', x.consentOpenData && 'O'].filter(Boolean).join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {limit < data.list.length && (
          <button className="plain-btn" onClick={() => setLimit(limit + 200)}>
            +200
          </button>
        )}
      </Card>
    </Page>
  );
}

// ---- arms ------------------------------------------------------------------------------------

export function ArmsPage() {
  const { t, f } = useI18n();
  const p = t.console.armsPage;
  const { data, error } = useLoad<{ arms: ArmRow[]; weekly: { week: number; values: Record<string, number | null> }[]; byFaculty: FacultyRow[] }>('/api/admin/arms');
  const table = useTableToggle();
  if (!data) return error ? <p className="error-box">{error}</p> : <p className="muted">{t.common.loading}</p>;
  const series = ARMS.map((a, i) => ({ key: a, label: `${'ABCD'[i]} · ${t.console.arms[a]}`, short: 'ABCD'[i], color: ARM_COLORS[a], values: data.weekly.map((w) => w.values[a]) }));

  return (
    <Page title={p.title} sub={p.sub}>
      <div className="cs-grid">
        <Card title={t.console.overview.armsTitle} sub={t.console.overview.armsSub}>
          <ArmsTable arms={data.arms} />
        </Card>
        <Card title={t.console.participantsPage.byFaculty}>
          <FacultyTable rows={data.byFaculty} />
        </Card>
      </div>
      <Card title={p.weekly} sub={p.weeklySub} action={<TableToggle state={table} />}>
        {table.table ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  {data.weekly.map((w) => (
                    <th key={w.week} className="num">
                      {w.week}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.key}>
                    <th scope="row">{s.label}</th>
                    {s.values.map((v, i) => (
                      <td key={i} className="num">
                        {v === null ? '—' : f.num(v, 2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <LineChart xs={data.weekly.map((w) => w.week)} series={series} xLabel={(w) => String(w)} format={(v) => f.num(v, 1)} caption={p.weekly} />
        )}
      </Card>
    </Page>
  );
}

// ---- data quality ----------------------------------------------------------------------------

type Quality = {
  l1: number;
  l2: number;
  l3: number;
  flagsThisWeek: number;
  unlinkedScans: number;
  flags: { createdAt: string; reason: string; tier: number; vendor: string | null; cup: string; participant: string }[];
  unlinkedByVendor: { vendor: string; n: number }[];
  selfScanners: { participant: string; l3: number; total: number; share: number }[];
};

export function QualityPage() {
  const { t, f } = useI18n();
  const p = t.console.qualityPage;
  const o = t.console.overview;
  const { data, error } = useLoad<Quality>('/api/admin/quality');
  if (!data) return error ? <p className="error-box">{error}</p> : <p className="muted">{t.common.loading}</p>;
  return (
    <Page title={p.title} sub={o.qualitySub}>
      <div className="cs-grid">
        <Card title={o.qualityTitle}>
          <QualityBars q={data} />
          <p className="cs-flag">{data.flagsThisWeek ? o.flags(data.flagsThisWeek) : o.noFlags}</p>
        </Card>
        <Card title={p.unlinkedTitle} sub={o.unlinked(data.unlinkedScans)}>
          {data.unlinkedByVendor.length === 0 ? (
            <p className="muted">{p.none}</p>
          ) : (
            <table>
              <tbody>
                {data.unlinkedByVendor.map((r) => (
                  <tr key={r.vendor}>
                    <td className="cs-strong">{r.vendor}</td>
                    <td className="num">{r.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <Card title={p.selfTitle} sub={p.selfSub}>
        {data.selfScanners.length === 0 ? (
          <p className="muted">{p.none}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{p.colParticipant}</th>
                  <th className="num">{p.colShareL3}</th>
                  <th className="num">{p.colTotal}</th>
                </tr>
              </thead>
              <tbody>
                {data.selfScanners.map((r) => (
                  <tr key={r.participant}>
                    <td>
                      <code>{r.participant}</code>
                    </td>
                    <td className="num">{f.pct(r.share)}</td>
                    <td className="num">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title={p.flagsTitle}>
        {data.flags.length === 0 ? (
          <p className="muted">{p.none}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{p.colTime}</th>
                  <th>{p.colReason}</th>
                  <th>{p.colTier}</th>
                  <th>{p.colVendor}</th>
                  <th>{p.colCup}</th>
                  <th>{p.colParticipant}</th>
                </tr>
              </thead>
              <tbody>
                {data.flags.map((r, i) => (
                  <tr key={i}>
                    <td>{f.dateTime(r.createdAt)}</td>
                    <td>{p.reasons[r.reason] ?? r.reason}</td>
                    <td>L{r.tier}</td>
                    <td>{r.vendor ?? '—'}</td>
                    <td>
                      <code>{r.cup}</code>
                    </td>
                    <td>
                      <code>{r.participant || '—'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}

// ---- exports ---------------------------------------------------------------------------------

export function ExportPage() {
  const { key } = useAdmin();
  const { t } = useI18n();
  const p = t.console.exportPage;
  const today = new Date().toISOString().slice(0, 10);
  const items = [
    [p.scans, p.scansBody, '/api/admin/export/scans.csv', `onecup-research-scans-${today}.csv`],
    [p.open, p.openBody, '/api/admin/export/open-data.csv', `onecup-open-data-${today}.csv`],
    [p.days, p.daysBody, '/api/admin/export/vendor-days.csv', `onecup-vendor-days-${today}.csv`],
  ];
  return (
    <Page title={p.title} sub={p.sub}>
      <div className="cs-exports">
        {items.map(([title, body, path, file]) => (
          <section key={path} className="card cs-card">
            <h2>{title}</h2>
            <p className="muted">{body}</p>
            <Btn3D className="sm" icon={<Download size={18} />} onClick={() => download(path, file, { admin: key })}>
              {p.download}
            </Btn3D>
          </section>
        ))}
      </div>
    </Page>
  );
}

// ---- cups & labels ---------------------------------------------------------------------------

export function CupsPage() {
  const { call } = useAdmin();
  const { t, f } = useI18n();
  const p = t.console.cupsPage;
  const cups = useLoad<Cup[]>('/api/admin/cups');
  const [count, setCount] = useState(20);
  const printable = (cups.data ?? []).filter((c) => c.kind === 'qr' && !c.linked).map((c) => c.code);
  return (
    <Page
      title={p.title}
      sub={p.sub}
      actions={
        <>
          <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 90 }} aria-label={p.create} />
          <Btn3D className="sm" icon={<Plus size={18} />} onClick={async () => (await call('/api/admin/cups', { body: { count } }), cups.reload())}>
            {p.create}
          </Btn3D>
          <Link className="plain-btn" to={`/admin/print?codes=${printable.join(',')}`} target="_blank">
            <Printer size={18} /> {p.print}
          </Link>
        </>
      }
    >
      <Card title={`${t.console.nav.cups} (${cups.data?.length ?? 0})`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{p.colCode}</th>
                <th>{p.colKind}</th>
                <th>{p.colUid}</th>
                <th>{p.colLinked}</th>
                <th>{p.colCreated}</th>
              </tr>
            </thead>
            <tbody>
              {cups.data?.slice(0, 300).map((c) => (
                <tr key={c.id}>
                  <td className="cs-strong">{c.displayCode}</td>
                  <td>{c.kind.toUpperCase()}</td>
                  <td>
                    <code>{c.nfcUid ?? ''}</code>
                  </td>
                  <td>{c.linked ? '✔' : ''}</td>
                  <td className="muted">{f.dateTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}

/** Printable sheet of QR labels (laser engraving or sticker printing). */
export function PrintLabels() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const codes = (params.get('codes') ?? '').split(',').filter(Boolean);
  const origin = window.location.origin;
  return (
    <main className="cs-print">
      <p className="no-print">{t.console.cupsPage.printHint(codes.length, origin)}</p>
      <div className="cs-labels">
        {codes.map((code) => (
          <div key={code} className="cs-label">
            <QrImage value={`${origin}/c/${code}`} size={110} label={`OCC-${code}`} />
            <span>OCC-{code}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
