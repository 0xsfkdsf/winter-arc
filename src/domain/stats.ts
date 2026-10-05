// Aggregations. Input = plain rows; no DB access.
import { calendarKey } from './dates';

export interface SessionRow { id: string; subjectId: string | null; startedAt: number; endedAt: number; pausedMs: number; status: string; }
export interface CompletionRow { habitId: string; dateKey: string; state: string; minutes: number; ts: number; title: string; kind: string; }

export function activeMinutes(s: SessionRow): number {
  return Math.max(0, (s.endedAt - s.startedAt - s.pausedMs) / 60000);
}

export function splitMinutesByDay(startedAt: number, endedAt: number, pausedMs: number): Map<string, number> {
  // Attribute minutes proportionally across calendar days (midnight-safe).
  const out = new Map<string, number>();
  const total = Math.max(0, endedAt - startedAt - pausedMs);
  if (total <= 0) return out;
  const dayMs = 86400000;
  let cursor = startedAt;
  let remaining = total;
  // active ratio: active/total-wall
  const wall = Math.max(1, endedAt - startedAt);
  const ratio = total / wall;
  while (cursor < endedAt && remaining > 0.5) {
    const d = new Date(cursor);
    const nextMid = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const sliceWall = Math.min(nextMid, endedAt) - cursor;
    const sliceActive = sliceWall * ratio;
    const key = calendarKey(new Date(cursor));
    out.set(key, (out.get(key) ?? 0) + sliceActive / 60000);
    remaining -= sliceActive;
    cursor += sliceWall;
  }
  return out;
}

export function sumToday(sessions: SessionRow[], dateKey: string): { minutes: number; count: number } {
  let minutes = 0, count = 0;
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const per = splitMinutesByDay(s.startedAt, s.endedAt, s.pausedMs);
    const m = per.get(dateKey) ?? 0;
    if (m > 0.05) { minutes += m; count++; }
  }
  return { minutes, count };
}

export function perSubject(sessions: SessionRow[], subjects: { id: string; name: string }[]): { id: string; name: string; minutes: number }[] {
  return subjects.map((sub) => ({
    ...sub,
    minutes: sessions.filter((s) => s.status === 'completed' && s.subjectId === sub.id)
      .reduce((a, s) => a + activeMinutes(s), 0),
  }));
}
