# Phase 5: Mobile Verification, Test Report & Demo Script (`docs/TEST_REPORT.md`)

## 1. Verification Summary (`LIVE` vs `UNIT` vs `DEVICE`)

| Capability | Verification Level | Status | Evidence & Notes |
|---|---|---|---|
| **Backend Health & Credentials (`GET /health`)** | **LIVE** | PASS | Verified against live FastAPI server (`http://localhost:8000` / `http://10.178.123.170:8000`): `stt_model: "prisma-v3.0"`, `tts_model: "timbre-v3.0"`, `llm_model: "gemini-3.1-flash-lite"`, `live_credentials_configured: true`. |
| **Synthetic Beneficiary Directory (`GET /api/v1/beneficiaries`)** | **LIVE** | PASS | Returns `BEN-1042` (`Lakshmi Devi`) through `BEN-1048` + custom added patients (`POST /api/v1/beneficiaries`). |
| **Voice Session Creation (`POST /api/v1/sessions`)** | **LIVE** | PASS | Creates live session (`sess_*`) with `websocket_path: "/ws/voice/sess_*"` and `16000 Hz`, mono, `pcm_s16le` audio contract. |
| **Deterministic Danger-Sign Detection (`POST /api/v1/danger-signs/check`)** | **LIVE** | PASS | Flagged `newborn_chest_indrawing` / `maternal_convulsions` in `< 200ms` (`< 2000ms` acceptance threshold) with NHM guideline citation and referral instruction. |
| **16kHz PCM <-> RIFF/WAVE Audio Framing** | **UNIT** | PASS | Verified lossless round-trip of 16kHz 16-bit mono signed PCM (`pcm_s16le`) base64 chunks into 44-byte RIFF/WAVE containers for `expo-av` native playback and uplink streaming (`tests/mobile-unit.test.ts`). |
| **Selective Voice Correction (`mergeVisitV1IntoDraft`)** | **UNIT** | PASS | Verified that *"no, weight is 2.8 kilo"* updates only `weight_kg` (`3.1` -> `2.8`) and marks `field_statuses.weight_kg = 'corrected'` while preserving `beneficiary_id`, `visit_type`, `vaccinations_completed`, `vaccinations_due`, and `next_visit_date`. |
| **Danger Alert Persistence Across Corrections** | **UNIT** | PASS | Verified that `danger_sign_flagged: true` and attached `DangerAlert` records survive subsequent field corrections and cannot be silently cleared. |
| **Confirm-Before-Save Gate (`syncManager.persistConfirmedVisitNow`)** | **UNIT** | PASS | Unconfirmed drafts (`status === 'draft'`) are rejected from durable persistence; only explicitly confirmed visits transition to `committed`/`synced`. |
| **Secrets & Zero-PII Guard (`ralph/verify.sh`)** | **UNIT / CI** | PASS | Verified zero `.env` files or API keys (`GNANI_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) exist in the mobile repository or bundle. |
| **Physical Device Microphone & Speaker Loop** | **DEVICE** | READY | Run `npx expo start` and scan the QR code on an Android/iOS phone connected to the same Wi-Fi (`http://10.178.123.170:8000` is pre-configured in `.env.example` and adjustable in the app's Connection Settings drawer). |

---

## 2. Live Field Demo Script (Basic Mode & Advanced Mode)

### Demo 1: Basic Mode — Minimal Voice-First Household Visit + Selective Voice Correction
1. **Launch & Role Selection**: Open the app and tap **Sunita Verma (ASHA)** on the Welcome screen.
2. **Start Voice Visit**: Tap the prominent **Start Voice Visit** button (or the floating center microphone tab). Confirm **BASIC MODE** is selected by default.
3. **Patient & Language Selection**: Tap **Lakshmi Devi (`BEN-1042`)** (or **Baby of Kavitha Rao (`BEN-1044`)**) and select **हिन्दी (Hindi)** (`hi-IN`).
4. **Speak Visit Notes**: Tap **Start Recording** and speak naturally (or use **Type to Backend** in a quiet testing room):
   - *"आज मैंने लक्ष्मी देवी के नवजात शिशु की जांच की। बच्चे का वजन 3.1 किलो है। BCG का टीका लग चुका है, OPV-1 बाकी है। अगली विज़िट 5 दिसंबर को है।"*
   - Code-mixed variant: *"TT injection pending hai, IFA goli nahi le rahi, weight 54 kilo hai."*
5. **Read-Back & Selective Voice Correction**:
   - Listen to Gnani Timbre v3.0 read back the extracted summary aloud.
   - Tap **Correct** next to **Weight** (or tap **Speak to make changes**) and say: *"नहीं, वजन 2.8 किलो है"* (*"No, weight is 2.8 kilo"*).
   - Verify that only **Weight** changes to `2.8 kg` (`Corrected`), while Beneficiary, Visit Type, Vaccinations, and Next Visit Date remain preserved.
6. **Confirm & Save**: Tap **✓ ACCEPT & SAVE** to commit the visit.

### Demo 2: Urgent NHM Danger-Sign Escalation & Barge-In
1. During an active voice visit for `BEN-1044` (`Baby of Kavitha Rao`), speak a danger-sign phrase:
   - *"बच्चे को तेज बुखार है और सांस लेने में पसली चल रही है"* (*"Baby has high fever and severe chest indrawing"*).
2. Within 2 seconds:
   - A full-width crimson **URGENT DANGER SIGN** banner pins to the top of the screen with haptic feedback.
   - Gnani Timbre speaks the urgent PHC/SNCU referral instruction aloud.
   - Tap **Interrupt / Speak Now** (or speak over the assistant) to verify immediate barge-in playback stop (`< 50ms`, zero stale audio).
   - Tap **Call 108 / Emergency Referral** to trigger the native phone dialer (`tel:108`), or tap **Acknowledge & Refer to PHC**.

### Demo 3: Advanced Mode — Detailed Multi-Section Clinical View
1. Toggle the top segmented switcher to **ADVANCED MODE** during the visit.
2. Verify zero data loss: the active session, transcript, danger alerts, and extracted fields appear immediately across the 6 structured clinical cards:
   - **1. Beneficiary & Visit Type**
   - **2. Maternal (ANC/PNC) / Newborn Care**
   - **3. Vaccines Due & Completed**
   - **4. Danger Signs (Backend Authoritative)**
   - **5. Pending Follow-ups & Next Visit Date**
   - **6. Spoken Description & Applied Voice Corrections Audit Log**
3. Use per-field **Confirm**, **Correct by Voice**, or inline **Edit** controls, then tap **✓ ACCEPT & SAVE**.

