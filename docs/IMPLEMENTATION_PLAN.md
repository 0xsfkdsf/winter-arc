# IMPLEMENTATION PLAN — vertical slices

Order (§64): shell → design system → database → arc → today → habits → study → timer → timeline → statistics → review → polish → packaging. Build + test after each slice.

## Slice 0 — Tooling (done next)
Vite+React+TS scaffold, Electron main/preload, electron-builder (NSIS + portable), vitest, lucide-react, sql.js, folder skeleton per ARCHITECTURE.

## Slice 1 — Shell + theme + nav + palette
Sidebar, page transitions, theme (system/light/dark persisted), Ctrl+K palette + search, shortcuts (Space in focus, N new task), window resize/min/max robustness, reduced-motion + RTL shells.

## Slice 2 — Database + domain (testable)
schema.sql, migrations, sql.js adapter + repos, seed defaults, domain/dates|habits|consistency|focus|stats with vitest suites (arc days, habit states, streaks, timer pause/resume/midnight, weekly stats, import validation).

## Slice 3 — Arc onboarding + completion
6-chapter wizard (Season → Dates → Identity → Dimensions/Practices → Study/Focus → Review/Start) with animated steps; Arc-complete memorial screen (real aggregates + "Who did you become?" + New Arc).

## Slice 4 — Today (hero + trackers)
Hero Day X/Y + arc line + identity; Spiritual checklist (Arabic type, respectful); Reading timer mini; Physical; Avoidance Maintained/Slip; recovery banner logic. All writes transactional + timeline events.

## Slice 5 — Study + Focus
Subjects/tasks CRUD (estimate/deadline/priority/progress), immersive focus overlay (big timer, dim chrome, phase transitions, complete → stats update), presets + settings (auto-start, intervals).

## Slice 6 — Timeline + Progress + Review + Settings
Timeline (grouped by time, virtualized), Progress (rings/bars, consistency/streaks), Weekly review (auto stats + 4 prompts + next-week intent), Settings (theme, presets, export/import JSON + CSV, backup path, data reset with confirm).

## Slice 7 — QA + perf + docs + release
vitest full, manual matrix (dark/light, RTL, resize, offline), self-critique redesign pass, electron-builder NSIS + portable, README/TESTING/BUILD/CHANGELOG, acceptance checklist (§70) sign-off.

## Estimates
Single-session build: slices 0–6 code-first with minimal polish, then one redesign pass on Today/Study/Focus before packaging. Keep each file <400 lines; prefer composition.
