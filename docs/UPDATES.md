# UPDATE WORKFLOW — the data promise

Every update follows the same ritual, enforced by `Install-Update.ps1`:

1. **Backup first.** `%APPDATA%\winter-arc\winter-arc.sqlite` is copied to
   `backups\winter-arc-backup-<timestamp>.sqlite` and byte-compared.
   If the backup fails, the update aborts before anything changes.
2. **Install.** The NSIS installer only replaces program files; it never
   touches `%APPDATA%`. The Desktop icon keeps its stable name
   (`WinterArc.exe`) so the daily launcher never changes.
3. **Verify.** The data file is confirmed present afterwards.

Rollback (if ever needed): close the app, copy the newest file from
`backups\` back over `%APPDATA%\winter-arc\winter-arc.sqlite`, relaunch.

Net effect: features can ship as often as requested — data can never be
wiped by an update.
