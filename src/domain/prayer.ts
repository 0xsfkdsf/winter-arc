// Prayer constants — the fixed anchors the day is built around.
// Times are user-configured (Settings) as local "HH:MM": always correct for
// the user's mosque, fully offline. If auto-calculation is added later, only
// the source of `resolveTimes` changes — consumers stay untouched.
export interface PrayerDef {
  id: string;
  name: string;
  ar: string;
}

export const PRAYERS: PrayerDef[] = [
  { id: 'fajr', name: 'Fajr', ar: 'الفجر' },
  { id: 'dhuhr', name: 'Dhuhr', ar: 'الظهر' },
  { id: 'asr', name: 'Asr', ar: 'العصر' },
  { id: 'maghrib', name: 'Maghrib', ar: 'المغرب' },
  { id: 'isha', name: 'Isha', ar: 'العشاء' },
];

export const PRAYER_DEFAULTS: Record<string, string> = {
  fajr: '05:00',
  dhuhr: '12:00',
  asr: '15:30',
  maghrib: '18:00',
  isha: '19:30',
};

/** "HH:MM" (or "H:MM") → minutes since midnight. Invalid → 0. */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec((hhmm || '').trim());
  if (!m) return 0;
  const h = Math.min(23, parseInt(m[1], 10));
  const min = Math.min(59, parseInt(m[2], 10));
  return h * 60 + min;
}

export function toHHMM(mins: number): string {
  const v = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

export interface PrayerTime extends PrayerDef {
  minutes: number;
}

/** Resolve configured times (get = SettingsRepo.get); blanks fall back to defaults. */
export function resolveTimes(get: (k: string) => string): PrayerTime[] {
  return PRAYERS.map((p) => {
    const raw = get('prayer.' + p.id);
    return { ...p, minutes: toMinutes(raw || PRAYER_DEFAULTS[p.id]) };
  });
}

export interface PrayerNow {
  /** The constant whose window we are inside. */
  prev: PrayerTime;
  /** The next constant ahead. */
  next: PrayerTime;
  /** Minutes until next (wraps past midnight for Fajr). */
  inMin: number;
}

export function prayerNow(times: PrayerTime[], nowMin: number): PrayerNow {
  const sorted = [...times].sort((a, b) => a.minutes - b.minutes);
  let next = sorted.find((t) => t.minutes > nowMin);
  if (!next) next = sorted[0]; // after Isha → Fajr tomorrow
  const idx = sorted.indexOf(next);
  const prev = sorted[(idx - 1 + sorted.length) % sorted.length];
  const inMin = next.minutes > nowMin ? next.minutes - nowMin : 1440 - nowMin + next.minutes;
  return { prev, next, inMin };
}

/** Minutes between two prayer times on the same day (wraps midnight). */
export function windowMinutes(fromMin: number, toMin: number): number {
  return toMin > fromMin ? toMin - fromMin : 1440 - fromMin + toMin;
}

export function formatCountdown(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${String(rest).padStart(2, '0')}m`;
}
