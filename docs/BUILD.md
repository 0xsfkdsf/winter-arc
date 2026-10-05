# BUILD — Windows release

Prereqs (build machine only): Node 20+ (22 tested), npm registry access.
End users need nothing but the `.exe`.

```powershell
cd winter-arc
npm install
npm test
npm run dist
```

`electron-builder --win nsis portable` produces:

- `release/WinterArc-Setup-1.0.0.exe` — NSIS installer (per-user, start-menu shortcut)
- `release/WinterArc-Portable-1.0.0.exe` — portable, no install

First run downloads Electron (~100MB) + NSIS tooling automatically.
If signing is unavailable the binaries are unsigned (SmartScreen may prompt — expected).

## User data & troubleshooting

- DB: `%APPDATA%\winter-arc\winter-arc.sqlite` (auto-created, atomic tmp+rename writes).
- Web fallback: `localStorage` key `winter-arc.sqlite.b64`.
- Backup: Settings → Export JSON (validated import; bad files change nothing).
- Won't start: delete `%APPDATA%\winter-arc` (after backing up) and relaunch.
- Timer drift: impossible by design — truth is `Date.now()` timestamps, ticks only re-render.
