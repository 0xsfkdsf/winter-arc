import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Coffee, Flag, Plus } from 'lucide-react';
import { elapsedMs, remainingMs, isComplete, FocusClock } from '../domain/focus';
import { SessionRepo, SettingsRepo, StudyRepo } from '../database/sqlite';
import { formatClock, formatMinutes, formatTime, addDaysKey } from '../domain/dates';
import { TRACKS, TrackID, playTrack, getTrack, getVolume, setVolume } from '../audio/soundscape';
import { playCue } from '../audio/cues';
import { useStore } from '../application/store';

export interface FocusTarget { sessionId: string; subjectId: string | null; taskId: string | null; title: string; sub: string; plannedMin: number; startedAt: number; }

export function FocusOverlay({ target, close, onNewTask }: { target: FocusTarget; close: (done?: boolean) => void; onNewTask: () => void }) {
  const s = useStore();
  const [clock, setClock] = useState<FocusClock>({ startedAt: target.startedAt, pausedMs: 0, pauseStartedAt: null, plannedMin: target.plannedMin });
  const [now, setNow] = useState(Date.now());
  const [inBreak, setInBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(0);
  const [breakLen] = useState(Number(SettingsRepo.get('focus.shortBreak', '5')));
  const paused = clock.pauseStartedAt !== null;

  const el = elapsedMs(clock, now);
  const rem = remainingMs(clock, now);
  const done = isComplete(clock, now);
  const breakRem = Math.max(0, breakLen * 60000 - (now - breakStart));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // keyboard: Space pause/resume (not in inputs), Esc exits
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape') interrupt();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // persist active session heartbeat (restart-safe)
  useEffect(() => {
    const t = setInterval(() => {
      SessionRepo.updateActive(target.sessionId, clock.pausedMs + (clock.pauseStartedAt ? Date.now() - clock.pauseStartedAt : 0), clock.startedAt);
    }, 5000);
    return () => clearInterval(t);
  }, [clock.pausedMs, clock.startedAt, target.sessionId]); // eslint-disable-line

  const toggle = () => {
    setClock((c) => c.pauseStartedAt !== null
      ? { ...c, pausedMs: c.pausedMs + (Date.now() - c.pauseStartedAt), pauseStartedAt: null }
      : { ...c, pauseStartedAt: Date.now() });
  };

  const finish = (partial = false) => {
    const nowT = Date.now();
    const pausedTotal = clock.pausedMs + (clock.pauseStartedAt ? nowT - clock.pauseStartedAt : 0);
    const elapsedMin = elapsedMs(clock, nowT) / 60000;
    SessionRepo.finish(target.sessionId, pausedTotal);
    let msg = `${partial ? 'Partial kept' : 'Focus complete'} · ${formatMinutes(elapsedMin)}`;
    if (target.taskId) {
      const r = StudyRepo.creditFocus(target.taskId, elapsedMin);
      if (r.done) msg = `Task complete · ${target.title}`;
    }
    // The finish sound always plays — completing real work must be heard.
    playCue('session', { force: true });
    s.notify(msg);
    close(true);
  };

  const interrupt = () => {
    // Exiting must never silently eat real work: a minute or more gets
    // logged as a partial session (and credited to the task).
    const elapsedMin = elapsedMs(clock, Date.now()) / 60000;
    if (elapsedMin >= 1) {
      finish(true);
      return;
    }
    SessionRepo.interrupt(target.sessionId);
    s.notify('Set aside — under a minute, nothing logged.');
    close(false);
  };

  // ---- overview + record (right panel) ----
  const completed = s.sessions as any[];
  const activeMin = (x: any) => Math.max(0, (x.endedAt - x.startedAt - (x.pausedMs || 0)) / 60000);
  const todayList = completed.filter((x) => x.dateKey === s.todayKey);
  const todayMin = todayList.reduce((a, x) => a + activeMin(x), 0);
  const totalMin = completed.reduce((a, x) => a + activeMin(x), 0);

  const names = useMemo(() => {
    const tasks = new Map((s.tasks as any[]).map((t) => [t.id, t.title]));
    const subs = new Map((s.subjects as any[]).map((x) => [x.id, x.name]));
    return { tasks, subs };
  }, [s.tasks, s.subjects]);
  const titleOf = (x: any) => names.tasks.get(x.taskId) ?? names.subs.get(x.subjectId) ?? 'Open focus';

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    const sorted = [...completed].sort((a, b) => b.startedAt - a.startedAt).slice(0, 40);
    for (const x of sorted) {
      if (!map.has(x.dateKey)) map.set(x.dateKey, []);
      map.get(x.dateKey)!.push(x);
    }
    return [...map.entries()];
  }, [completed]);

  const groupLabel = (key: string) => {
    if (key === s.todayKey) return 'Today';
    if (key === addDaysKey(s.todayKey, -1)) return 'Yesterday';
    return new Date(key + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const ringValue = inBreak ? 1 - breakRem / Math.max(1, breakLen * 60000) : Math.min(1, el / (target.plannedMin * 60000));

  return (
    <div className="focus-wrap" role="dialog" aria-label="Focus mode">
      <div className="focus-layout">
        <div className="focus-main">
          <div className="chapter">{inBreak ? 'BREAK · BREATHE' : `FOCUS · ${target.plannedMin} MIN`}</div>
          <button className="focus-taskline" onClick={interrupt} title="Exit focus">
            <span dir="auto">{target.title}</span> <span aria-hidden>›</span>
          </button>
          <div className="focus-sub">{target.sub}</div>
          <div className={'fstate' + (paused ? ' paused' : '') + (done && !inBreak ? ' done' : '')}>
            <i />{inBreak ? 'BREAK' : done ? 'COMPLETE' : paused ? 'PAUSED' : 'FOCUSING'}
          </div>
          <FocusRing value={ringValue} size={324}>
            <div className="focus-timer num">{inBreak ? formatClock(breakRem) : done ? '00:00' : formatClock(rem)}</div>
            <div className="focus-goal num"><strong>{formatMinutes(el / 60000)}</strong> OF {target.plannedMin}M</div>
          </FocusRing>
          <div className="focus-controls">
            {done && !inBreak ? (
              <>
                <button className="btn primary focus-cta" onClick={() => finish(false)}><Flag size={15} /> Complete session</button>
                <button className="btn focus-cta" onClick={() => { setInBreak(true); setBreakStart(Date.now()); }}><Coffee size={15} /> {breakLen}m break</button>
              </>
            ) : inBreak ? (
              <button className="btn primary focus-cta" onClick={() => setInBreak(false)}>Back to focus</button>
            ) : (
              <>
                <button className="btn primary focus-cta" onClick={toggle}>{paused ? <Play size={15} /> : <Pause size={15} />} {paused ? 'Continue' : 'Pause'}</button>
                <button className="btn focus-cta" onClick={interrupt}>Exit</button>
              </>
            )}
          </div>
          <button className="focus-finish" onClick={() => finish(false)}>Finish early — log {formatMinutes(el / 60000)}</button>
          <div className="focus-sub" style={{ fontSize: 12 }}><span className="kbd">Space</span> pause · <span className="kbd">Esc</span> exit · safe to minimize</div>
        </div>

        <aside className="focus-side" aria-label="Focus overview and history">
          <h3>Overview</h3>
          <div className="ov-grid">
            <div className="ov-tile"><div className="v num">{todayList.length}</div><div className="l">TODAY'S SESSIONS</div></div>
            <div className="ov-tile"><div className="v num">{formatMinutes(todayMin)}</div><div className="l">TODAY'S FOCUS</div></div>
            <div className="ov-tile"><div className="v num">{completed.length}</div><div className="l">TOTAL SESSIONS</div></div>
            <div className="ov-tile"><div className="v num">{formatMinutes(totalMin)}</div><div className="l">TOTAL FOCUS</div></div>
          </div>
          <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 26 }}>
            <h3 style={{ margin: 0 }}>Soundscape</h3>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>offline · generative</span>
          </div>
          <SoundscapePicker />
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Focus Record</h3>
            <button className="icon-btn" onClick={onNewTask} title="New study task" aria-label="New study task"><Plus /></button>
          </div>
          <div className="record-list">
            {groups.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>No sessions yet — this one will be the first.</div>}
            {groups.map(([key, items]) => (
              <div key={key}>
                <div className="rec-group">{groupLabel(key)}</div>
                {items.map((x: any) => (
                  <div key={x.id} className="rec-item">
                    <span className="rec-dot" />
                    <span className="num rec-range">{formatTime(x.startedAt)} - {formatTime(x.endedAt)}</span>
                    <span className="num rec-dur">{Math.max(1, Math.round(activeMin(x)))}m</span>
                    <div className="rec-title" dir="auto">{titleOf(x)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SoundscapePicker() {
  const [track, setTrack] = useState<TrackID>(getTrack());
  const [vol, setVol] = useState(getVolume());
  return (
    <div style={{ marginBottom: 4 }}>
      <div className="scape-chips">
        {TRACKS.map((t) => (
          <button key={t.id} className={'chip' + (track === t.id ? ' on' : '')} title={t.desc}
            onClick={() => { playTrack(t.id); setTrack(t.id); }}>
            {t.name}
          </button>
        ))}
      </div>
      {track !== 'off' && (
        <input type="range" min={0} max={100} value={Math.round(vol * 100)}
          onChange={(e) => { const v = Number(e.target.value) / 100; setVolume(v); setVol(v); }}
          aria-label="Soundscape volume" className="scape-vol" />
      )}
    </div>
  );
}

function FocusRing({ value, size, children }: { value: number; size: number; children: React.ReactNode }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const r1 = r - (major ? 19 : 14);
    const r2 = r - 8;
    return {
      i,
      major,
      x1: cx + r1 * Math.cos(a),
      y1: cx + r1 * Math.sin(a),
      x2: cx + r2 * Math.cos(a),
      y2: cx + r2 * Math.sin(a),
    };
  });
  return (
    <div className="fring-wrap" style={{ width: size, height: size }}>
      <svg className="ring" width={size} height={size} role="img" aria-label="Focus progress">
        <defs>
          <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#93b4fd" />
            <stop offset="100%" stopColor="#5eead4" />
          </linearGradient>
        </defs>
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke="url(#focusGrad)" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(Math.max(value, 0), 1))}
          style={{ transition: 'stroke-dashoffset var(--dur-emphasis) var(--ease-out)' }} />
        {ticks.map((t) => (
          <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            className={'fring-tick' + (t.major ? ' major' : '')} strokeWidth={t.major ? 2 : 1} />
        ))}
      </svg>
      <div className="fring-center">{children}</div>
    </div>
  );
}

export function startFocusSession(task: any | null, subjectId: string | null, plannedMin: number, subjects: any[]): FocusTarget {
  const sub = subjects.find((x: any) => x.id === (task?.subjectId ?? subjectId));
  const sid = SessionRepo.startActive(task?.id ?? null, task?.subjectId ?? subjectId, plannedMin, plannedMin >= 90 ? 'deep' : 'focus');
  return {
    sessionId: sid,
    subjectId: task?.subjectId ?? subjectId,
    taskId: task?.id ?? null,
    title: task?.title ?? (sub?.name ? `${sub.name} · open focus` : 'Open focus'),
    sub: sub?.name ?? 'study',
    plannedMin,
    startedAt: Date.now(),
  };
}
