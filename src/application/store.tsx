import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as DB from '../database/sqlite';
import { calendarKey, arcDayNumber, arcTotalDays, addDaysKey } from '../domain/dates';
import { dayCompletion } from '../domain/habits';

export type Page = 'today' | 'arc' | 'study' | 'timeline' | 'progress' | 'review' | 'settings';

interface Snapshot {
  arc: any | null;
  habits: any[];
  completions: Record<string, any>;
  avoid: Record<string, any>;
  subjects: any[];
  tasks: any[];
  sessions: any[];
  eventsToday: any[];
  yesterdayRate: number | null;
}

interface Store extends Snapshot {
  ready: boolean;
  todayKey: string;
  page: Page;
  go: (p: Page) => void;
  theme: string;
  setTheme: (t: string) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  reload: () => void;
  toast: string | null;
  notify: (m: string) => void;
}

const Ctx = createContext<Store>(null as any);
export const useStore = () => useContext(Ctx);

function loadSnapshot(arcId: string | null, todayKey: string): Snapshot {
  if (!arcId) return { arc: null, habits: [], completions: {}, avoid: {}, subjects: [], tasks: [], sessions: [], eventsToday: [], yesterdayRate: null };
  const arc = DB.ArcRepo.active();
  DB.ensurePornographyTracker(arcId); // backfill for pre-1.0.1 arcs
  const habits = DB.HabitRepo.byArc(arcId);
  const completions: Record<string, any> = {};
  const avoid: Record<string, any> = {};
  for (const h of habits) {
    if (h.kind === 'avoidance') {
      const a = DB.HabitRepo.avoidState(h.id, todayKey);
      if (a) avoid[h.id] = a;
    } else {
      const c = DB.HabitRepo.completion(h.id, todayKey);
      if (c) completions[h.id] = c;
    }
  }
  const subjects = DB.StudyRepo.subjects(arcId);
  const tasks = DB.StudyRepo.allTasks(arcId);
  const sessions = DB.SessionRepo.completed(arcId);
  const eventsToday = DB.TimelineRepo.day(todayKey);
  // yesterday completion for recovery banner — only inside the arc:
  // on Day 1 there is no "yesterday", so the banner stays silent.
  const yKey = addDaysKey(todayKey, -1);
  let yesterdayRate: number | null = null;
  if (arc && yKey >= arc.startDate) {
    try {
      const yComps = habits.filter((h: any) => h.kind !== 'avoidance').map((h: any) => {
        const c = DB.HabitRepo.completion(h.id, yKey);
        return c ? 'done' : 'open';
      });
      if (yComps.length) yesterdayRate = dayCompletion(yComps as any);
    } catch { yesterdayRate = null; }
  }
  return { arc, habits, completions, avoid, subjects, tasks, sessions, eventsToday, yesterdayRate };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('today');
  const [theme, setThemeState] = useState('system');
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const todayKey = calendarKey();

  const notify = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    (async () => {
      await DB.loadDatabase();
      setThemeState(DB.SettingsRepo.get('theme', 'system'));
      setReady(true);
    })();
    const flush = () => { if (document.visibilityState === 'hidden') DB.persist(); };
    document.addEventListener('visibilitychange', flush);
    const unsub = DB.onData(() => setTick((t) => t + 1));
    return () => { document.removeEventListener('visibilitychange', flush); unsub(); };
  }, []);

  useEffect(() => {
    const sysDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const eff = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;
    document.documentElement.dataset.theme = eff === 'light' ? 'light' : 'dark';
  }, [theme]);

  const setTheme = useCallback((t: string) => {
    setThemeState(t);
    try { DB.SettingsRepo.set('theme', t); } catch { /* pre-ready */ }
  }, [],);

  const arc = useMemo(() => {
    if (!ready) return null;
    try { return DB.ArcRepo.active(); } catch { return null; }
  }, [ready, tick]);

  const snap = useMemo(() => (ready ? loadSnapshot(arc?.id ?? null, todayKey) : null), [ready, arc?.id, todayKey, tick]);
  void tick;

  const value: Store = useMemo(() => ({
    ready,
    todayKey,
    page,
    go: setPage,
    theme,
    setTheme,
    collapsed,
    toggleCollapsed: () => setCollapsed((c) => !c),
    reload,
    toast,
    notify,
    arc: snap?.arc ?? null,
    habits: snap?.habits ?? [],
    completions: snap?.completions ?? {},
    avoid: snap?.avoid ?? {},
    subjects: snap?.subjects ?? [],
    tasks: snap?.tasks ?? [],
    sessions: snap?.sessions ?? [],
    eventsToday: snap?.eventsToday ?? [],
    yesterdayRate: snap?.yesterdayRate ?? null,
  }), [ready, todayKey, page, theme, setTheme, collapsed, reload, toast, notify, snap]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useArcMeta() {
  const { arc, todayKey } = useStore();
  if (!arc) return null;
  const day = arcDayNumber(arc.startDate, todayKey);
  const total = arcTotalDays(arc.startDate, arc.endDate);
  return { day: Math.min(Math.max(day, 1), total), total, progress: Math.min(day / total, 1) };
}
