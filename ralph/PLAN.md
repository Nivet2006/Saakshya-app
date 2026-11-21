STATUS: IN_PROGRESS

## Phase 0: Foundations
- [x] Audit repo; write docs/AUDIT.md
- [x] Write docs/SCREEN_FLOW.md and theme tokens from the web app's real palette
- [ ] Write ralph/verify.sh checks that match this stack (lint, typecheck, unit tests)

## Phase 1: Voice spike (live, blocks everything below)
- [ ] Device mic -> backend -> Gnani STT -> partial/final transcript on screen
- [ ] LLM reply -> Gnani TTS -> streamed playback
- [ ] Barge-in: speech stops playback, no stale audio
- [ ] Permission flows: granted / denied / permanently denied

## Phase 2: Basic Mode
- [ ] Patient list + search
- [ ] Voice screen with state machine (IDLE/LISTENING/PROCESSING/SPEAKING/CONFIRMING/SAVED/ERROR/DANGER_ALERT)
- [ ] Read-back + voice correction ("no, weight is 2.8 kilo" patches only weight)
- [ ] Confirm-before-save
- [ ] Danger alert: persistent until acknowledged
- [ ] Offline draft + sync

## Phase 3: Advanced Mode
- [ ] Sectioned form with validation matching the web app
- [ ] Voice fills/corrects individual fields

## Phase 4: Polish and hardening
- [ ] Glass theme with solid fallback, contrast check
- [ ] Mic button animations, reduce-motion support
- [ ] Network-failure and timeout recovery
- [ ] Full design review pass
- [ ] Final test report (live vs mocked vs untested) + demo script
