import { useMemo, useState } from 'react';
import { Mountain, Flag } from 'lucide-react';
import { useStore, useArcMeta } from '../application/store';
import { query, ArcRepo } from '../database/sqlite';
import { consistency, streaks, DayScore } from '../domain/consistency';
import { dayCompletion } from '../domain/habits';
import { formatMinutes, addDaysKey } from '../domain/dates';
import { Ring } from '../components/chrome';

export function Progress() {
  const s = useStore();
  const meta = useArcMeta();
  const stats = useMemo(() => {
    if (!s.arc || !meta) return null;
    // build per-day scores across arc range (cap 120 days)
    const days: DayScore[] = [];
    const habits = s.habits.filter((h: any) => h.kind !== 'avoidance');
    for (let i = 0; i < meta.total; i++) {
      const key = addDaysKey(s.arc.startDate, i);
      if (key > s.todayKey) break;
      const states = habits.map((h: any) => {
        const c = query<any>(`SELECT * FROM completions WHERE habitId=? AND dateKey=?`, [h.id, key])[0];
        return (c ? 'done' : 'open') as any;
      });
      days.push({ dateKey: key, rate: dayCompletion(states) });
    }
    const cons = consistency(days);
    const st = streaks(days, s.todayKey);
    const focusMin = (s.sessions as any[]).reduce((a, x) => a + Math.max(0, (x.endedAt - x.startedAt - x.pausedMs) / 60000), 0);
    const dims = [
      { name: 'Spiritual', ids: s.habits.filter((h: any) => h.dimension === 'spiritual') },
      { name: 'Mental', ids: s.habits.filter((h: any) => h.dimension === 'mental') },
      { name: 'Study', ids: [] as any[], custom: Math.min(1, focusMin / (meta.total * 60)) },
      { name: 'Physical', ids: s.habits.filter((h: any) => h.dimension === 'physical') },
      { name: 'Breaking habits', ids: s.habits.filter((h: any) => h.kind === 'avoidance'), avoid: true },
    ].map((d: any) => {
      if (d.custom !== undefined) return { name: d.name, v: d.custom };
      if (d.avoid) {
        const rows = d.ids.map((h: any) => query<any>(`SELECT * FROM avoid WHERE habitId=? AND dateKey=?`, [h.id, s.todayKey])[0]?.state);
        const kept = rows.filter((r: string) => r === 'maintained').length;
        return { name: d.name, v: d.ids.length ? kept / d.ids.length : 0 };
      }
      const done = d.ids.filter((h: any) => s.completions[h.id]).length;
      return { name: d.name, v: d.ids.length ? done / d.ids.length : 0 };
    });
    return { cons, st, focusMin, dims, sessions: s.sessions.length };
  }, [s, meta]);

  if (!s.arc || !meta || !stats) return null;
  return (
    <div className="page">
      <div className="hero-kicker"><Mountain size={13} /> ARC PROGRESS</div>
      <h1 className="hero-day num">Day {meta.day} <span className="dim">/ {meta.total}</span></h1>
      <div className="arc-line"><div className="fill" style={{ width: `${meta.progress * 100}%` }} /><div className="node" style={{ insetInlineStart: `${meta.progress * 100}%` }} /></div>
      <div style={{ display: 'flex', gap: 26, alignItems: 'center', marginTop: 20 }}>
        <Ring value={stats.cons} size={120} stroke={11} />
        <div>
          <div style={{ fontSize: 30, fontWeight: 800 }} className="num">{Math.round(stats.cons * 100)}%</div>
          <div style={{ color: 'var(--text-2)' }}>consistency — the metric that matters</div>
          <div style={{ color: 'var(--text-3)', fontSize: 13 }} className="num">streak {stats.st.current}d · longest {stats.st.longest}d</div>
        </div>
      </div>
      <div className="stat-strip">
        <div className="stat"><div className="v num">{formatMinutes(stats.focusMin)}</div><div className="l">ARC FOCUS</div></div>
        <div className="stat"><div className="v num">{stats.sessions}</div><div className="l">SESSIONS</div></div>
        <div className="stat"><div className="v num">{Math.round(meta.progress * 100)}%</div><div className="l">TIME ELAPSED</div></div>
      </div>
      <div className="section">
        <div className="section-head"><h2>DIMENSIONS · TODAY</h2></div>
        {stats.dims.map((d) => (
          <div key={d.name} style={{ marginBottom: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span style={{ fontWeight: 650 }}>{d.name}</span><span className="num" style={{ color: 'var(--text-2)' }}>{Math.round(d.v * 100)}%</span>
            </div>
            <div className="dim-bar"><i style={{ width: `${d.v * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArcPage({ onComplete }: { onComplete: () => void }) {
  const s = useStore();
  const meta = useArcMeta();
  if (!s.arc || !meta) return null;
  return (
    <div className="page">
      <div className="hero-kicker"><Flag size={13} /> YOUR ARC</div>
      <h1 style={{ fontSize: 36, letterSpacing: '-0.025em', margin: '8px 0' }}>{s.arc.title}</h1>
      <p className="hero-identity">“{s.arc.identity}”</p>
      <div className="hero-stats">
        <div className="hstat"><div className="v num">{s.arc.startDate}</div><div className="l">START</div></div>
        <div className="hstat"><div className="v num">{s.arc.endDate}</div><div className="l">END</div></div>
        <div className="hstat"><div className="v num">{meta.total} days</div><div className="l">SEASON</div></div>
      </div>
      <div className="banner"><Flag /><div><strong>Finish your season with honesty.</strong><div style={{ color: 'var(--text-2)', fontSize: 13 }}>Completion shows your real data — then asks who you became.</div></div>
        <button className="btn primary" style={{ marginInlineStart: 'auto' }} onClick={() => { ArcRepo.complete(s.arc.id); onComplete(); }}>Complete Arc</button>
      </div>
    </div>
  );
}

export function ArcComplete({ arc, onNew }: { arc: any; onNew: () => void }) {
  const s = useStore();
  const focusMin = (s.sessions as any[]).reduce((a, x) => a + Math.max(0, (x.endedAt - x.startedAt - x.pausedMs) / 60000), 0);
  const [reflection, setReflection] = useState('');
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div className="chapter">WINTER ARC COMPLETE</div>
      <h1 className="big-q">{arc?.title ?? 'The season is done.'}</h1>
      <p className="hero-identity">You stayed with it. That is the whole achievement.</p>
      <div className="stat-strip" style={{ textAlign: 'start', marginTop: 26 }}>
        <div className="stat"><div className="v num">{formatMinutes(focusMin)}</div><div className="l">FOCUS</div></div>
        <div className="stat"><div className="v num">{s.sessions.length}</div><div className="l">SESSIONS</div></div>
        <div className="stat"><div className="v num">{s.eventsToday.length}</div><div className="l">TODAY'S PROOF</div></div>
      </div>
      <div className="section" style={{ textAlign: 'start' }}>
        <div className="section-head"><h2>WHO DID YOU BECOME?</h2></div>
        <textarea className="textarea" placeholder="Write one honest paragraph…" value={reflection} onChange={(e) => setReflection(e.target.value)} />
      </div>
      <button className="btn primary" style={{ marginTop: 18 }} onClick={onNew}>Start a new Arc</button>
    </div>
  );
}
