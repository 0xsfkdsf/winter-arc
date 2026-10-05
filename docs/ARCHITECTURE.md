# ARCHITECTURE — Winter Arc

## Decision: Electron over Tauri (documented)

Tauri was evaluated first (per spec §40). Rejected for this environment: no Rust, no MSVC, no WebView2 SDK guarantee, and Tauri build would block release. Electron gives identical product guarantees (single `.exe` installer, offline, SQLite, native window) with only Node 22 required at build time. UI/domain layers are framework-agnostic to allow a future Tauri port.

## Layers (strict)

```
UI (src/app, src/components, src/features)
  ↓  (hooks + view-models only, no SQL, no date math)
Application (src/application: services, store)
  ↓
Domain (src/domain: pure functions, zero imports from app/infra)
  ↓
Infrastructure (src/infrastructure + src/database: sqlite adapter, repos, migrations, export/import)
```

Rules:
- UI never imports `sql.js`, never computes streaks/consistency.
- Repos expose typed methods (`HabitRepo.complete(...)`); services own transactions.
- Domain is independently unit-tested (vitest), no Electron APIs.

## Modules

- `domain/dates.ts` — calendarKey(d), arcDayNumber, daysTotal, isToday, weekKey, addDays, DST-safe diff.
- `domain/habits.ts` — habit states: `done | partial | missed | rest | open`, min-threshold logic, avoidance model (`maintained | slip | open`).
- `domain/consistency.ts` — consistency %, streaks (current/longest), completion %, recovery-day handling.
- `domain/focus.ts` — elapsed calculator from timestamps: `elapsed = now - startedAt - pausedTotal - breakTotal`; pomodoro phase machine.
- `domain/stats.ts` — today/week/arc aggregates, per-subject totals, timeline builder.
- `application/store.tsx` — single zustand-like context + reducer, selectors, derived-stats cache (memo).
- Timer truth lives in the Focus feature (timestamp clock + 5s persist heartbeat + single-instance guard in main). One owner, no drift sources, no rival writers.
- `database/schema.sql` + `migrations.ts` (v1..vN) + `sqlite.ts` (sql.js wrapper, transactions, backup).
- `database/seed.ts` — default 5 subjects, 5 spiritual, reading, 2 physical, 3 avoidances. Only on first Arc.

## Schema (SQLite, sql.js)

UserSettings, Arcs(id, title, startDate, endDate, identity, status), Dimensions, Habits(id, arcId, dimension, kind[positive|avoidance], title, titleAr, minMinutes, target), HabitCompletions(id, habitId, dateKey, state, minutes, note), Subjects(id, arcId, name, color), StudyTasks(id, subjectId, title, estimateMin, deadline, priority, progress, status), FocusSessions(id, taskId?, subjectId?, startedAt, endedAt, pausedMs, mode, plannedMin, breakMin, status), TimelineEvents(id, dateKey, ts, kind, title, minutes), Reviews(id, arcId, weekKey, wentWell, didnt, change, focusNext, consistencySnapshot), Books(id, title, minutesTotal), AppSettings(theme, reducedMotion, focus presets, autoStart...).

Migrations run in a transaction; version in `_meta`. Export = full dump JSON with schemaVersion; import validates (zod-lite manual) before any write, in one transaction.

## Timer correctness

Source of truth = timestamps, never tick counts. Tick only re-renders. Pause stores `pausedAccum`. Minimize/blur safe (no reliance on interval cadence). Midnight split: session crossing midnight attributes minutes per calendar slice in stats.

## Performance

Derived stats memoized per dateKey+dataVersion; timeline virtualized past 300 rows (simple windowing); DB writes debounced; no expensive calc in render.

## Security/safety

No `nodeIntegration`; preload exposes minimal `window.wa` (db path, save/load). No remote content. Import validation rejects unknown versions. Never deletes without explicit user action + confirm.
