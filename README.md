# Winter Arc ❄ — quiet momentum

A premium Windows desktop app for personal discipline and transformation.
**Consistency &gt; perfection.** The app never shames — it says *Continue.*

## Screens

- **Today** — hero `Day X / Y` with glowing arc line, identity sentence, Spiritual (Arabic typography, respectful), Reading timer, Study priorities, Physical, Breaking-habits (Maintained / Slip — continue).
- **Study** — subjects, tasks (estimate/deadline/priority/progress), per-subject arc totals.
- **Focus** — immersive timestamp-truth timer (Space pauses, Esc exits), break support, auto timeline logging.
- **Timeline / Progress / Review / Arc / Settings** — chronological proof, consistency-first stats, weekly review, arc lifecycle, themes + RTL + backup.

## Quick start (dev)

```powershell
cd winter-arc
npm install
npm run dev        # web dev (Vite)
npx electron .     # desktop shell (needs npm run build:web first for prod load;
                   # dev loads http://localhost:5173 via electron/main.cjs)
npm test           # 17 domain/timer tests
```

## Build the installer

```powershell
npm run dist
```

Produces `release/WinterArc-Setup-1.0.0.exe` (NSIS installer) + `release/WinterArc-Portable-1.0.0.exe`.
No Node/Docker/server needed by end users. Works fully offline.

## Data

SQLite (embedded via sql.js, proper schema + migrations) persisted to
`%APPDATA%/winter-arc/winter-arc.sqlite` in Electron (localStorage mirror + fallback on web).
Settings → Export JSON / Stats CSV / Import (validated before any write).

## Docs

- `docs/PROJECT_ANALYSIS.md` · `docs/ARCHITECTURE.md` · `docs/DESIGN_SYSTEM.md` · `docs/IMPLEMENTATION_PLAN.md`
- `docs/TESTING.md` · `docs/BUILD.md` · `docs/CHANGELOG.md`

Shortcuts: `Ctrl+K` palette · `N` new task · `F` quick focus · `Space` pause in focus.
