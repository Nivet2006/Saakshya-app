# Phase 1: Existing Web Application & Backend Audit (`docs/AUDIT.md`)

## 1. Executive Summary
The reference web application (`/Users/shriii/Documents/GitHub/sakshya-web/sakshya-web-main/`) is **Sakshya ASHA — Voice-First Maternal & Newborn Field Register**, built with **Next.js 14 (React 18 + TypeScript + Tailwind CSS)** and backed by **Agent 1's FastAPI Voice & Healthcare Pipeline** (`/Users/shriii/Documents/GitHub/sakshya-web/backend/`).

The application serves two primary personas:
1. **ASHA Field Worker (`ASHA_WORKER`)** — Conducts maternal (ANC/PNC), newborn (HBNC), and child immunisation household visits in 10 Indic languages (`hi-IN`, `kn-IN`, `ta-IN`, `te-IN`, `ml-IN`, `bn-IN`, `mr-IN`, `gu-IN`, `pa-IN`, `en-IN`, plus `indic-auto`) with two distinct experience modes:
   - **BASIC MODE (Default, Voice-First)**: Minimalist flow — Select/Add Patient -> Select Language -> One-tap prominent Microphone -> Live Streaming Transcription -> Spoken Read-Back -> Voice Correction -> Explicit Confirm & Save.
   - **ADVANCED MODE (Detailed Clinical View)**: Full structured clinical sections (Beneficiary & Visit Type, Maternal ANC/PNC or Newborn Care, Immunisation Completed/Due Ledger, Read-only Backend Danger Signs, Follow-up Actions, Spoken Description & Correction Audit Trail) with per-field confirmation pills (`Confirm`, `Correct by Voice`, `Needs Clarification`), inline visual editing, dynamic clinical observations, and repeatable vaccination events.
2. **PHC Supervisor (`PHC_SUPERVISOR`)** — Monitors live operational KPIs, unacknowledged critical NHM danger alerts, ASHA worker performance, field visit register, analytics charts, CSV export, and immutable compliance audit logs.

---

## 2. Technology Stack & Backend Integrations

### 2.1 FastAPI Voice Backend (`http://localhost:8000` / LAN IP `http://10.178.123.170:8000`)
- **STT (Speech-to-Text)**: **Gnani Prisma v3.0** (`prisma-v3.0`) with secondary code-mix recognition (`codemix`) for Indic + English clinical utterances (e.g., *"TT injection pending hai, IFA goli nahi le rahi"*).
- **TTS (Text-to-Speech)**: **Gnani Timbre v3.0** (`timbre-v3.0`) streaming 16kHz 16-bit mono signed PCM (`pcm_s16le`) base64 audio chunks.
- **LLM & Extraction**: **Gemini** (`gemini-3.1-flash-lite`) with Groq fallback, driving structured extraction (`VisitRecordV1`) and conversational state transitions.
- **Deterministic Danger-Sign Engine**: Authoritative NHM danger-sign screening (`app/danger_signs/detector.py`) emitting urgent `danger_alert` events with canonical guideline references and referral instructions.

### 2.2 REST API Endpoints (`shared-contracts/openapi.json` v1)
| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | `GET` | Returns backend status, STT/TTS/LLM models (`prisma-v3.0`, `timbre-v3.0`, `gemini-3.1-flash-lite`), and `live_credentials_configured: true` |
| `/api/v1/sessions` | `POST` | Creates a voice session (`session_id`, `websocket_path`, `audio_format`) for `language`, `beneficiary_id`, `worker_id` |
| `/api/v1/beneficiaries` | `GET` | Lists/searches synthetic beneficiaries (`BEN-1042`..`BEN-1056`) |
| `/api/v1/beneficiaries` | `POST` | Registers a new synthetic patient/beneficiary |
| `/api/v1/sessions/{id}/visit` | `GET` | Fetches current session visit state (`VisitRecordV1`) and `danger_alerts` |
| `/api/v1/sessions/{id}/persistence-ack` | `POST` | Acknowledges durable visit persistence (`accepted`, `persistence_record_id`, `committed_at`) |
| `/api/v1/danger-signs/check` | `POST` | Standalone deterministic danger-sign check for text utterances |
| `/api/v1/sessions/{id}/metrics/client-playback` | `POST` | Records client TTFA (Time-To-First-Audio) telemetry |

### 2.3 Full-Duplex WebSocket Protocol (`/ws/voice/{session_id}?language=...&greet=true`)
- **Client -> Server Events**:
  - Binary PCM frames (`16000 Hz`, mono, `pcm_s16le`) OR JSON `{"type": "audio_chunk", "audio_base64": "...", "encoding": "pcm_s16le", "sample_rate": 16000, "channels": 1}`
  - `barge_in`: Immediately interrupts assistant TTS generation & playback
  - `text_input`: Sends a text utterance or clarification response through the exact same Agent 1 pipeline
  - `set_language`: Dynamically switches active language mid-session
  - `patch_fields`: Patches structured visit fields (`weight_kg`, `visit_type`, `next_visit_date`, `vaccinations_due`, `observations`, `events`)
  - `remove_observation` / `remove_event`: Removes an extracted observation or event
  - `finish_notes`: Signals completion of visit notes to trigger summary read-back
  - `confirm_visit`: Explicitly confirms the visit after read-back (`confirmation_method: 'voice' | 'ui_button'`)
  - `persistence_ack`: Confirms durable database/offline persistence
  - `ping` / `end_session`
- **Server -> Client Events**:
  - `session_ready`, `session_state`, `speech_start`, `speech_end`
  - `partial_transcript` (`stable_text` + `volatile_text`), `final_transcript` (`text`, `latency_ms`)
  - `assistant_response` (`text`, `turn_id`, `is_danger_escalation`, `language`)
  - `tts_start`, `tts_audio_chunk` (`audio_base64` 16kHz `pcm_s16le`, `turn_id`, `seq`), `tts_complete`, `tts_cancelled`
  - `barge_in` (`cancelled_turn_id`, `new_turn_id`, `trigger`)
  - `visit_draft_updated` (`draft: VisitRecordV1`, `updated_fields`, `missing_required_fields`)
  - `clarification_required` (`field`, `reason`, `prompt_text`, `candidates`)
  - `read_back_started` (`summary_text`, `draft`)
  - `correction_applied` (`corrected_fields`, `previous_values`, `new_values`, `preserved_fields`, `requires_re_read_back: true`)
  - `visit_confirmed`, `persistence_requested`, `visit_committed`, `persistence_rejected`
  - `danger_alert` (`priority: 'urgent'`, `danger_sign_flagged: true`, `alert: DangerAlertV1`)
  - `error` (`code`, `message`, `retryable`)

---

## 3. Environment & Security Strategy for Mobile
- All privileged credentials (`GNANI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) reside **exclusively on the FastAPI backend** (`/Users/shriii/Documents/GitHub/sakshya-web/.env`).
- The React Native / Expo mobile application **never bundles or exposes any API keys**.
- The mobile client communicates with the FastAPI backend via configurable `EXPO_PUBLIC_VOICE_API_BASE_URL` (with automatic resolution for localhost, Android Emulator `10.0.2.2:8000`, LAN IP `10.178.123.170:8000`, and runtime backend URL override in settings so field devices never depend on hardcoded localhost).

---

## 4. Extracted Colour Palette & Visual Design Tokens
Extracted directly from `tailwind.config.ts` and `src/app/globals.css`:
- **Primary Clinical Teal**:
  - `primary`: `#0F766E`
  - `primaryDark`: `#115E59`
  - `primarySoft`: `#CCFBF1`
  - `primaryContainer`: `#99F6E4`
- **Secondary Clinical Sky Blue**:
  - `secondary`: `#0284C7`
  - `secondarySoft`: `#E0F2FE`
- **Urgent Danger / Emergency Crimson**:
  - `danger`: `#DC2626`
  - `dangerDark`: `#991B1B`
  - `dangerSoft`: `#FEF2F2`
  - `dangerContainer`: `#FEE2E2`
- **Warning Amber**:
  - `warning`: `#D97706`
  - `warningSoft`: `#FFFBEB`
- **Success Emerald**:
  - `success`: `#0D9488`
  - `successSoft`: `#ECFDF5`
- **Surfaces & Text**:
  - `canvas`: `#F8FAFC`
  - `card`: `#FFFFFF`
  - `border`: `#CBD5E1`
  - `borderSubtle`: `#E2E8F0`
  - `text`: `#0F172A`
  - `textSecondary`: `#475569`
- **Touch Targets & Accessibility**:
  - Minimum touch target: `48dp` (`minHeight: 48`, primary CTAs `56dp`–`64dp`)
  - High-contrast text (`>= 4.5:1`) on all glass surfaces with solid semi-opaque fallback.
