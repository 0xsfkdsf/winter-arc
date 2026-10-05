import { describe, it, expect } from 'vitest';
import { createClock, pauseClock, resumeClock, elapsedMs, remainingMs, isComplete, nextPhase } from '../src/domain/focus';
import { splitMinutesByDay, sumToday } from '../src/domain/stats';

describe('focus timer (timestamp truth)', () => {
  it('start/pause/resume math excludes paused time', () => {
    const t0 = 1_000_000;
    let c = createClock(45, t0);
    c = pauseClock(c, t0 + 10 * 60000);
    c = resumeClock(c, t0 + 15 * 60000); // 5m paused
    expect(elapsedMs(c, t0 + 25 * 60000)).toBe(20 * 60000);
    expect(remainingMs(c, t0 + 25 * 60000)).toBe(25 * 60000);
    expect(isComplete(c, t0 + 25 * 60000)).toBe(false);
    expect(isComplete(c, t0 + 55 * 60000)).toBe(true);
  });
  it('pause is idempotent, resume without pause is noop', () => {
    const c = createClock(25, 0);
    const p1 = pauseClock(c, 1000);
    expect(pauseClock(p1, 2000).pauseStartedAt).toBe(1000);
    expect(resumeClock(c, 5000)).toBe(c);
  });
  it('minimize-safe: long gap with pause held still correct', () => {
    let c = createClock(60, 0);
    c = pauseClock(c, 30 * 60000);
    expect(elapsedMs(c, 90 * 60000)).toBe(30 * 60000); // frozen while paused
  });
  it('pomodoro phase machine', () => {
    expect(nextPhase('focus', 4, 4)).toBe('longBreak');
    expect(nextPhase('focus', 1, 4)).toBe('shortBreak');
    expect(nextPhase('shortBreak', 1, 4)).toBe('focus');
  });
});

describe('midnight split', () => {
  it('session crossing midnight attributes to both days', () => {
    const start = new Date(2026, 0, 1, 23, 30).getTime();
    const end = new Date(2026, 0, 2, 0, 30).getTime();
    const per = splitMinutesByDay(start, end, 0);
    expect(per.get('2026-01-01')).toBeCloseTo(30, 0);
    expect(per.get('2026-01-02')).toBeCloseTo(30, 0);
  });
  it('sumToday counts only completed sessions', () => {
    const s = [
      { id: 'a', subjectId: null, startedAt: 1000, endedAt: 1000 + 45 * 60000, pausedMs: 0, status: 'completed' },
    ];
    // dateKey of epoch day; just verify aggregation runs
    const r = sumToday(s as any, '1970-01-01');
    expect(r.count).toBe(1);
    expect(r.minutes).toBeCloseTo(45, 1);
  });
});
