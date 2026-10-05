# WINTER ARC — Project Analysis

## 1. Environment reality (2026-10-01, Windows, Node 22.14, no Rust/VS toolchain)

- `rustc` / `cargo` absent, no Visual Studio, no `vswhere`. Installing Rust + MSVC Build Tools + WebView2 SDK would be multi-GB and slow.
- npm registry reachable (`npm ping` PONG, electron 44.5.1 available).
- Decision: **Electron + Vite + React + TypeScript + SQLite (sql.js/wasm)** instead of Tauri.
  - Still a REAL Windows desktop app: `WinterArc-Setup.exe` (NSIS) + portable `.exe` via `electron-builder`.
  - No Node/Docker/server required for end users. Offline-first.
  - No native Node modules (avoids node-gyp/VS dependency): SQLite via `sql.js` (SQLite compiled to WASM) persisted to `app.getPath('userData)/winter-arc.db` (actually exported binary). Proper schema + migrations, not a giant JSON blob.
  - Fallback rationale documented in ARCHITECTURE.md. If Rust becomes available later, UI + domain layers are portable to Tauri with only `infrastructure/database` adapter swap.

## 2. Product essence

Winter Arc = finite discipline season. Start → daily execution → progress → reflection → recovery → adaptation → completion.
Core philosophy: **CONSISTENCY > PERFECTION**. Never shame. "Continue." is the primary verb.

Personas: third-secondary-school student balancing deen, reading, 5 study subjects, physical health, and breaking 3 dopamine habits (movies/series, music, social media).

## 3. Scope (must-have for v1)

- Arc lifecycle: onboarding wizard (condensed 6 chapters), active Arc, completion screen, new Arc.
- Today: hero (Day X/Y + arc ring + identity line), Spiritual (5), Mental (reading timer), Study (5 subjects snapshot), Physical (workout + miswak), Break (3 avoidance trackers with Maintained/Slip, no shame).
- Study workspace: subjects CRUD, tasks (estimate/deadline/priority), per-task progress, start focus.
- Focus engine: timestamp-based (startedAt/pausedAccum), 25/5, 50/10, 45/60/90/120 presets + custom, pure focus or pomodoro, auto-start options, survives minimize/blur/rerender/restart (persist active session).
- Timeline: chronological "what I actually did" from focus sessions + habit completions + reviews.
- Progress: Day X/Y, consistency %, streaks (current/longest), focus totals, 5 dimension rings/bars.
- Review: weekly review (consistency, focus, sessions, 4 reflection Qs, next-week intent).
- Recovery: missed-day banner with Continue / Recovery Day / Adjust — never "FAILED".
- Shell: sidebar (Today, Arc, Study, Timeline, Progress, Review + Settings/Profile bottom), Ctrl+K palette, global search, Space to pause in focus, N for new task, themes (system/light/dark), RTL Arabic, reduced-motion respect.
- Data: SQLite schema + migrations + transactions + export/import JSON (+CSV stats), backup.

## 4. Non-goals v1

No cloud sync, no accounts, no social, no XP/coins/leaderboards, no sound by default, no auto-updater (manual installer), no mobile build.

## 5. Quality bars

- Startup < 1.5s cold, navigation instant (<100ms), 60fps animations, idle CPU ~0.
- Timer accuracy ±1s over 2h, verified by timestamp tests including pause/resume/midnight/restart.
- Date correctness: calendar-date key (`yyyy-mm-dd` local) separate from timestamps; DST-safe day math via local-midnight diff.
- Accessibility: keyboard nav, visible focus, contrast AA, Arabic RTL, tooltips/labels.
- Empty/loading/error states designed, not blank screens.

## 6. Risks

- sql.js persistence: must flush on interval + on beforeunload + after each mutation (debounced). Mitigated + tested.
- Electron binary download size (~90MB) — acceptable for premium desktop feel.
- Scope creep (70 requirements) — mitigated by vertical slices (§64 order) and self-critique gate.
