# CHANGELOG

## 1.0.9 — 2026-10-03

- Timer never loses work: exiting (or Esc) with a minute or more now logs the time as a partial session instead of dropping it; under a minute it says so honestly.
- Tasks are credited by the timer: finishing focus on a task adds real progress (elapsed vs estimate) and auto-completes at 100%, with a clear Done mark.
- The finish chime always plays — no setting can silence completing real work.
- Timer presence redesign: 60-tick dial, glowing tabular numerals, elapsed-of-goal readout, live FOCUSING/PAUSED/COMPLETE/BREAK state pill.

## 1.0.8 — 2026-10-03

- Removed the launch veil entirely: the app now opens straight into your day, zero waiting. Welcome-back moment kept (only after 4h away, functional not decorative).
- Performance trim: lighter atmosphere canvas (fewer motes, capped pixel ratio, pauses when hidden), DB flush on hide instead of tight loops. Fresh-start wipe path verified.

## 1.0.7 — 2026-10-03

- Today rebuilt as a command deck: compact hero with Day Score dial, then six live cards (Spiritual, Reading, Study Focus, Physical, Quiet Resistance, Prayer Rhythm) — each with its own progress ring + animated bar, staggered entrance, hover lift, per-dimension accent glow. Everything tappable without scrolling; prayer pill folded into its card with a live next-prayer indicator.

## 1.0.6 — 2026-10-02

- Fixed (found by TestSprite cloud testing): the task delete confirm disarmed itself after 2.8s, so slower users could never complete the two taps. The confirm now stays armed until the pointer leaves the card. Full TestSprite suite: 4/4 passing (31/31 steps on the rerun).

## 1.0.5 — 2026-10-02

- Fixed: interface tones shared the soundscape audio path and could stay silent unless a track was playing. They now live on a fully independent channel (own context, own gain, own volume) — they play with Silence selected. Added a Preview button + cue volume slider in Settings, and the channel warms on first touch.

## 1.0.4 — 2026-10-02

- Arrival experience: 1.4s skippable launch veil (Day X/Y + chapter + identity) and a welcome-back moment after 4h away ("Day X is still available. Continue.") — recall support, never a lecture. Last-active heartbeat every 60s.
- Signature sounds: five soft cold-bell earcons (toggle, complete, full-day milestone, session finish, welcome) — quiet, consistent family, never a sound for slips. Toggle in Settings.
- Audit fixes: single-instance guard (no rival DB writers), Settings Reset now truly wipes the file too, DB flush when the window hides, onboarding focus preset stored consistently, zero-minute sessions no longer log phantom minutes, removed dead timer module.

## 1.0.3 — 2026-10-01

- Atmosphere pass: living winter-night canvas (aurora drift + rising motes, ~0 idle CPU, static when reduced-motion is on, toggleable Alive/Still in Settings), gradient hero numerals, focus spotlight behind the ring, arc chapters (THE IGNITION / THE DEEP / THE ASCENT / THE RETURN) in the Today kicker.
- Soundscapes: five generative focus tracks built in (Winter Rain, Night Wind, Deep Drone, Brown Noise, Still Air) — 100% procedural Web Audio, no downloads, fully offline, quiet by default — with volume control in the Focus panel. brain.fm itself can't be bundled (proprietary streaming), this is its offline spirit.

## 1.0.2 — 2026-10-01

- Study: tasks can now be edited (title, subject, estimate, deadline, priority) and deleted (two-tap confirm, no clutter); subjects can be deleted (tasks go with them in one transaction, past focus time stays in totals). Actions appear on hover only.
- Focus mode relayout: timer ring + task on the left with Continue/Pause + Exit, Overview (today/total sessions + focus) and date-grouped Focus Record on the right.
- Prayer constants: configurable prayer times (Settings, offline, defaults included); Timeline draws ember anchor lines with Arabic names and per-window countdowns ("window · 2h 10m until Asr"); Today shows a live "inside X window · Next: Y in …" pill. Next prayer glows, past ones dim.

## 1.0.1 — 2026-10-01

- Break section: added **Pornography** as a fourth quiet-resistance tracker (same Maintained / Slip — continue model, no shame). New arcs seed it automatically; existing arcs get it backfilled once without touching anything the user deleted.

## 1.0.0 — 2026-10-01

First public-quality release.

- App shell (collapsible sidebar, page transitions, Ctrl+K palette, global search, shortcuts)
- Design system "Quiet Momentum" (dark-first + light, Inter/arabic/mono type, 130/220/420ms motion, reduced-motion + RTL)
- SQLite embedded DB (sql.js) with schema, migrations, seed, transactions, atomic file persistence
- Arc lifecycle: 6-chapter onboarding, active arc, completion memorial, new arc
- Today: hero Day X/Y + arc line, spiritual/reading/study/physical/breaking trackers, recovery banner
- Study workspace: subjects, tasks, progress, per-subject totals
- Focus mode: timestamp-truth timer, presets 25–120, breaks, Space/Esc, restart-safe, timeline logging
- Timeline (day navigation), Progress (consistency/streaks/dimensions), Weekly review, Settings (theme/RTL/focus/export/import/CSV/reset)
- 17 automated tests (dates, habits, consistency, timer, midnight) — all passing
- Windows NSIS installer + portable EXE via electron-builder
