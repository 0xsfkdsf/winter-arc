// Consistency + streaks. Recovery days count as neutral (don't break streaks).
export interface DayScore {
  dateKey: string;
  rate: number; // 0..1 completion of positive habits
  isRecovery?: boolean;
  isRest?: boolean;
}

export function consistency(days: DayScore[]): number {
  const valid = days.filter((d) => !d.isRest);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((a, d) => a + (d.isRecovery ? 0.6 : d.rate), 0);
  return sum / valid.length;
}

export function streaks(days: DayScore[], todayKey: string): { current: number; longest: number } {
  const byKey = new Map(days.map((d) => [d.dateKey, d]));
  const good = (d?: DayScore) => !!d && (d.rate >= 0.5 || d.isRecovery || d.isRest);
  // current: walk back from today (allow today open)
  let current = 0;
  let cursor = todayKey;
  // we need sorted keys; walk back up to length
  const sorted = [...days].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  const idx = sorted.findIndex((d) => d.dateKey === todayKey);
  let i = idx === -1 ? sorted.length - 1 : idx;
  // if today is open/bad, start from yesterday without penalizing
  if (idx !== -1 && !good(sorted[idx]) && sorted[idx].rate === 0 && !sorted[idx].isRecovery) i = idx - 1;
  void cursor;
  for (; i >= 0; i--) {
    if (good(sorted[i])) current++;
    else break;
  }
  let longest = 0, run = 0;
  for (const d of sorted) {
    if (good(byKey.get(d.dateKey))) { run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  return { current, longest };
}
