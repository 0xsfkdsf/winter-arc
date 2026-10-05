import { describe, it, expect } from 'vitest';
import { calendarKey, diffDays, arcDayNumber, arcTotalDays, weekKey, addDaysKey } from '../src/domain/dates';

describe('dates', () => {
  it('calendarKey is local and stable', () => {
    expect(calendarKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('diffDays is DST-safe', () => {
    expect(diffDays('2026-01-01', '2026-01-02')).toBe(1);
    expect(diffDays('2026-01-01', '2026-04-01')).toBe(90); // 2026 not leap
  });
  it('arc day math', () => {
    expect(arcDayNumber('2026-01-01', '2026-01-01')).toBe(1);
    expect(arcDayNumber('2026-01-01', '2026-01-23')).toBe(23);
    expect(arcTotalDays('2026-01-01', '2026-04-02')).toBe(92);
  });
  it('addDays crosses month', () => {
    expect(addDaysKey('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('weekKey format', () => {
    expect(weekKey(new Date(2026, 9, 1))).toMatch(/2026-W\d{2}/);
  });
});
