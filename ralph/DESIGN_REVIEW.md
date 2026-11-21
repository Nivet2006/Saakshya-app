# Design review (every item must pass or be fixed)

## Fidelity
- [ ] Colours, fonts, radii match tokens extracted from the web app. No new palette.
- [ ] Theme comes from one theme file; no hard-coded colours in screens.

## Glass and legibility
- [ ] Text contrast >= 4.5:1 on every glass surface, over light AND dark backgrounds.
- [ ] Blurred layers per screen <= 2; solid semi-opaque fallback exists.
- [ ] Readable in bright sunlight (no light-grey text on translucent white).

## Voice UX
- [ ] Mic button shows all 6 states distinctly: idle, listening, processing, speaking, success, error.
- [ ] State is also conveyed by text/icon, not colour or animation alone.
- [ ] Danger alert is full-width, high-contrast, persistent, not dismissible by accident.
- [ ] No silent states: every wait shows progress; every error shows a retry.

## Accessibility and field use
- [ ] Touch targets >= 48dp. Screen-reader labels on all controls.
- [ ] Respects OS reduce-motion; animations stay at 60 FPS on a mid-range device.
- [ ] Language choice is visual and obvious; wording is simple.

## Evidence
- [ ] Screenshots of each screen/state saved in docs/screens/ (synthetic data only).
- [ ] Record any item you could not check (e.g. no physical device) in LEARNINGS.md.

# Loop rule
Max 3 design-fix rounds per task. If still failing, log the specific failure
in LEARNINGS.md and continue; do not polish endlessly.
