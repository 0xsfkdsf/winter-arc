# DESIGN SYSTEM — Winter Arc ("Quiet Momentum")

One coherent system. Not a dashboard of cards. Not a template.

## Concept

Cold evening, clean desk, focused study. Depth + soft light, not snowflakes. Discipline without pressure.

## Color (semantic, dual-theme)

Dark (default, designed first):
- `--bg-0:#070B14` (window), `--bg-1:#0B1220` (atmosphere gradient to #0E1628), `--surface:#111A2Dcc`, `--surface-2:#18233B`, `--surface-3:#1E2C48`
- `--border:rgba(148,163,184,.14)`, `--border-soft:rgba(148,163,184,.08)`
- `--text-1:#E9EFF9`, `--text-2:#9DADC9`, `--text-3:#64748F`
- `--frost:#93B4FD` (primary), `--frost-glow:rgba(147,180,253,.28)`, `--aurora:#5EEAD4` (secondary/mint), `--ember:#F0C48A` (warm focus accent, sparing)
- `--success:#6EE7B7`, `--warn:#FCD34D` (muted to #B98A1F text on dark), `--danger:#F38BA8` (rose, never shame-red `#FF0000`), `--avoid:#8B9BB8`
- Ambient: radial aurora gradient top-left (indigo 12%), frost glow behind hero ring, film grain 3%.

Light:
- `--bg-0:#EEF2F9`, `--bg-1:#F7F9FD`, `--surface:#FFFFFF`, `--surface-2:#F1F5FB`, `--border:#E2E8F2`, `--text-1:#0E172A`, `--text-2:#475569`, `--text-3:#8A99B3`, `--frost:#2F54EB` (deep ice blue), `--aurora:#0E9F8A`.

Both AA contrast for body text. Religious content never uses XP colors; uses `--text-2` + calm mint tick.

## Typography

- Latin display: `Inter` tight (-0.03em), 600/700. Hero day number 64px tabular.
- Arabic: `Readex Pro / IBM Plex Sans Arabic` fallback, line-height 2 for dhikr.
- Timer: `JetBrains Mono`-ish tabular, 88px in focus mode, letter-spacing -0.02em.
- Scale: display 40/32, h1 24, h2 17, body 14, caption 12.5, micro 11.5. Numbers always `tabular-nums`.

## Shape/elevation

Radius 14 (panels), 10 (controls), 999 (pills). Borders 1px + inner highlight `inset 0 1px 0 rgba(255,255,255,.05)`. Shadows: `0 8px 30px rgba(2,6,17,.35)` for floating; sidebar none (flat, hairline divider).

## Layout

Sidebar 248px → 76px collapsed (icons + tooltips). Main max-width 1080px, padding 32. Right contextual panel 300px only on Study/Review. Hero: open layout — giant `Day 23 / 92`, thin 2px arc line with glowing node, identity sentence in serif-italic-ish (Georgia fallback) for humanity. Sections separated by hairlines + generous whitespace, not boxed cards. Only grouping containers: task rows (hover-reveal actions), stats strips.

## Iconography

Single family: Lucide. 18px stroke 1.75. Static except: check morph (120ms), play→pause crossfade, ring draw.

## Motion language

- `micro 120ms, normal 220ms, emphasis 420ms`; easing `cubic-bezier(.22,1,.36,1)`.
- Page: fade 140ms + translateY(6px). Modal: scale .97→1 + fade. Ring: stroke-dashoffset animated 600ms. Task done: row fades, check draws, progress bar eases.
- Milestone: soft pulse + light sweep (once). No confetti except Arc-complete (restrained particle drift, respects reduced-motion).
- `prefers-reduced-motion`: all durations → 0.01ms.

## Sound language

One cold-bell earcon family (sine + octave shimmer, exponential decay): toggle,
complete, full-day milestone, session finish, welcome. Quiet by design, learned
in context, consistent everywhere — and never a sound for slips or mistakes.
Toggle + soundscape volume in Settings; generative soundscapes live in Focus.

## States

Hover: `surface-2` + border brighten. Pressed: scale .99. Focus-visible: 2px frost outline offset 2. Disabled: 45% opacity. Skeletons: shimmer on surface-2. Errors: calm panel + Retry (never raw stack). Empty: centered illustration-less — generous type + single CTA ("No plans yet. Create task."). Missed day: warm neutral banner "Yesterday wasn't perfect. Today is still available. [Continue] [Recovery Day]".
