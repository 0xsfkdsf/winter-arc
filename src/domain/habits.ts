// Habit + avoidance state machines. No UI, no DB.
export type HabitState = 'open' | 'done' | 'partial' | 'missed' | 'rest';
export type AvoidState = 'open' | 'maintained' | 'slip';

export interface HabitEval {
  state: HabitState;
  completionRate: number; // 0..1
}

/** Positive habit: minutes vs minimum. Rest days always count as neutral-complete. */
export function evalHabit(minutes: number, minMinutes: number, isRestDay = false): HabitEval {
  if (isRestDay) return { state: 'rest', completionRate: 1 };
  if (minutes <= 0) return { state: 'open', completionRate: 0 };
  if (minutes >= minMinutes) return { state: 'done', completionRate: 1 };
  return { state: 'partial', completionRate: minutes / Math.max(1, minMinutes) };
}

export function toggleHabit(current: HabitState): HabitState {
  return current === 'done' ? 'open' : 'done';
}

export function toggleAvoid(current: AvoidState): AvoidState {
  // cycle: open -> maintained -> slip -> open (never shames)
  if (current === 'open') return 'maintained';
  if (current === 'maintained') return 'slip';
  return 'open';
}

/** Day completion across positive habits (avoidances counted separately). */
export function dayCompletion(states: HabitState[]): number {
  if (states.length === 0) return 0;
  const score: number[] = states.map((s) =>
    s === 'done' || s === 'rest' ? 1 : s === 'partial' ? 0.5 : 0,
  );
  return score.reduce((a: number, b: number) => a + b, 0) / states.length;
}
