import { LogOut, Monitor } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LangSwitch, useI18n } from '../i18n';
import { calibrate, WEDGE_FORMATS, type WedgeFormat } from '../scan/uid';
import { webNfcSupported } from '../scan/webnfc';
import { Toggle } from '../ui/kit';
import { useTerminal } from './terminal';

export function HelpTab() {
  const term = useTerminal();
  const { t } = useI18n();
  const h = t.vendor.help;
  const s = term.settings;

  return (
    <>
      <section className="card stack">
        <h2>{h.howTitle}</h2>
        <ol className="vd-steps">
          {h.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="card stack">
        <h2>{h.stationTitle}</h2>
        <p className="muted">{h.stationBody}</p>
        <Link to="/vendor/station" className="plain-btn center">
          <Monitor size={18} style={{ verticalAlign: '-3px' }} /> {h.openStation}
        </Link>
      </section>

      <section className="card vd-settings">
        <h2>{h.devices}</h2>
        <div>
          <span className="grow">
            <b>{h.usb}</b>
            <span>{h.states[s.usb ? 'on' : 'off']}</span>
          </span>
          <Toggle checked={s.usb} onChange={(v) => term.setSettings({ usb: v })} label={h.usb} />
        </div>
        {s.usb && (
          <label className="field">
            {h.format}
            <select value={s.usbFormat} onChange={(e) => term.setSettings({ usbFormat: e.target.value as WedgeFormat })}>
              {WEDGE_FORMATS.map((fm) => (
                <option key={fm.id} value={fm.id}>
                  {h.formats[fm.id]}
                </option>
              ))}
            </select>
          </label>
        )}
        <div>
          <span className="grow">
            <b>{h.bridge}</b>
            <span>
              {s.bridge ? h.states[term.bridge.state] : h.states.off}
              {term.bridge.readerName ? ` · ${term.bridge.readerName}` : ''}
            </span>
          </span>
          <Toggle checked={s.bridge} onChange={(v) => term.setSettings({ bridge: v })} label={h.bridge} />
        </div>
        {s.bridge && (
          <label className="field">
            {h.bridgeUrl}
            <input value={s.bridgeUrl} onChange={(e) => term.setSettings({ bridgeUrl: e.target.value })} />
          </label>
        )}
        <div>
          <span className="grow">
            <b>{h.webNfc}</b>
            <span>{webNfcSupported() ? h.states[term.webNfc === 'on' ? 'on' : term.webNfc === 'error' ? 'error' : 'off'] : h.unsupported}</span>
          </span>
          {webNfcSupported() && (
            <button className="plain-btn" onClick={term.toggleWebNfc}>
              {term.webNfc === 'on' ? h.webNfcStop : h.webNfcStart}
            </button>
          )}
        </div>
        <div>
          <span className="grow">
            <b>{h.timer}</b>
          </span>
          <Toggle checked={s.timer} onChange={(v) => term.setSettings({ timer: v })} label={h.timer} />
        </div>
      </section>

      <Calibration />

      <section className="card vd-settings">
        <div>
          <span className="grow">
            <b>{h.language}</b>
          </span>
          <LangSwitch />
        </div>
        <button className="vd-signout" onClick={term.logout}>
          <LogOut size={18} /> {h.signOut}
        </button>
      </section>
    </>
  );
}

/** Keyboard-wedge readers differ in what they type for the same tag: show and match it. */
function Calibration() {
  const term = useTerminal();
  const { t } = useI18n();
  const h = t.vendor.help;
  const [realUid, setRealUid] = useState('');
  const burst = term.burst;
  const rows = burst ? calibrate(burst.raw, realUid) : [];
  const partial = rows.some((r) => r.match === 'prefix' || r.match === 'suffix') && !rows.some((r) => r.match === 'full');
  return (
    <details className="card vd-calibrate" open={!!burst && !rows.find((r) => r.format === term.settings.usbFormat)?.hex}>
      <summary>{h.calibrate}</summary>
      <p className="muted small">{h.calibrateBody}</p>
      <label className="field">
        {h.realUid}
        <input value={realUid} onChange={(e) => setRealUid(e.target.value)} placeholder="04:A2:3B:4C:5D:6E:7F" />
      </label>
      {!burst ? (
        <p className="notice">{h.waiting}</p>
      ) : (
        <>
          <p>
            {h.readerSent}: <code className="vd-raw">{burst.raw}</code>
            <br />
            <span className="muted small">{h.burstInfo(burst.raw.length, burst.terminator, burst.maxGapMs)}</span>
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{h.colFormat}</th>
                  <th>{h.colUid}</th>
                  <th>{h.colMatch}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.format}>
                    <td>{h.formats[r.format]}</td>
                    <td>
                      <code>{r.hex ?? h.invalid}</code>
                    </td>
                    <td>{realUid ? (r.match === 'full' ? h.full : r.match === 'prefix' ? h.prefix : r.match === 'suffix' ? h.suffix : '✘') : ''}</td>
                    <td>
                      {r.hex &&
                        (r.format === term.settings.usbFormat ? (
                          <b>{h.inUse}</b>
                        ) : (
                          <button className="plain-btn" onClick={() => term.setSettings({ usbFormat: r.format })}>
                            {h.use}
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {partial && <p className="notice small">{h.partialNote}</p>}
        </>
      )}
      <label className="field">
        {h.gap}
        <input type="number" min={20} max={300} value={term.settings.usbGapMs} onChange={(e) => term.setSettings({ usbGapMs: Number(e.target.value) || 50 })} />
      </label>
    </details>
  );
}
