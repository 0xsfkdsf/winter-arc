import { describe, it, expect } from 'vitest';
import { evalHabit, toggleAvoid, dayCompletion } from '../src/domain/habits';
import { consistency, streaks } from '../src/domain/consistency';

describe('habits', () => {
  it('eval respects minimum + rest', () => {
    expect(evalHabit(10, 10).state).toBe('done');
    expect(evalHabit(3, 10).state).toBe('partial');
    expect(evalHabit(0, 10).state).toBe('open');
    expect(evalHabit(0, 10, true).state).toBe('rest');
  });
  it('avoidance cycles open->maintained->slip->open', () => {
    expect(toggleAvoid('open')).toBe('maintained');
    expect(toggleAvoid('maintained')).toBe('slip');
    expect(toggleAvoid('slip')).toBe('open');
  });
  it('dayCompletion partial = 0.5', () => {
    expect(dayCompletion(['done', 'partial', 'open', 'missed'])).toBeCloseTo(0.375);
  });
});

describe('consistency', () => {
  const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'].map((dateKey, i) => ({
    dateKey, rate: [1, 1, 0.4, 1][i],
  }));
  it('consistency averages rates', () => {
    expect(consistency(days)).toBeCloseTo(0.85);
  });
  it('recovery counts neutral 0.6', () => {
    expect(consistency([{ dateKey: 'x', rate: 0, isRecovery: true }])).toBeCloseTo(0.6);
  });
  it('streaks: current + longest', () => {
    const r = streaks(days, '2026-01-04');
    expect(r.current).toBe(1);
    expect(r.longest).toBe(2);
  });
});
