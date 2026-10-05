import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { query, SettingsRepo } from '../database/sqlite';
import { formatTime, calendarKey, addDaysKey } from '../domain/dates';
import { PRAYERS, resolveTimes, windowMinutes, formatCountdown } from '../domain/prayer';

export function Timeline() {
  const [key, setKey] = useState(calendarKey());
  const rows = query<any>(`SELECT * FROM events WHERE dateKey=? ORDER BY ts`, [key]);
  const label = new Date(key + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // The constants: prayer anchors for the viewed day, merged chronologically
  // with what was actually done — work visibly sits between them.
  const times = resolveTimes((k) => SettingsRepo.get(k, ''));
  const [Y, M, D] = key.split('-').map(Number);
  const marks = times.map((p) => ({
    ...p,
    ts: new Date(Y, M - 1, D, Math.floor(p.minutes / 60), p.minutes % 60).getTime(),
  })).sort((a, b) => a.ts - b.ts);

  const merged: any[] = [
    ...rows.map((e) => ({ ...e, row: 'event' as const })),
    ...marks.map((m) => ({ ...m, row: 'prayer' as const })),
  ].sort((a, b) => a.ts - b.ts);

  const isToday = key === calendarKey();
  const now = Date.now();
  const nextTs = isToday ? marks.find((m) => m.ts > now)?.ts ?? null : null;

  const gapAfter = (idx: number) => {
    const cur = marks[idx];
    const nxt = marks[(idx + 1) % marks.length];
    return { nxt, min: windowMinutes(cur.minutes, nxt.minutes) };
  };

  return (
    <div className="page">
      <div className="hero-kicker">TIMELINE</div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 32, margin: '8px 0', letterSpacing: '-0.02em' }}>{label}</h1>
        <div className="toolbar">
          <button className="icon-btn" onClick={() => setKey(addDaysKey(key, -1))} aria-label="Previous day"><ChevronLeft /></button>
          <button className="btn ghost" onClick={() => setKey(calendarKey())}>Today</button>
          <button className="icon-btn" onClick={() => setKey(addDaysKey(key, 1))} aria-label="Next day"><ChevronRight /></button>
        </div>
      </div>
      <p style={{ color: 'var(--text-2)', marginTop: 0 }}>
        Fixed constants in <span style={{ color: 'var(--ember)' }}>ember</span> — your deep work lives in the windows between them.
      </p>
      {rows.length === 0 && (
        <div className="tl-hint">No activity logged yet — complete a habit or finish a focus session and it will appear between the constants.</div>
      )}
      <div className="tl">
        {merged.map((it: any) => it.row === 'event' ? (
          <div key={it.id} className="tl-item">
            <span className="tl-time num">{formatTime(it.ts)}</span>
            <div>
              <div style={{ fontWeight: 650 }}>{it.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{it.kind === 'focus' ? `focus · ${it.minutes}m` : `habit${it.minutes ? ` · ${it.minutes}m` : ''}`}</div>
            </div>
          </div>
        ) : (() => {
          const idx = marks.findIndex((m) => m.id === it.id);
          const gap = gapAfter(idx);
          const past = isToday && it.ts < now;
          const isNext = nextTs === it.ts;
          return (
            <div key={'p-' + it.id}>
              <div className={'prayer-mark' + (past ? ' past' : '') + (isNext ? ' next' : '')}>
                <span className="prayer-line" />
                <span className="prayer-tag">
                  <span className="ar">{it.ar}</span>
                  <span className="nm">{it.name}</span>
                  <span className="tm num">{formatTime(it.ts)}</span>
                </span>
                <span className="prayer-line" />
              </div>
              <div className="prayer-gap">
                window · {formatCountdown(gap.min)} until {gap.nxt.name} <span className="ar">{gap.nxt.ar}</span>
                {isNext && <span className="pill frost" style={{ marginInlineStart: 8 }}>next</span>}
              </div>
            </div>
          );
        })())}
      </div>
      <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>Prayer times are yours to set — Settings → Prayer Times. {PRAYERS.length} constants, no location needed, works offline.</p>
    </div>
  );
}
