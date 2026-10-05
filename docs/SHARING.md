# SHARING Winter Arc with a friend

## The one-link setup (recommended, ~5 minutes, free)

1. Create a free account at github.com, then create a repository named `winter-arc` (private is fine).
2. In this folder run: `git remote add origin https://github.com/YOURNAME/winter-arc.git`
   then `git push -u origin main`.
3. On GitHub open **Releases → Draft a new release**, tag it `v1.0.9`,
   and **drag `release/WinterArc-Portable-1.0.9.exe` into the assets box**. Publish.
4. Send your friend this permanent link (always serves the newest version):
   `https://github.com/YOURNAME/winter-arc/releases/latest/download/WinterArc-Portable-1.0.9.exe`
   (Replace `1.0.9` with the current version number each release.)

Friend's experience: click link → download → double-click → app runs.
No install, no Node, no internet needed afterwards. His data stays on his PC.

## Updates

Each new version: build, drag the new portable `.exe` into a new GitHub
release, done. The `latest` link keeps working — or send the new version link directly.

## Two things to tell your friend first

- **SmartScreen**: the app is unsigned, so Windows shows "Unknown publisher".
  Click **More info → Run anyway**. One time only.
- **His data is his own**: separate computer, separate `%APPDATA%\winter-arc` — nothing syncs or mixes.

## No-internet alternative

Same portable file works over USB stick, Nearby Share, or any messenger
that accepts ~90 MB files. The app itself never needs the network.
