import { useState } from 'react';
import { Download, Upload, Languages, Moon, Sun, Monitor, Database, Trash2 } from 'lucide-react';
import { useStore } from '../application/store';
import { exportJSON, importJSON, statsCSV, SettingsRepo } from '../database/sqlite';
import { PRAYERS, PRAYER_DEFAULTS } from '../domain/prayer';
import { uiSoundsEnabled, setUiSounds, playCue, getCueVolume, setCueVolume } from '../audio/cues';

export function Settings() {
  const s = useStore();
  const [rtl, setRtl] = useState(() => document.documentElement.dir === 'rtl');
  const [atmo, setAtmo] = useState(() => { try { return localStorage.getItem('wa.atmosphere') ?? 'on'; } catch { return 'on'; } });
  const [sounds, setSounds] = useState(() => uiSoundsEnabled());
  const [cueVol, setCueVol] = useState(() => getCueVolume());
  const [msg, setMsg] = useState('');
  const [shortBrk, setShortBrk] = useState(SettingsRepo.get('focus.shortBreak', '5'));
  const [longBrk, setLongBrk] = useState(SettingsRepo.get('focus.longBreak', '15'));

  const doExport = async () => {
    const json = exportJSON();
    if ((window as any).wa?.exportFile) {
      await (window as any).wa.exportFile(`winter-arc-backup-${s.todayKey}.json`, json);
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `winter-arc-backup-${s.todayKey}.json`;
      a.click();
    }
    s.notify('Backup exported.');
  };

  const doCSV = async () => {
    if (!s.arc) return;
    const csv = statsCSV(s.arc.id);
    if ((window as any).wa?.exportFile) await (window as any).wa.exportFile(`winter-arc-stats-${s.todayKey}.csv`, csv);
    else {
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `winter-arc-stats-${s.todayKey}.csv`; a.click();
    }
    s.notify('Statistics CSV exported.');
  };

  const doImport = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      const text = await f.text();
      const r = importJSON(text);
      setMsg(r.ok ? 'Import successful. Data restored.' : (r.error ?? 'Import failed.'));
      s.notify(r.ok ? 'Import successful.' : 'Import failed — nothing changed.');
    };
    inp.click();
  };

  return (
    <div className="page">
      <div className="hero-kicker">SETTINGS</div>
      <h1 style={{ fontSize: 32, letterSpacing: '-0.02em', margin: '8px 0' }}>Quiet preferences</h1>

      <div className="section">
        <div className="section-head"><h2>APPEARANCE</h2></div>
        <div className="toolbar">
          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Theme</span>
          <div className="theme-seg" role="group" aria-label="Theme">
            {[['system', Monitor], ['light', Sun], ['dark', Moon]].map(([v, Icon]: any) => (
              <button key={v} className={s.theme === v ? 'on' : ''} onClick={() => s.setTheme(v)}><Icon size={13} style={{ verticalAlign: -2 }} /> {v}</button>
            ))}
          </div>
          <button className="btn ghost" onClick={() => {
            const next = !rtl;
            setRtl(next);
            document.documentElement.dir = next ? 'rtl' : 'ltr';
            document.documentElement.lang = next ? 'ar' : 'en';
          }}><Languages size={14} /> {rtl ? 'RTL · عربي' : 'LTR · English'}</button>
        </div>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Atmosphere</span>
          <div className="theme-seg" role="group" aria-label="Atmosphere">
            {[['on', 'Alive'], ['off', 'Still']].map(([v, label]) => (
              <button key={v} className={atmo === v ? 'on' : ''} onClick={() => {
                setAtmo(v);
                try { localStorage.setItem('wa.atmosphere', v); } catch { /* noop */ }
                window.dispatchEvent(new Event('wa:atmosphere'));
              }}>{label}</button>
            ))}
          </div>
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>living night backdrop · rests when reduced-motion is on</span>
        </div>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Interface sounds</span>
          <div className="theme-seg" role="group" aria-label="Interface sounds">
            {[true, false].map((v) => (
              <button key={String(v)} className={sounds === v ? 'on' : ''} onClick={() => { setSounds(v); setUiSounds(v); }}>{v ? 'On' : 'Off'}</button>
            ))}
          </div>
          <button className="btn ghost" onClick={() => playCue('session')}>Preview</button>
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>soft cold-bell cues · never for slips</span>
        </div>
        {sounds && (
          <div className="toolbar" style={{ marginTop: 8 }}>
            <span style={{ color: 'var(--text-2)', fontSize: 13 }}>Cue volume</span>
            <input type="range" min={0} max={100} value={Math.round(cueVol * 100)}
              onChange={(e) => { const v = Number(e.target.value) / 100; setCueVolume(v); setCueVol(v); }}
              aria-label="Interface sounds volume" style={{ maxWidth: 220, accentColor: 'var(--frost)' }} />
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-head"><h2>FOCUS DEFAULTS</h2><span className="hint">pomodoro or pure focus</span></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>Short break (min)</label><input className="input num" value={shortBrk} onChange={(e) => { setShortBrk(e.target.value); SettingsRepo.set('focus.shortBreak', e.target.value); }} /></div>
          <div className="field" style={{ flex: 1 }}><label>Long break (min)</label><input className="input num" value={longBrk} onChange={(e) => { setLongBrk(e.target.value); SettingsRepo.set('focus.longBreak', e.target.value); }} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>PRAYER TIMES</h2><span className="hint">constants · set your local mosque times</span></div>
        <PrayerEditor />
        <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>These anchors draw the ember lines on your Timeline — work visibly sits in the windows between them. Stored locally, works offline.</p>
      </div>

      <div className="section">
        <div className="section-head"><h2>DATA · BACKUP</h2><span className="hint"><Database size={12} /> SQLite embedded · offline</span></div>
        <div className="toolbar" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={doExport}><Download size={14} /> Export JSON</button>
          <button className="btn" onClick={doCSV}><Download size={14} /> Stats CSV</button>
          <button className="btn ghost" onClick={doImport}><Upload size={14} /> Import backup</button>
        </div>
        {msg && <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{msg}</p>}
        <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>Backups validate before touching the database — a bad file never deletes good data. Storage: app user-data folder (Electron) + browser localStorage fallback.</p>
        <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={async () => {
          if (!confirm('Delete ALL Winter Arc data on this device? This cannot be undone.')) return;
          try { await (window as any).wa?.dbDelete?.(); } catch { /* file may not exist */ }
          try { localStorage.clear(); } catch { /* noop */ }
          location.reload();
        }}><Trash2 size={14} /> Reset all local data</button>
      </div>
    </div>
  );
}

function PrayerEditor() {
  const [, force] = useState(0);
  return (
    <div>
      {PRAYERS.map((p) => {
        const v = SettingsRepo.get('prayer.' + p.id, PRAYER_DEFAULTS[p.id]);
        return (
          <div key={p.id} className="prayer-row">
            <span className="ar" style={{ fontSize: 16 }}>{p.ar}</span>
            <span style={{ fontWeight: 650 }}>{p.name}</span>
            <input
              className="input num prayer-time"
              type="time"
              value={v}
              onChange={(e) => { SettingsRepo.set('prayer.' + p.id, e.target.value); force((x) => x + 1); }}
              aria-label={`${p.name} time`}
            />
          </div>
        );
      })}
    </div>
  );
}
