# TESTING

## Automated — `npm test` (vitest, 17 tests, all passing)

- `tests/dates.test.ts` — calendar keys, DST-safe diffs, arc day/total math, month-boundary add, week keys.
- `tests/habits.test.ts` — min-threshold eval, rest days, avoidance cycle, partial scoring, consistency incl. recovery-neutral, current/longest streaks.
- `tests/timer.test.ts` — timestamp-truth start/pause/resume, idempotent pause, minimize-frozen correctness, pomodoro phase machine, midnight split attribution, session aggregation.

## Manual matrix (verify before release)

- [ ] Dark / Light / System theme, restart persists
- [ ] Arabic RTL toggle (adhkar line-height, mixed EN/AR rows)
- [ ] Window resize 960×640 → 1920×1080, maximize/restore
- [ ] Offline launch (airplane mode), full flow works
- [ ] Timer: start 25m, minimize 5m, pause/resume, finish → minutes added + timeline row
- [ ] Midnight: 23:30→00:30 session splits across both days in stats
- [ ] Restart mid-session: active row persists, can interrupt cleanly
- [ ] Export JSON → delete data → import → everything back
- [ ] Bad import file → friendly error, zero data changed
