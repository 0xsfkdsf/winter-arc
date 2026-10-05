// Generative focus soundscapes — the spirit of functional music (à la brain.fm)
// without the streaming dependency: 100% procedural Web Audio, no files, no
// downloads, works fully offline, zero licensing issues. Quiet by default.
export type TrackID = 'off' | 'rain' | 'wind' | 'drone' | 'brown' | 'still';

export interface TrackDef {
  id: TrackID;
  name: string;
  desc: string;
}

export const TRACKS: TrackDef[] = [
  { id: 'off', name: 'Silence', desc: 'quiet by default' },
  { id: 'rain', name: 'Winter Rain', desc: 'soft rain on cold glass' },
  { id: 'wind', name: 'Night Wind', desc: 'cold air through dark pines' },
  { id: 'drone', name: 'Deep Drone', desc: 'low mysterious hum for deep work' },
  { id: 'brown', name: 'Brown Noise', desc: 'deep focus static' },
  { id: 'still', name: 'Still Air', desc: 'barely-there hush for reading' },
];

export function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

const VOL_KEY = 'wa.scape.vol';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let live: { out: GainNode; kill: () => void } | null = null;
let current: TrackID = 'off';
let volume = (() => {
  try {
    const v = Number(localStorage.getItem(VOL_KEY));
    return Number.isFinite(v) ? clampVolume(v) : 0.5;
  } catch {
    return 0.5;
  }
})();

function ac(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * volume; // perceptual curve
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseSource(kind: 'white' | 'brown' | 'pink'): AudioBufferSourceNode {
  const c = ac();
  const len = c.sampleRate * 3;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  if (kind === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (kind === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
  } else {
    // pink-ish (Paul Kellet filter)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function sweepLFO(freq: number, depth: number, base: number, param: AudioParam): OscillatorNode {
  const c = ac();
  const o = c.createOscillator();
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = depth;
  o.connect(g);
  g.connect(param);
  param.value = base;
  o.start();
  return o;
}

function build(id: Exclude<TrackID, 'off'>): { out: GainNode; kill: () => void } {
  const c = ac();
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(master!);
  const stoppers: (() => void)[] = [];
  const gain = (v: number) => {
    const g = c.createGain();
    g.gain.value = v;
    return g;
  };
  // wire a chain of nodes, ending at the track output
  const chain = (...nodes: AudioNode[]) => {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1] as AudioNode);
    nodes[nodes.length - 1].connect(out);
  };
  const runSrc = (s: AudioBufferSourceNode) => {
    s.start();
    stoppers.push(() => {
      try { s.stop(); } catch { /* already stopped */ }
      s.disconnect();
    });
  };
  const keepOsc = (o: OscillatorNode) => {
    stoppers.push(() => {
      try { o.stop(); } catch { /* already stopped */ }
      o.disconnect();
    });
  };
  const runOsc = (o: OscillatorNode) => { o.start(); keepOsc(o); };

  if (id === 'rain') {
    const s1 = noiseSource('white');
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.5;
    chain(s1, bp, gain(0.5)); runSrc(s1);
    keepOsc(sweepLFO(0.07, 700, 2200, bp.frequency));
    const s2 = noiseSource('white');
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480;
    chain(s2, lp, gain(0.16)); runSrc(s2);
  } else if (id === 'wind') {
    const s = noiseSource('pink');
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 0.4;
    chain(s, lp, gain(0.5)); runSrc(s);
    keepOsc(sweepLFO(0.05, 260, 480, lp.frequency));
  } else if (id === 'drone') {
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = gain(0.14);
    const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.5 * 1.007;
    const o3 = c.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 110.3;
    const g3 = gain(0.25);
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp); lp.connect(g); g.connect(out);
    runOsc(o1); runOsc(o2); runOsc(o3);
    keepOsc(sweepLFO(0.09, 0.05, 0.14, g.gain));
  } else if (id === 'brown') {
    const s = noiseSource('brown');
    chain(s, gain(0.5)); runSrc(s);
  } else {
    const s = noiseSource('pink');
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    chain(s, lp, gain(0.2)); runSrc(s);
  }

  return {
    out,
    kill: () => {
      stoppers.forEach((k) => k());
      try { out.disconnect(); } catch { /* noop */ }
    },
  };
}

export function getTrack(): TrackID {
  return current;
}

export function getVolume(): number {
  return volume;
}

export function setVolume(v: number): void {
  volume = clampVolume(v);
  try {
    localStorage.setItem(VOL_KEY, String(volume));
  } catch { /* private mode */ }
  if (master && ctx) master.gain.setTargetAtTime(volume * volume, ctx.currentTime, 0.1);
}

export function playTrack(id: TrackID): void {
  if (id === current) return;
  const c = ac();
  const old = live;
  live = null;
  if (old) {
    old.out.gain.setTargetAtTime(0, c.currentTime, 0.25);
    setTimeout(old.kill, 800);
  }
  current = id;
  if (id === 'off') return;
  const b = build(id);
  live = b;
  b.out.gain.setTargetAtTime(1, c.currentTime, 0.8);
}
