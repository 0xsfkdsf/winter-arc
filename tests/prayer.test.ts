import { describe, it, expect } from 'vitest';
import { toMinutes, toHHMM, resolveTimes, prayerNow, windowMinutes, formatCountdown } from '../src/domain/prayer';

describe('prayer constants', () => {
  it('parses HH:MM, clamps, rejects garbage', () => {
    expect(toMinutes('05:00')).toBe(300);
    expect(toMinutes('5:30')).toBe(330);
    expect(toMinutes('18:12')).toBe(18 * 60 + 12);
    expect(toMinutes('')).toBe(0);
    expect(toMinutes('nope')).toBe(0);
  });
  it('formats minutes incl. midnight wrap', () => {
    expect(toHHMM(300)).toBe('05:00');
    expect(toHHMM(1440)).toBe('00:00');
    expect(toHHMM(-30)).toBe('23:30');
  });
  it('blanks fall back to defaults', () => {
    const t = resolveTimes(() => '');
    expect(t.map((p) => p.minutes)).toEqual([300, 720, 930, 1080, 1170]);
  });
  it('mid-morning: inside Fajr window, Dhuhr next', () => {
    const t = resolveTimes(() => '');
    const r = prayerNow(t, 600); // 10:00
    expect(r.prev.id).toBe('fajr');
    expect(r.next.id).toBe('dhuhr');
    expect(r.inMin).toBe(120);
  });
  it('after Isha: wraps to Fajr tomorrow', () => {
    const t = resolveTimes(() => '');
    const r = prayerNow(t, 1200); // 20:00
    expect(r.prev.id).toBe('isha');
    expect(r.next.id).toBe('fajr');
    expect(r.inMin).toBe(1440 - 1200 + 300);
  });
  it('window minutes wrap midnight', () => {
    expect(windowMinutes(720, 930)).toBe(210);
    expect(windowMinutes(1170, 300)).toBe(570);
  });
  it('countdown formats compactly', () => {
    expect(formatCountdown(45)).toBe('45m');
    expect(formatCountdown(60)).toBe('1h');
    expect(formatCountdown(84)).toBe('1h 24m');
  });
});
