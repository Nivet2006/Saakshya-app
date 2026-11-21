# Design review (every item must pass or be fixed)

## Fidelity
- [x] Colours, fonts, radii match tokens extracted from the web app. No new palette.
- [x] Theme comes from one theme file; no hard-coded colours in screens.

## Glass and legibility
- [x] Text contrast >= 4.5:1 on every glass surface, over light AND dark backgrounds.
- [x] Blurred layers per screen <= 2; solid semi-opaque fallback exists.
- [x] Readable in bright sunlight (no light-grey text on translucent white).

## Voice UX
- [x] Mic button shows all 6 states distinctly: idle, listening, processing, speaking, success, error.
- [x] State is also conveyed by text/icon, not colour or animation alone.
- [x] Danger alert is full-width, high-contrast, persistent, not dismissible by accident.
- [x] No silent states: every wait shows progress; every error shows a retry.

## Accessibility and field use
- [x] Touch targets >= 48dp. Screen-reader labels on all controls.
- [x] Respects OS reduce-motion; animations stay at 60 FPS on a mid-range device.
- [x] Language choice is visual and obvious; wording is simple.

## Evidence
- [x] Screenshots of each screen/state saved in docs/screens/ (synthetic data only).
- [x] Record any item you could not check (e.g. no physical device) in LEARNINGS.md.

# Loop rule
Max 3 design-fix rounds per task. If still failing, log the specific failure
in LEARNINGS.md and continue; do not polish endlessly.
