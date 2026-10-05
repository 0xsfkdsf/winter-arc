// Pure date utilities. Calendar keys are local `yyyy-mm-dd`, never UTC-shifted.
export function calendarKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // noon avoids DST edge
}

export function addDaysKey(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return calendarKey(d);
}

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** DST-safe whole-day difference between two calendar keys. */
export function diffDays(aKey: string, bKey: string): number {
  const a = localMidnight(parseKey(aKey)).getTime();
  const b = localMidnight(parseKey(bKey)).getTime();
  return Math.round((b - a) / 86400000);
}

export function arcDayNumber(startKey: string, todayKey = calendarKey()): number {
  return diffDays(startKey, todayKey) + 1;
}

export function arcTotalDays(startKey: string, endKey: string): number {
  return Math.max(1, diffDays(startKey, endKey) + 1);
}

export function arcProgress(startKey: string, endKey: string, todayKey = calendarKey()): number {
  const total = arcTotalDays(startKey, endKey);
  const day = Math.min(Math.max(arcDayNumber(startKey, todayKey), 1), total);
  return day / total;
}

export function weekKey(d = new Date()): string {
  // ISO-ish week label yyyy-Www based on local Monday
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dow + 3);
  const first = new Date(copy.getFullYear(), 0, 4);
  const fDow = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - fDow + 3);
  const week = 1 + Math.round((copy.getTime() - first.getTime()) / (7 * 86400000));
  return `${copy.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Evocative arc chapter from overall progress — challenge framing, never shame. */
export function arcPhase(progress: number): string {
  if (progress < 0.34) return 'THE IGNITION';
  if (progress < 0.67) return 'THE DEEP';
  if (progress < 1) return 'THE ASCENT';
  return 'THE RETURN';
}
