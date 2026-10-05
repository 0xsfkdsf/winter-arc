// SQLite (sql.js / WASM) adapter: proper schema + migrations + transactions + persistence.
// Renderer owns the DB; Electron main owns the file (or localStorage fallback on web).
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { calendarKey } from '../domain/dates';
import { applyFocusCredit } from '../domain/focus';

declare global {
  interface Window { wa?: { isElectron?: boolean; dbLoad?: () => Promise<string | null | any>; dbSave?: (b64: string) => Promise<any>; dbPath?: () => Promise<string>; dbDelete?: () => Promise<any>; exportFile?: (n: string, c: string) => Promise<any>; wasm?: () => Promise<string | null | any> }; }
}

export type SqlValue = string | number | null | Uint8Array;
let db: any = null;
let saveTimer: any = null;
let dataVersion = 0;
const listeners = new Set<() => void>();
export const onData = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function emit() { dataVersion++; listeners.forEach((f) => f()); scheduleSave(); }
export const version = () => dataVersion;

const LS_KEY = 'winter-arc.sqlite.b64';

function b64encode(u8: Uint8Array): string {
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode(...u8.subarray(i, i + CH));
  return btoa(s);
}
function b64decode(b64: string): Uint8Array {
  const s = atob(b64); const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export async function loadDatabase(): Promise<void> {
  // Prefer WASM bytes over IPC (packaged file:// build); fall back to fetch (dev/web).
  let wasmBinary: Uint8Array | undefined;
  try {
    if (window.wa?.wasm) {
      const b64 = await window.wa.wasm();
      if (typeof b64 === 'string' && b64.length > 0) wasmBinary = b64decode(b64);
    }
  } catch { /* fallback to locateFile */ }
  const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : { locateFile: () => wasmUrl });
  let restored: Uint8Array | null = null;
  try {
    if (window.wa?.dbLoad) {
      const r = await window.wa.dbLoad();
      if (typeof r === 'string' && r.length > 0) restored = b64decode(r);
    }
  } catch { /* fall through to localStorage */ }
  if (!restored) {
    try {
      const ls = localStorage.getItem(LS_KEY);
      if (ls) restored = b64decode(ls);
    } catch { /* fresh */ }
  }
  db = restored ? new SQL.Database(restored) : new SQL.Database();
  migrate();
  seedIfEmpty();
  persist(true);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persist(), 400);
}

export function persist(immediate = false) {
  const doSave = async () => {
    if (!db) return;
    try {
      const u8: Uint8Array = db.export();
      const b64 = b64encode(u8);
      try { localStorage.setItem(LS_KEY, b64); } catch { /* quota */ }
      if (window.wa?.dbSave) await window.wa.dbSave(b64);
    } catch { /* never crash UI on save */ }
  };
  if (immediate) void doSave();
  else void doSave();
}

// ---------- low-level ----------
export function exec(sql: string, params: SqlValue[] = []): void {
  db.exec('BEGIN');
  try {
    db.run(sql, params);
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* noop */ }
    throw e;
  }
  emit();
}
export function runMany(stmts: [string, SqlValue[]][]): void {
  db.exec('BEGIN');
  try {
    for (const [sql, p] of stmts) db.run(sql, p);
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* noop */ }
    throw e;
  }
  emit();
}
export function query<T = any>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const out: T[] = [];
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}
export function queryOne<T = any>(sql: string, params: SqlValue[] = []): T | null {
  const r = query<T>(sql, params);
  return r.length ? r[0] : null;
}
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------- schema + migrations ----------
function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS arcs (id TEXT PRIMARY KEY, title TEXT, startDate TEXT, endDate TEXT, identity TEXT, status TEXT DEFAULT 'active', createdAt INTEGER);
    CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, arcId TEXT, dimension TEXT, kind TEXT, title TEXT, titleAr TEXT, minMinutes INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS completions (id TEXT PRIMARY KEY, habitId TEXT, dateKey TEXT, state TEXT, minutes INTEGER DEFAULT 0, ts INTEGER, UNIQUE(habitId, dateKey));
    CREATE TABLE IF NOT EXISTS avoid (id TEXT PRIMARY KEY, habitId TEXT, dateKey TEXT, state TEXT, ts INTEGER, UNIQUE(habitId, dateKey));
    CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, arcId TEXT, name TEXT, color TEXT);
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, subjectId TEXT, title TEXT, estimateMin INTEGER DEFAULT 45, deadline TEXT, priority TEXT DEFAULT 'normal', progress INTEGER DEFAULT 0, status TEXT DEFAULT 'open', createdAt INTEGER);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, taskId TEXT, subjectId TEXT, startedAt INTEGER, endedAt INTEGER, pausedMs INTEGER DEFAULT 0, mode TEXT, plannedMin INTEGER, status TEXT, dateKey TEXT);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, dateKey TEXT, ts INTEGER, kind TEXT, title TEXT, minutes INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, arcId TEXT, weekKey TEXT UNIQUE, wentWell TEXT, didnt TEXT, changeTxt TEXT, focusNext TEXT, snapshot TEXT, ts INTEGER);
    CREATE TABLE IF NOT EXISTS books (id TEXT PRIMARY KEY, title TEXT, minutesTotal INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT);`);
  const row = queryOne<{ v: string }>(`SELECT v FROM _meta WHERE k='schema'`);
  if (!row) exec(`INSERT INTO _meta (k,v) VALUES ('schema','1')`);
}

const DEFAULT_SUBJECTS = [
  { name: 'Mathematics', color: '#93b4fd' },
  { name: 'Physics', color: '#5eead4' },
  { name: 'Chemistry', color: '#f0c48a' },
  { name: 'Arabic', color: '#c4b5fd' },
  { name: 'English', color: '#7dd3fc' },
];
const SPIRITUAL = [
  { title: "Qur'an", titleAr: 'القرآن الكريم', min: 10 },
  { title: 'Morning Adhkar', titleAr: 'أذكار الصباح', min: 5 },
  { title: 'Evening Adhkar', titleAr: 'أذكار المساء', min: 5 },
  { title: 'Witr', titleAr: 'الوتر', min: 5 },
  { title: 'Sleep Adhkar', titleAr: 'أذكار النوم', min: 3 },
];

function seedIfEmpty() {
  const n = queryOne<{ c: number }>(`SELECT COUNT(*) c FROM arcs`);
  if (n && n.c > 0) return;
}

export function seedForArc(arcId: string) {
  const stmts: [string, SqlValue[]][] = [];
  for (const s of SPIRITUAL)
    stmts.push([`INSERT INTO habits (id,arcId,dimension,kind,title,titleAr,minMinutes) VALUES (?,?,?,?,?,?,?)`, [uid(), arcId, 'spiritual', 'positive', s.title, s.titleAr, s.min]]);
  stmts.push([`INSERT INTO habits (id,arcId,dimension,kind,title,titleAr,minMinutes) VALUES (?,?,?,?,?,?,?)`, [uid(), arcId, 'mental', 'positive', 'Reading', 'القراءة', 5]]);
  stmts.push([`INSERT INTO habits (id,arcId,dimension,kind,title,titleAr,minMinutes) VALUES (?,?,?,?,?,?,?)`, [uid(), arcId, 'physical', 'positive', 'Workout', 'الرياضة', 20]]);
  stmts.push([`INSERT INTO habits (id,arcId,dimension,kind,title,titleAr,minMinutes) VALUES (?,?,?,?,?,?,?)`, [uid(), arcId, 'physical', 'positive', 'Brush teeth / Miswak', 'السواك', 2]]);
  for (const t of ['Movies / Series', 'Music', 'Social Media', 'Pornography'])
    stmts.push([`INSERT INTO habits (id,arcId,dimension,kind,title,titleAr,minMinutes) VALUES (?,?,?,?,?,?,?)`, [uid(), arcId, 'breaking', 'avoidance', t, '', 0]]);
  for (const s of DEFAULT_SUBJECTS)
    stmts.push([`INSERT INTO subjects (id,arcId,name,color) VALUES (?,?,?,?)`, [uid(), arcId, s.name, s.color]]);
  runMany(stmts);
}

// Backfill for arcs created before the Pornography tracker existed.
// Targeted: only this one item is ever added — nothing the user deleted
// themselves is resurrected.
export function ensurePornographyTracker(arcId: string) {
  const has = queryOne<{ c: number }>(
    `SELECT COUNT(*) c FROM habits WHERE arcId=? AND title='Pornography'`, [arcId]);
  if (has && has.c > 0) return;
  exec(`INSERT INTO habits (id,arcId,dimension,kind,title,titleAr,minMinutes) VALUES (?,?,?,?,?,?,?)`,
    [uid(), arcId, 'breaking', 'avoidance', 'Pornography', '', 0]);
}

// ---------- repos ----------
export const ArcRepo = {
  active() { return queryOne<any>(`SELECT * FROM arcs WHERE status='active' ORDER BY createdAt DESC LIMIT 1`); },
  all() { return query<any>(`SELECT * FROM arcs ORDER BY createdAt DESC`); },
  create(title: string, start: string, end: string, identity: string) {
    const id = uid();
    exec(`INSERT INTO arcs (id,title,startDate,endDate,identity,status,createdAt) VALUES (?,?,?,?,?,'active',?)`, [id, title, start, end, identity, Date.now()]);
    seedForArc(id);
    return id;
  },
  complete(id: string) { exec(`UPDATE arcs SET status='complete' WHERE id=?`, [id]); },
};

export const HabitRepo = {
  byArc(arcId: string) { return query<any>(`SELECT * FROM habits WHERE arcId=?`, [arcId]); },
  completion(habitId: string, dateKey: string) {
    return queryOne<any>(`SELECT * FROM completions WHERE habitId=? AND dateKey=?`, [habitId, dateKey]);
  },
  avoidState(habitId: string, dateKey: string) {
    return queryOne<any>(`SELECT * FROM avoid WHERE habitId=? AND dateKey=?`, [habitId, dateKey]);
  },
  setDone(habitId: string, dateKey: string, minutes = 0) {
    exec(`INSERT INTO completions (id,habitId,dateKey,state,minutes,ts) VALUES (?,?,?,?,?,?)
      ON CONFLICT(habitId,dateKey) DO UPDATE SET state=excluded.state, minutes=excluded.minutes, ts=excluded.ts`,
      [uid(), habitId, dateKey, 'done', minutes, Date.now()]);
    const h = queryOne<any>(`SELECT title FROM habits WHERE id=?`, [habitId]);
        exec(`INSERT INTO events (id,dateKey,ts,kind,title,minutes) VALUES (?,?,?,?,?,?)`, [uid(), dateKey, Date.now(), 'habit', h?.title ?? 'Habit', minutes]);
  },
  setOpen(habitId: string, dateKey: string) {
    exec(`DELETE FROM completions WHERE habitId=? AND dateKey=?`, [habitId, dateKey]);
  },
  logMinutes(habitId: string, dateKey: string, minutes: number) {
    const cur = HabitRepo.completion(habitId, dateKey);
    const total = (cur?.minutes ?? 0) + minutes;
    exec(`INSERT INTO completions (id,habitId,dateKey,state,minutes,ts) VALUES (?,?,?,?,?,?)
      ON CONFLICT(habitId,dateKey) DO UPDATE SET minutes=excluded.minutes, state='done', ts=excluded.ts`,
      [uid(), habitId, dateKey, total, Date.now()]);
    const h = queryOne<any>(`SELECT title FROM habits WHERE id=?`, [habitId]);
    exec(`INSERT INTO events (id,dateKey,ts,kind,title,minutes) VALUES (?,?,?,?,?,?)`, [uid(), dateKey, Date.now(), 'habit', `${h?.title ?? 'Practice'} · ${minutes}m`, minutes]);
  },
  setAvoid(habitId: string, dateKey: string, state: string) {
    if (state === 'open') exec(`DELETE FROM avoid WHERE habitId=? AND dateKey=?`, [habitId, dateKey]);
    else exec(`INSERT INTO avoid (id,habitId,dateKey,state,ts) VALUES (?,?,?,?,?)
      ON CONFLICT(habitId,dateKey) DO UPDATE SET state=excluded.state, ts=excluded.ts`, [uid(), habitId, dateKey, state, Date.now()]);
  },
};

export const StudyRepo = {
  subjects(arcId: string) { return query<any>(`SELECT * FROM subjects WHERE arcId=?`, [arcId]); },
  addSubject(arcId: string, name: string, color: string) { exec(`INSERT INTO subjects (id,arcId,name,color) VALUES (?,?,?,?)`, [uid(), arcId, name, color]); },
  tasks(subjectId: string) { return query<any>(`SELECT * FROM tasks WHERE subjectId=? ORDER BY createdAt`, [subjectId]); },
  allTasks(arcId: string) {
    return query<any>(`SELECT t.*, s.name subjectName FROM tasks t JOIN subjects s ON s.id=t.subjectId WHERE s.arcId=? ORDER BY t.createdAt`, [arcId]);
  },
  addTask(subjectId: string, title: string, est: number, deadline: string, priority: string) {
    exec(`INSERT INTO tasks (id,subjectId,title,estimateMin,deadline,priority,progress,status,createdAt) VALUES (?,?,?,?,?,?,0,'open',?)`,
      [uid(), subjectId, title, est, deadline, priority, Date.now()]);
  },
  setProgress(id: string, progress: number) {
    exec(`UPDATE tasks SET progress=?, status=? WHERE id=?`, [progress, progress >= 100 ? 'done' : 'open', id]);
  },
  toggleDone(id: string) {
    const t = queryOne<any>(`SELECT * FROM tasks WHERE id=?`, [id]);
    if (!t) return;
    exec(`UPDATE tasks SET status=?, progress=? WHERE id=?`, [t.status === 'done' ? 'open' : 'done', t.status === 'done' ? 0 : 100, id]);
  },
  updateTask(id: string, f: { title: string; estimateMin: number; deadline: string; priority: string; subjectId: string }) {
    exec(`UPDATE tasks SET title=?, estimateMin=?, deadline=?, priority=?, subjectId=? WHERE id=?`,
      [f.title, f.estimateMin, f.deadline, f.priority, f.subjectId, id]);
  },
  deleteTask(id: string) {
    exec(`DELETE FROM tasks WHERE id=?`, [id]);
  },
  creditFocus(taskId: string, elapsedMin: number) {
    const t = queryOne<any>(`SELECT * FROM tasks WHERE id=?`, [taskId]);
    if (!t) return { progress: 0, done: false };
    if (t.status === 'done') return { progress: 100, done: true };
    const r = applyFocusCredit(t.progress ?? 0, elapsedMin, t.estimateMin ?? 45);
    exec(`UPDATE tasks SET progress=?, status=? WHERE id=?`, [r.progress, r.done ? 'done' : 'open', taskId]);
    return r;
  },
  deleteSubject(id: string) {
    // One transaction: tasks of the subject go with it. Past focus sessions
    // are kept (they remain in arc totals; only the per-subject row goes).
    runMany([
      [`DELETE FROM tasks WHERE subjectId=?`, [id]],
      [`DELETE FROM subjects WHERE id=?`, [id]],
    ]);
  },
};

export const SessionRepo = {
  startActive(taskId: string | null, subjectId: string | null, plannedMin: number, mode: string) {
    const id = uid();
    exec(`INSERT INTO sessions (id,taskId,subjectId,startedAt,endedAt,pausedMs,mode,plannedMin,status,dateKey) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, taskId, subjectId, Date.now(), 0, 0, mode, plannedMin, 'active', calendarKey()]);
    return id;
  },
  updateActive(id: string, pausedMs: number, startedAt: number) {
    db.run(`UPDATE sessions SET pausedMs=?, startedAt=? WHERE id=?`, [pausedMs, startedAt, id]);
    scheduleSave();
  },
  finish(id: string, pausedMs: number) {
    const s = queryOne<any>(`SELECT * FROM sessions WHERE id=?`, [id]);
    if (!s) return;
    const endedAt = Date.now();
    exec(`UPDATE sessions SET endedAt=?, pausedMs=?, status='completed', dateKey=? WHERE id=?`, [endedAt, pausedMs, calendarKey(new Date(s.startedAt)), id]);
    const mins = Math.max(0, Math.round((endedAt - s.startedAt - pausedMs) / 60000));
    const sub = s.subjectId ? queryOne<any>(`SELECT name FROM subjects WHERE id=?`, [s.subjectId]) : null;
    const task = s.taskId ? queryOne<any>(`SELECT title FROM tasks WHERE id=?`, [s.taskId]) : null;
    const title = task?.title ?? sub?.name ?? 'Focus session';
    exec(`INSERT INTO events (id,dateKey,ts,kind,title,minutes) VALUES (?,?,?,?,?,?)`, [uid(), calendarKey(), endedAt, 'focus', title, mins]);
  },
  interrupt(id: string) { exec(`UPDATE sessions SET status='interrupted', endedAt=? WHERE id=?`, [Date.now(), id]); },
  active() { return queryOne<any>(`SELECT * FROM sessions WHERE status='active' LIMIT 1`); },
  completed(arcId: string) {
    return query<any>(`SELECT s.* FROM sessions s JOIN subjects sub ON sub.id=s.subjectId WHERE sub.arcId=? AND s.status='completed'`, [arcId]);
  },
  allCompleted() { return query<any>(`SELECT * FROM sessions WHERE status='completed' ORDER BY startedAt DESC LIMIT 400`); },
};

export const TimelineRepo = {
  day(dateKey: string) { return query<any>(`SELECT * FROM events WHERE dateKey=? ORDER BY ts`, [dateKey]); },
};

export const ReviewRepo = {
  get(arcId: string, weekKey: string) { return queryOne<any>(`SELECT * FROM reviews WHERE arcId=? AND weekKey=?`, [arcId, weekKey]); },
  save(arcId: string, weekKey: string, f: any) {
    exec(`INSERT INTO reviews (id,arcId,weekKey,wentWell,didnt,changeTxt,focusNext,snapshot,ts) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(weekKey) DO UPDATE SET wentWell=excluded.wentWell, didnt=excluded.didnt, changeTxt=excluded.changeTxt, focusNext=excluded.focusNext, snapshot=excluded.snapshot`,
      [uid(), arcId, weekKey, f.wentWell ?? '', f.didnt ?? '', f.changeTxt ?? '', f.focusNext ?? '', f.snapshot ?? '', Date.now()]);
  },
};

export const SettingsRepo = {
  get(k: string, fb = '') { return queryOne<{ v: string }>(`SELECT v FROM settings WHERE k=?`, [k])?.v ?? fb; },
  set(k: string, v: string) { exec(`INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`, [k, v]); },
};

// ---------- export / import ----------
export function exportJSON(): string {
  const dump = (t: string) => query(`SELECT * FROM ${t}`);
  return JSON.stringify({ app: 'winter-arc', schema: 1, exportedAt: Date.now(),
    arcs: dump('arcs'), habits: dump('habits'), completions: dump('completions'), avoid: dump('avoid'),
    subjects: dump('subjects'), tasks: dump('tasks'), sessions: dump('sessions'), events: dump('events'),
    reviews: dump('reviews'), books: dump('books'), settings: dump('settings') }, null, 2);
}

export function importJSON(text: string): { ok: boolean; error?: string } {
  let data: any;
  try { data = JSON.parse(text); } catch { return { ok: false, error: 'File is not valid JSON.' }; }
  if (data.app !== 'winter-arc') return { ok: false, error: 'Not a Winter Arc backup (app tag mismatch).' };
  if (typeof data.schema !== 'number' || data.schema > 1) return { ok: false, error: 'Unsupported backup version.' };
  for (const t of ['arcs', 'habits', 'completions', 'subjects', 'tasks', 'sessions']) {
    if (!Array.isArray(data[t])) return { ok: false, error: `Backup is missing table "${t}". Nothing was changed.` };
  }
  try {
    const ins = (table: string, cols: string[], rows: any[]) => {
      for (const r of rows) {
        const vals = cols.map((c) => (r[c] ?? null) as SqlValue);
        db.run(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
      }
    };
    db.exec('BEGIN');
    try {
      ins('arcs', ['id', 'title', 'startDate', 'endDate', 'identity', 'status', 'createdAt'], data.arcs);
      ins('habits', ['id', 'arcId', 'dimension', 'kind', 'title', 'titleAr', 'minMinutes'], data.habits);
      ins('completions', ['id', 'habitId', 'dateKey', 'state', 'minutes', 'ts'], data.completions);
      if (Array.isArray(data.avoid)) ins('avoid', ['id', 'habitId', 'dateKey', 'state', 'ts'], data.avoid);
      ins('subjects', ['id', 'arcId', 'name', 'color'], data.subjects);
      ins('tasks', ['id', 'subjectId', 'title', 'estimateMin', 'deadline', 'priority', 'progress', 'status', 'createdAt'], data.tasks);
      ins('sessions', ['id', 'taskId', 'subjectId', 'startedAt', 'endedAt', 'pausedMs', 'mode', 'plannedMin', 'status', 'dateKey'], data.sessions);
      if (Array.isArray(data.events)) ins('events', ['id', 'dateKey', 'ts', 'kind', 'title', 'minutes'], data.events);
      if (Array.isArray(data.reviews)) ins('reviews', ['id', 'arcId', 'weekKey', 'wentWell', 'didnt', 'changeTxt', 'focusNext', 'snapshot', 'ts'], data.reviews);
      db.exec('COMMIT');
    } catch (e) { try { db.exec('ROLLBACK'); } catch { /* noop */ } throw e; }
  } catch (e) { return { ok: false, error: 'Import failed safely: ' + String(e) }; }
  emit();
  return { ok: true };
}

export function statsCSV(arcId: string): string {
  const rows = SessionRepo.completed(arcId);
  const head = 'startedAt,endedAt,minutes,subjectId,taskId,mode,plannedMin,status';
  const lines = rows.map((s: any) => [new Date(s.startedAt).toISOString(), s.endedAt ? new Date(s.endedAt).toISOString() : '',
    Math.round((s.endedAt - s.startedAt - s.pausedMs) / 60000), s.subjectId ?? '', s.taskId ?? '', s.mode ?? '', s.plannedMin ?? '', s.status].join(','));
  return [head, ...lines].join('\n');
}
