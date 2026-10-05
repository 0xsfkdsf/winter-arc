import { useEffect, useState } from 'react';
import { useArcMeta, useStore } from '../application/store';
import { playCue } from '../audio/cues';

// Stepping away and coming back should feel like re-entering, not rebooting.
// Returning users need *recall* support (where was I?), a visible place in
// the journey, and one clear next action — never a lecture.
const LAST_KEY = 'wa.lastActive';
const RETURN_GAP = 4 * 3600000; // away 4h+ → welcome-back moment

export function touchActive(): void {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch { /* private mode */ }
}

function lastActive(): number {
  try {
    return Number(localStorage.getItem(LAST_KEY)) || 0;
  } catch {
    return 0;
  }
}

// Read once at module load so StrictMode remounts can't erase the gap.
const bootAwayMs = typeof window === 'undefined' ? 0 : Date.now() - lastActive();
const bootHadHistory = typeof window === 'undefined' ? false : lastActive() > 0;

/** "Welcome back. Day X is still available. Continue." — recall, not shame. */
export function ReturnMoment() {
  const s = useStore();
  const meta = useArcMeta();
  const [show, setShow] = useState(() => bootHadHistory && bootAwayMs > RETURN_GAP);

  useEffect(() => {
    touchActive();
    const beat = setInterval(touchActive, 60000);
    const hide = () => touchActive();
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('beforeunload', hide);
    return () => {
      clearInterval(beat);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('beforeunload', hide);
    };
  }, []);

  if (!show || !s.arc || !meta) return null;
  return (
    <div className="scrim return-scrim" role="dialog" aria-label="Welcome back">
      <div className="modal return-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chapter">THE ARC KEPT YOUR PLACE</div>
        <div className="big-q">Welcome back.</div>
        <p className="hero-identity">
          Day <strong className="num">{meta.day}</strong> is still available.
        </p>
        <button
          className="btn primary"
          onClick={() => {
            playCue('welcome');
            touchActive();
            setShow(false);
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
