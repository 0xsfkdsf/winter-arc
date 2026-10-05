import { useEffect, useRef, useState } from 'react';

// Living winter-night backdrop: slow aurora drift + rising motes on canvas.
// - rAF pauses itself when the window is hidden/minimized (≈0 idle CPU)
// - one static frame when reduced-motion is on or Atmosphere is disabled
// - pointer-events: none, purely decorative
export function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ver, setVer] = useState(0);

  useEffect(() => {
    const on = () => setVer((v) => v + 1);
    window.addEventListener('wa:atmosphere', on);
    return () => window.removeEventListener('wa:atmosphere', on);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let raf = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
    };
    resize();
    window.addEventListener('resize', resize);

    let setting = 'on';
    try {
      setting = localStorage.getItem('wa.atmosphere') ?? 'on';
    } catch { /* default on */ }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const n = Math.max(18, Math.min(48, Math.floor((window.innerWidth * window.innerHeight) / 36000)));
    const motes = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.7,
      s: 0.0001 + Math.random() * 0.00045,
      drift: (Math.random() - 0.5) * 0.0002,
      o: 0.2 + Math.random() * 0.55,
      ph: Math.random() * 6.28,
      warm: Math.random() < 0.14,
    }));
    let t = Math.random() * 1000;

    const blob = (x: number, y: number, r: number, rgb: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.max(w, h);
      blob(w * 0.14 + Math.sin(t * 0.05) * 30, h * 0.05, R * 0.42, '147,180,253', 0.1);
      blob(w * 0.86 + Math.cos(t * 0.04) * 34, h * 0.1, R * 0.36, '94,234,212', 0.055);
      blob(w * 0.55, h * 1.04, R * 0.5, '240,196,138', 0.045);
      for (const m of motes) {
        const tw = 0.6 + 0.4 * Math.sin(t * 0.9 + m.ph);
        const a = (m.o * tw).toFixed(3);
        ctx.fillStyle = m.warm ? `rgba(240,196,138,${a})` : `rgba(198,214,240,${a})`;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r, 0, 6.2832);
        ctx.fill();
      }
    };

    if (reduced || setting === 'off') {
      draw();
      return () => window.removeEventListener('resize', resize);
    }
    const loop = () => {
      t += 0.016;
      for (const m of motes) {
        m.y -= m.s;
        m.x += m.drift;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02) m.x = 1.02;
        if (m.x > 1.02) m.x = -0.02;
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [ver]);

  return <canvas className="atmosphere" ref={ref} aria-hidden="true" />;
}
