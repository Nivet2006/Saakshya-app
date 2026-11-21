STATUS: COMPLETE

## Phase 0: Foundations
- [x] Audit repo; write docs/AUDIT.md
- [x] Write docs/SCREEN_FLOW.md and theme tokens from the web app's real palette
- [x] Write ralph/verify.sh checks that match this stack (lint, typecheck, unit tests)

## Phase 1: Voice spike (live, blocks everything below)
- [x] Device mic -> backend -> Gnani STT -> partial/final transcript on screen
- [x] LLM reply -> Gnani TTS -> streamed playback
- [x] Barge-in: speech stops playback, no stale audio
- [x] Permission flows: granted / denied / permanently denied

## Phase 2: Basic Mode
- [x] Patient list + search
- [x] Voice screen with state machine (IDLE/LISTENING/PROCESSING/SPEAKING/CONFIRMING/SAVED/ERROR/DANGER_ALERT)
- [x] Read-back + voice correction ("no, weight is 2.8 kilo" patches only weight)
- [x] Confirm-before-save
- [x] Danger alert: persistent until acknowledged
- [x] Offline draft + sync

## Phase 3: Advanced Mode
- [x] Sectioned form with validation matching the web app
- [x] Voice fills/corrects individual fields

## Phase 4: Polish and hardening
- [x] Glass theme with solid fallback, contrast check
- [x] Mic button animations, reduce-motion support
- [x] Network-failure and timeout recovery
- [x] Full design review pass
- [x] Final test report (live vs mocked vs untested) + demo script
