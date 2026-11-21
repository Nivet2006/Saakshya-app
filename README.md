# Sakshya ASHA — Mobile Application (React Native + Expo)

Voice-first maternal, newborn, and immunisation field register for ASHA workers and PHC supervisors, converted from the Sakshya Web application with an Apple-inspired Liquid Glass mobile UI/UX and connected to the live Agent 1 FastAPI Voice Backend (**Gnani Prisma v3.0 STT**, **Gnani Timbre v3.0 TTS**, **Gemini Extraction**, and **Deterministic NHM Danger-Sign Screening**).

## Key Features
- **Two Distinct Experience Modes (Sharing the Same Live Session & Draft)**:
  - **BASIC MODE (Default, Voice-First)**: Streamlined patient selection, language pills (`hi-IN`, `kn-IN`, `ta-IN`, `te-IN`, `ml-IN`, `bn-IN`, `mr-IN`, `gu-IN`, `pa-IN`, `en-IN`, `indic-auto`), prominent animated microphone orb with 6 distinct states (`idle`, `listening`, `processing`, `speaking`, `completed`, `error`), 16-band real-time waveform, live streaming transcription, spoken read-back, selective voice correction, and explicit confirm-before-save.
  - **ADVANCED MODE (Detailed Clinical Form + Voice)**: Expandable mobile clinical sections (Beneficiary & Visit Type, Maternal ANC/PNC or Newborn Care, Immunisation Completed/Due Ledger, Read-only Backend Danger Signs, Follow-up Actions, and Spoken Read-Back & Correction Audit Trail) with per-field confirmation (`Confirm`, `Correct by Voice`, `Needs Clarification`) and inline visual editing.
- **Urgent NHM Danger-Sign Alerts**: Full-width high-contrast alert banner with haptic feedback, NHM guideline citation, spoken referral instruction, and one-tap `108` ambulance dialer.
- **Offline Drafts & Auto-Sync**: Persists drafts and offline-confirmed visits locally in `AsyncStorage` with `visit_id` idempotency keys and syncs automatically when connectivity returns.
- **Zero Bundled Secrets**: All Gnani, Gemini, and Supabase Service Role keys remain strictly on the FastAPI backend. The mobile app connects via `EXPO_PUBLIC_VOICE_API_BASE_URL` or the in-app **Voice Backend URL** configuration drawer.

## Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Run verification gates (secrets guard, TypeScript, ESLint, Jest unit + live backend tests)
./ralph/verify.sh

# 3. Start Expo development server for iOS / Android
npx expo start
```

## Architecture & Documentation
- [docs/AUDIT.md](file:///Users/shriii/Documents/GitHub/sakshya-app/docs/AUDIT.md) — Complete audit of the reference web application, backend API/WebSocket contracts, and extracted colour tokens.
- [docs/SCREEN_FLOW.md](file:///Users/shriii/Documents/GitHub/sakshya-app/docs/SCREEN_FLOW.md) — Mobile screen-to-screen navigation map, voice state machine, and error/offline recovery flows.
- [docs/TEST_REPORT.md](file:///Users/shriii/Documents/GitHub/sakshya-app/docs/TEST_REPORT.md) — Verification matrix (`LIVE` vs `UNIT` vs `DEVICE`) and step-by-step field demo script.
- [ralph/](file:///Users/shriii/Documents/GitHub/sakshya-app/ralph/) — Autonomous build & verification loop (`loop.sh`, `verify.sh`, `PLAN.md`, `PROMPT.md`, `DESIGN_REVIEW.md`, `LEARNINGS.md`, `specs/ACCEPTANCE.md`).

