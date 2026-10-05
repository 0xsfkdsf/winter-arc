import { useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useStore } from '../application/store';
import { ReviewRepo } from '../database/sqlite';
import { weekKey, formatMinutes } from '../domain/dates';

export function Review() {
  const s = useStore();
  const wk = weekKey();
  const existing = s.arc ? ReviewRepo.get(s.arc.id, wk) : null;
  const [f, setF] = useState({ wentWell: existing?.wentWell ?? '', didnt: existing?.didnt ?? '', changeTxt: existing?.changeTxt ?? '', focusNext: existing?.focusNext ?? '' });

  const weekStats = useMemo(() => {
    const now = Date.now();
    const start = now - 7 * 86400000;
    const rows = (s.sessions as any[]).filter((x) => x.startedAt >= start);
    const min = rows.reduce((a, x) => a + Math.max(0, (x.endedAt - x.startedAt - x.pausedMs) / 60000), 0);
    return { min, count: rows.length };
  }, [s.sessions]);

  if (!s.arc) return null;
  return (
    <div className="page">
      <div className="hero-kicker"><CalendarCheck size={13} /> WEEKLY REVIEW · {wk}</div>
      <h1 style={{ fontSize: 34, letterSpacing: '-0.025em', margin: '8px 0' }}>Week {wk.slice(-2)}</h1>
      <div className="stat-strip">
        <div className="stat"><div className="v num">{formatMinutes(weekStats.min)}</div><div className="l">FOCUS THIS WEEK</div></div>
        <div className="stat"><div className="v num">{weekStats.count}</div><div className="l">SESSIONS</div></div>
      </div>
      <div className="section">
        <Q q="What went well?" k="wentWell" f={f} setF={setF} ph="Name 1–3 things that actually worked…" />
        <Q q="What didn't?" k="didnt" f={f} setF={setF} ph="No shame. Just data…" />
        <Q q="What should change?" k="changeTxt" f={f} setF={setF} ph="One small adjustment for next week…" />
        <Q q="What should I focus on?" k="focusNext" f={f} setF={setF} ph="The single most important thing…" />
        <button className="btn primary" style={{ marginTop: 8 }} onClick={() => {
          ReviewRepo.save(s.arc.id, wk, { ...f, snapshot: JSON.stringify(weekStats) });
          s.notify('Review saved — next week adjusted.');
        }}>Save review</button>
      </div>
    </div>
  );
}

function Q({ q, k, f, setF, ph }: any) {
  return (
    <div className="review-q">
      <div className="q">{q}</div>
      <textarea className="textarea" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );
}
