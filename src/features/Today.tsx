import { useEffect, useMemo, useState } from 'react';
import { Check, Sunrise, MoonStar, BookOpen, Dumbbell, ShieldOff, Timer, Sparkles, Play, Moon } from 'lucide-react';
import { useStore, useArcMeta } from '../application/store';
import { HabitRepo, query, SettingsRepo } from '../database/sqlite';
import { calendarKey, formatMinutes, arcPhase } from '../domain/dates';
import { resolveTimes, prayerNow, formatCountdown } from '../domain/prayer';
import { playCue } from '../audio/cues';
import { dayCompletion } from '../domain/habits';
import { Ring } from '../components/chrome';

export function Today({ onFocusTask }: { onFocusTask: (t: any) => void }) {
  const s = useStore();
  const meta = useArcMeta();
  const [readingSecs, setReadingSecs] = useState(0);
  const [readingOn, setReadingOn] = useState(false);

  const groups = useMemo(() => {
    const g: Record<string, any[]> = { spiritual: [], mental: [], physical: [], breaking: [], study: [] };
    for (const h of s.habits) {
      if (h.dimension === 'spiritual') g.spiritual.push(h);
      else if (h.dimension === 'mental') g.mental.push(h);
      else if (h.dimension === 'physical') g.physical.push(h);
      else if (h.kind === 'avoidance') g.breaking.push(h);
    }
    return g;
  }, [s.habits]);

  const positives = s.habits.filter((h: any) => h.kind !== 'avoidance');
  const doneCount = positives.filter((h: any) => s.completions[h.id]).length;
  const rate = dayCompletion(positives.map((h: any) => (s.completions[h.id] ? 'done' : 'open') as any));

  const todayTasks = s.tasks.filter((t: any) => t.status !== 'done').slice(0, 4);
  const showRecovery = s.yesterdayRate !== null && s.yesterdayRate < 0.5 && rate < 0.85;

  const toggle = (h: any) => {
    if (s.completions[h.id]) {
      HabitRepo.setOpen(h.id, s.todayKey);
      playCue('toggle');
    } else {
      HabitRepo.setDone(h.id, s.todayKey, h.minMinutes || 0);
      const rest = positives.filter((p: any) => p.id !== h.id && !s.completions[p.id]);
      playCue(rest.length === 0 ? 'milestone' : 'complete');
    }
  };
  const cycleAvoid = (h: any) => {
    const cur = s.avoid[h.id]?.state ?? 'open';
    const next = cur === 'open' ? 'maintained' : cur === 'maintained' ? 'slip' : 'open';
    HabitRepo.setAvoid(h.id, s.todayKey, next);
    if (next === 'maintained') playCue('toggle');
  };

  if (!s.arc || !meta) return null;
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const reading = groups.mental[0];
  const readingMin = (s.completions[reading?.id]?.minutes ?? 0) + (readingOn ? readingSecs / 60 : 0);

  const frac = (done: number, total: number) => (total === 0 ? 0 : done / total);

  return (
    <div className="page today-page">
      <div className="hero-kicker"><Sparkles size={13} /> {arcPhase(meta.progress)} · {s.arc.title} · {dateStr}</div>
      <div className="today-hero">
        <div>
          <h1 className="hero-day num today-day">Day {meta.day} <span className="dim">/ {meta.total}</span></h1>
          <p className="hero-identity today-id">“Who are you becoming?” — <strong>{s.arc.identity}</strong></p>
        </div>
        <div className="today-score">
          <Ring value={rate} size={84} stroke={9} />
          <div className="today-score-t num">{Math.round(rate * 100)}%</div>
          <div className="today-score-l">DAY SCORE</div>
        </div>
      </div>
      <div className="arc-line" aria-hidden><div className="fill" style={{ width: `${meta.progress * 100}%` }} /><div className="node" style={{ insetInlineStart: `${meta.progress * 100}%` }} /></div>
      <div className="hero-stats today-stats">
        <div className="hstat"><div className="v num">{doneCount}/{positives.length}</div><div className="l">TODAY</div></div>
        <div className="hstat"><div className="v num">{formatMinutes(todayFocus(s.sessions, s.todayKey))}</div><div className="l">FOCUS</div></div>
        <div className="hstat"><div className="v num">{todayTasks.length}</div><div className="l">TASKS</div></div>
      </div>

      {showRecovery && (
        <div className="banner" role="status">
          <MoonStar />
          <div><strong>Yesterday wasn't perfect. Today is still available.</strong><div style={{ color: 'var(--text-2)', fontSize: 13 }}>Consistency &gt; perfection. Continue, adjust, or take a recovery day.</div></div>
          <div className="toolbar" style={{ marginInlineStart: 'auto' }}>
            <button className="btn primary" onClick={() => s.notify('Continuing. Today is still available.')}>Continue</button>
          </div>
        </div>
      )}

      <div className="dash-grid">
        <Card i={0} accent="var(--aurora)" icon={<Sunrise size={15} />} title="Spiritual"
          meta={`${groups.spiritual.filter((h: any) => s.completions[h.id]).length}/${groups.spiritual.length}`}
          value={frac(groups.spiritual.filter((h: any) => s.completions[h.id]).length, groups.spiritual.length)}>
          {groups.spiritual.map((h: any) => (
            <button key={h.id} className={'row dash-row' + (s.completions[h.id] ? ' dimmed' : '')} onClick={() => toggle(h)}>
              <span className={'check' + (s.completions[h.id] ? ' done' : '')}><Check /></span>
              <span><span className="title">{h.title}</span> <span className="ar" style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{h.titleAr}</span></span>
              <span className="spacer sub num">{h.minMinutes}m</span>
            </button>
          ))}
        </Card>

        <Card i={1} accent="var(--frost)" icon={<BookOpen size={15} />} title="Reading"
          meta={reading && s.completions[reading.id] ? 'logged' : '5m minimum'}
          value={Math.min(1, readingMin / 5)}>
          {reading && (
            <div className="row dash-row" style={{ cursor: 'default' }}>
              <button className={'check' + (s.completions[reading.id] ? ' done' : '')} onClick={() => toggle(reading)} aria-label="Complete reading"><Check /></button>
              <span><span className="title">Reading</span> <span className="sub ar">القراءة</span><br />
                <span className="sub num">{readingOn ? fmtSecs(readingSecs) + ' · timing…' : (s.completions[reading.id]?.minutes ? s.completions[reading.id].minutes + 'm logged' : 'not logged yet')}</span></span>
              <span className="spacer">
                <ReadingTimer onTick={setReadingSecs} running={readingOn} setRunning={setReadingOn} />
              </span>
            </div>
          )}
          {reading && (
            <button className="dash-foot" onClick={() => { HabitRepo.logMinutes(reading.id, s.todayKey, 5); s.notify('Logged 5m reading'); }}>
              Quick log +5m →
            </button>
          )}
        </Card>

        <Card i={2} accent="var(--frost)" icon={<Timer size={15} />} title="Study Focus"
          meta={`${todayTasks.length} open`} value={frac(todayTasks.filter((t: any) => (t.progress ?? 0) > 0).length, Math.max(1, todayTasks.length))}>
          {todayTasks.length === 0 && <div style={{ color: 'var(--text-3)', padding: '8px 6px', fontSize: 13 }}>No plans yet. Create a task in Study — <span className="kbd">N</span></div>}
          {todayTasks.map((t: any) => (
            <div key={t.id} className="row dash-row" style={{ cursor: 'default' }}>
              <span className="dot" style={{ background: subjColor(s.subjects, t.subjectId) }} />
              <span style={{ minWidth: 0 }}><span className="title">{t.title}</span><br /><span className="sub">{t.subjectName} · ~{t.estimateMin}m</span></span>
              <span className="spacer"><button className="btn dash-focus" onClick={() => onFocusTask(t)}><Play size={13} /></button></span>
            </div>
          ))}
        </Card>

        <Card i={3} accent="var(--aurora)" icon={<Dumbbell size={15} />} title="Physical"
          meta={`${groups.physical.filter((h: any) => s.completions[h.id]).length}/${groups.physical.length}`}
          value={frac(groups.physical.filter((h: any) => s.completions[h.id]).length, groups.physical.length)}>
          {groups.physical.map((h: any) => (
            <button key={h.id} className={'row dash-row' + (s.completions[h.id] ? ' dimmed' : '')} onClick={() => toggle(h)}>
              <span className={'check' + (s.completions[h.id] ? ' done' : '')}><Check /></span>
              <span><span className="title">{h.title}</span><br /><span className="sub">{h.title === 'Workout' ? 'push · pull · legs · run · walk' : 'small habits compound'}</span></span>
            </button>
          ))}
        </Card>

        <Card i={4} accent="var(--ember)" icon={<ShieldOff size={15} />} title="Quiet Resistance"
          meta={`${groups.breaking.filter((h: any) => (s.avoid[h.id]?.state ?? 'open') === 'maintained').length}/${groups.breaking.length} held`}
          value={frac(groups.breaking.filter((h: any) => (s.avoid[h.id]?.state ?? 'open') === 'maintained').length, Math.max(1, groups.breaking.length))}>
          {groups.breaking.map((h: any) => {
            const st = s.avoid[h.id]?.state ?? 'open';
            return (
              <button key={h.id} className="row dash-row" onClick={() => cycleAvoid(h)}>
                <span className={'check' + (st === 'maintained' ? ' done' : '')} style={st === 'slip' ? { borderColor: 'var(--warn)' } : undefined}>
                  {st === 'maintained' ? <Check /> : st === 'slip' ? <span style={{ fontSize: 12, color: 'var(--warn)' }}>~</span> : null}
                </span>
                <span><span className="title">{h.title}</span></span>
                <span className="spacer">
                  <span className={'pill ' + (st === 'maintained' ? 'calm' : st === 'slip' ? 'warn' : '')}>
                    {st === 'maintained' ? 'Maintained' : st === 'slip' ? 'Slip — continue' : 'Today'}
                  </span>
                </span>
              </button>
            );
          })}
        </Card>

        <PrayerCard i={5} />
      </div>
    </div>
  );
}

function Card({ i, accent, icon, title, meta, value, children }: any) {
  return (
    <section className="dash-card" style={{ ['--i' as any]: i, ['--accent' as any]: accent }}>
      <div className="card-head">
        <span className="card-ico">{icon}</span>
        <span className="card-title">{title}</span>
        <span className="card-meta num">{meta}</span>
        <span className="card-ring"><Ring value={value} size={34} stroke={4} /></span>
      </div>
      <div className="card-body">{children}</div>
      <div className="card-bar"><i style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </section>
  );
}

function PrayerCard({ i }: { i: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const times = resolveTimes((k) => SettingsRepo.get(k, ''));
  const d = new Date(now);
  const cur = prayerNow(times, d.getHours() * 60 + d.getMinutes());
  return (
    <section className="dash-card prayer-card" style={{ ['--i' as any]: i, ['--accent' as any]: 'var(--ember)' }}>
      <div className="card-head">
        <span className="card-ico"><Moon size={15} /></span>
        <span className="card-title">Prayer Rhythm</span>
        <span className="card-meta num">in {formatCountdown(cur.inMin)}</span>
        <span className="live-dot" />
      </div>
      <div className="card-body">
        <div className="prayer-now">Inside <strong>{cur.prev.name}</strong> <span className="ar">{cur.prev.ar}</span> · Next <strong>{cur.next.name}</strong></div>
        {times.map((p) => {
          const isNext = p.id === cur.next.id;
          const isPast = p.minutes < d.getHours() * 60 + d.getMinutes() && !isNext;
          return (
            <div key={p.id} className={'prayer-trow' + (isNext ? ' next' : '') + (isPast ? ' past' : '')}>
              <span className="ar">{p.ar}</span>
              <span className="pname">{p.name}</span>
              <span className="num ptime">{String(Math.floor(p.minutes / 60)).padStart(2, '0')}:{String(p.minutes % 60).padStart(2, '0')}</span>
            </div>
          );
        })}
      </div>
      <div className="card-bar"><i style={{ width: '100%' }} /></div>
    </section>
  );
}

function subjColor(subjects: any[], id: string) {
  return subjects.find((x: any) => x.id === id)?.color ?? 'var(--frost)';
}

function todayFocus(sessions: any[], key: string): number {
  const k = key;
  return sessions.filter((x: any) => x.dateKey === k || calendarKey(new Date(x.startedAt)) === k)
    .reduce((a: number, x: any) => a + Math.max(0, (x.endedAt - x.startedAt - (x.pausedMs || 0)) / 60000), 0);
}

function fmtSecs(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function ReadingTimer({ onTick, running, setRunning }: { onTick: (s: number) => void; running: boolean; setRunning: (b: boolean) => void }) {
  const s = useStore();
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSecs((v) => { onTick(v + 1); return v + 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);
  const stop = () => {
    setRunning(false);
    if (secs >= 30) {
      const reading = s.habits.find((h: any) => h.title === 'Reading');
      if (reading) HabitRepo.logMinutes(reading.id, s.todayKey, Math.max(1, Math.round(secs / 60)));
      s.notify(`Reading logged · ${fmtSecs(secs)}`);
    }
    setSecs(0); onTick(0);
  };
  return running
    ? <button className="btn" onClick={stop}><span className="num">{fmtSecs(secs)}</span> · Done</button>
    : <button className="btn ghost" onClick={() => setRunning(true)}><Timer size={14} /> Start</button>;
}

export function queryDayEvents(key: string) {
  return query(`SELECT * FROM events WHERE dateKey=? ORDER BY ts`, [key]);
}
