// Timestamp-truth focus engine. Tick counts never drive truth.
export interface FocusClock {
  startedAt: number;      // epoch ms
  pausedMs: number;       // accumulated paused time
  pauseStartedAt: number | null;
  plannedMin: number;
}

export function createClock(plannedMin: number, now = Date.now()): FocusClock {
  return { startedAt: now, pausedMs: 0, pauseStartedAt: null, plannedMin };
}

export function pauseClock(c: FocusClock, now = Date.now()): FocusClock {
  if (c.pauseStartedAt !== null) return c;
  return { ...c, pauseStartedAt: now };
}

export function resumeClock(c: FocusClock, now = Date.now()): FocusClock {
  if (c.pauseStartedAt === null) return c;
  return { ...c, pausedMs: c.pausedMs + (now - c.pauseStartedAt), pauseStartedAt: null };
}

/** Elapsed active ms (excludes paused time, handles pause-in-progress). */
export function elapsedMs(c: FocusClock, now = Date.now()): number {
  const paused = c.pausedMs + (c.pauseStartedAt !== null ? now - c.pauseStartedAt : 0);
  return Math.max(0, now - c.startedAt - paused);
}

export function remainingMs(c: FocusClock, now = Date.now()): number {
  return Math.max(0, c.plannedMin * 60000 - elapsedMs(c, now));
}

export function isComplete(c: FocusClock, now = Date.now()): boolean {
  return elapsedMs(c, now) >= c.plannedMin * 60000;
}

export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export function nextPhase(phase: Phase, doneCount: number, longEvery: number): Phase {
  if (phase !== 'focus') return 'focus';
  return doneCount % longEvery === 0 ? 'longBreak' : 'shortBreak';
}

/** Focus credit for a task: elapsed minutes vs estimate → new progress, auto-done at 100. */
export function applyFocusCredit(progress: number, elapsedMin: number, estimateMin: number): { progress: number; done: boolean } {
  if (estimateMin <= 0) return { progress: 100, done: true };
  const p = Math.min(100, Math.max(0, Math.round(progress + (elapsedMin / estimateMin) * 100)));
  return { progress: p, done: p >= 100 };
}
