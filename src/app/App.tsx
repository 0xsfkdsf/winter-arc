import { useCallback, useEffect, useState } from 'react';
import { Search, Flame } from 'lucide-react';
import { StoreProvider, useStore } from '../application/store';
import { Sidebar } from '../components/chrome';
import { Atmosphere } from '../components/atmosphere';
import { CommandPalette } from '../components/palette';
import { Today } from '../features/Today';
import { Study } from '../features/Study';
import { FocusOverlay, FocusTarget, startFocusSession } from '../features/Focus';
import { Timeline } from '../features/Timeline';
import { Progress, ArcPage, ArcComplete } from '../features/Progress';
import { Review } from '../features/Review';
import { Settings } from '../features/Settings';
import { Onboarding } from '../features/Onboarding';
import { ReturnMoment } from '../features/Arrival';
import { unlockAudio } from '../audio/cues';
import { SettingsRepo } from '../database/sqlite';

function Shell() {
  const s = useStore();
  const [palette, setPalette] = useState(false);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [newTaskSignal, setNewTaskSignal] = useState(0);
  const [completedArc, setCompletedArc] = useState<any | null>(null);
  const [showNewArc, setShowNewArc] = useState(false);

  const quickFocus = useCallback(() => {
    const preset = Number(SettingsRepo.get('focus.planned', localStorage.getItem('wa.focus.preset') ?? '45')) || 45;
    setFocus(startFocusSession(null, s.subjects[0]?.id ?? null, preset, s.subjects));
  }, [s.subjects]);

  const focusTask = useCallback((t: any) => {
    const preset = Number(SettingsRepo.get('focus.planned', '45')) || t.estimateMin || 45;
    setFocus(startFocusSession(t, null, preset, s.subjects));
  }, [s.subjects]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); }
      if (typing || palette || focus) return;
      if (e.key.toLowerCase() === 'n') { setNewTaskSignal((v) => v + 1); s.go('study'); }
      if (e.key.toLowerCase() === 'f') quickFocus();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [palette, focus, quickFocus, s]);

  // Warm the interface-sound channel on first touch so cues play instantly.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio);
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  if (!s.ready) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="focus-ring" />
          <div style={{ marginTop: 14, letterSpacing: '.2em', fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>WINTER ARC</div>
        </div>
      </div>
    );
  }

  if ((!s.arc && !completedArc) || showNewArc) {
    return <Onboarding done={() => { setShowNewArc(false); s.reload(); }} />;
  }

  if (completedArc) {
    return <ArcComplete arc={completedArc} onNew={() => { setCompletedArc(null); setShowNewArc(true); }} />;
  }

  return (
    <div className={'shell' + (s.collapsed ? ' collapsed' : '')}>
      <Atmosphere />
      <Sidebar onFocus={quickFocus} />
      <div className="main">
        <div className="topbar">
          <span className="date">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · <span className="num">{dailyLine(s)}</span></span>
          <span style={{ marginInlineStart: 'auto' }} className="toolbar">
            <button className="btn ghost" onClick={() => setPalette(true)}><Search size={14} /> <span className="kbd">Ctrl K</span></button>
            <button className="btn primary" onClick={quickFocus}><Flame size={14} /> Focus</button>
          </span>
        </div>
        <div className="page-scroll">
          {s.page === 'today' && <Today onFocusTask={focusTask} />}
          {s.page === 'arc' && <ArcPage onComplete={() => setCompletedArc(s.arc)} />}
          {s.page === 'study' && <Study onFocusTask={focusTask} newTaskSignal={newTaskSignal} />}
          {s.page === 'timeline' && <Timeline />}
          {s.page === 'progress' && <Progress />}
          {s.page === 'review' && <Review />}
          {s.page === 'settings' && <Settings />}
        </div>
      </div>
      <CommandPalette open={palette} close={() => setPalette(false)} onNewTask={() => { setNewTaskSignal((v) => v + 1); s.go('study'); }} onQuickFocus={quickFocus} />
      {focus && <FocusOverlay target={focus} close={() => { setFocus(null); s.reload(); }} onNewTask={() => { setFocus(null); s.go('study'); setNewTaskSignal((v) => v + 1); }} />}
      {s.toast && <div className="toast"><span>{s.toast}</span></div>}
      <ReturnMoment />
    </div>
  );
}

function dailyLine(s: any): string {
  const positives = (s.habits as any[]).filter((h: any) => h.kind !== 'avoidance');
  const done = positives.filter((h: any) => (s.completions as any)[h.id]).length;
  return `${done}/${positives.length} practices`;
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
