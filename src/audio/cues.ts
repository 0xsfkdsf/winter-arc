// Signature interface sounds (earcons) — a fully INDEPENDENT audio channel
// from the soundscapes: own AudioContext, own gain, own volume. UI tones
// play with Silence selected; no track ever needs to be running.
// Research-grounded: few, distinguishable, consistent, quiet, learned in
// context — and never a sound for slips or mistakes.
export type CueID = 'toggle' | 'complete' | 'session' | 'milestone' | 'welcome';

const CUE_KEY = 'wa.uiSounds';
const VOL_KEY = 'wa.cue.vol';

export function uiSoundsEnabled(): boolean {
  try {
    return (localStorage.getItem(CUE_KEY) ?? 'on') === 'on';
  } catch {
    return true;
  }
}

export function setUiSounds(on: boolean): void {
  try {
    localStorage.setItem(CUE_KEY, on ? 'on' : 'off');
  } catch { /* private mode */ }
}

function loadCueVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOL_KEY));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.7;
  } catch {
    return 0.7;
  }
}

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let volume = loadCueVolume();
let unlocked = false;

function cueCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = volume * volume; // perceptual curve
    out.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Warm the channel inside the first user gesture so later cues play instantly. */
export function unlockAudio(): void {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  try {
    cueCtx();
  } catch { /* audio must never break the UI */ }
}

export function getCueVolume(): number {
  return volume;
}

export function setCueVolume(v: number): void {
  volume = Number.isNaN(v) ? 0.7 : Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(VOL_KEY, String(volume));
  } catch { /* private mode */ }
  if (out && ctx) out.gain.setTargetAtTime(volume * volume, ctx.currentTime, 0.05);
}

// One cold-bell family: sine + octave shimmer, exponential decays.
function bell(freq: number, at: number, dur: number, peak: number): void {
  const c = cueCtx();
  const t0 = c.currentTime + at;
  const o1 = c.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 2.01;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const g2 = c.createGain();
  g2.gain.value = 0.28;
  o1.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(out!);
  o1.start(t0);
  o2.start(t0);
  o1.stop(t0 + dur + 0.05);
  o2.stop(t0 + dur + 0.05);
}

const CUES: Record<CueID, [number, number, number, number][]> = {
  // [freq, delay, duration, peak]
  toggle: [[660, 0, 0.14, 0.12]],
  complete: [
    [523.25, 0, 0.22, 0.14],
    [784, 0.09, 0.3, 0.14],
  ],
  session: [
    [392, 0, 0.25, 0.15],
    [523.25, 0.11, 0.25, 0.15],
    [659.25, 0.22, 0.4, 0.16],
  ],
  milestone: [
    [523.25, 0, 0.2, 0.15],
    [659.25, 0.1, 0.2, 0.15],
    [784, 0.2, 0.2, 0.15],
    [1046.5, 0.3, 0.5, 0.17],
  ],
  welcome: [
    [330, 0, 0.35, 0.13],
    [495, 0.14, 0.45, 0.13],
  ],
};

export function playCue(id: CueID, opts?: { force?: boolean }): void {
  if (typeof window === 'undefined') return;
  // The finish cue can be forced: completing real work must always be heard.
  if (!uiSoundsEnabled() && !opts?.force) return;
  try {
    for (const [f, at, dur, peak] of CUES[id]) bell(f, at, dur, peak);
  } catch { /* audio must never break the UI */ }
}
