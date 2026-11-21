# Sakshya ASHA — Mobile Application (React Native + Expo + Android)

Voice-first maternal, newborn, and immunisation field register for ASHA workers and PHC supervisors. Built with **React Native (0.74.5) + Expo (51)**, an Apple-inspired **Liquid Glass** clinical UI, **Firebase Firestore** persistence, **Android Room (`MIGRATION_1_2`)** local schema, and a native **16kHz `pcm_s16le` Android AudioRecord** pipeline connected to the production FastAPI Voice Backend (**Gnani Prisma v3.0 STT**, **Gnani Timbre v3.0 TTS**, **Gemini Extraction**, and **Deterministic NHM Danger-Sign Screening**).

---

## Key Features

### 1. Voice-First Household Visits (Basic & Advanced Modes)
- **BASIC MODE (Default, Voice-First)**: Streamlined patient selection, 11 Indic language options (`hi-IN`, `kn-IN`, `ta-IN`, `te-IN`, `ml-IN`, `bn-IN`, `mr-IN`, `gu-IN`, `pa-IN`, `en-IN`, `indic-auto`), prominent Push-to-Talk microphone orb, 16-band real-time audio waveform, live streaming transcription, spoken read-back, selective voice correction, and explicit confirm-before-save.
- **ADVANCED MODE (Detailed Clinical Form + Voice)**: Expandable clinical sections (Beneficiary & Visit Type, Maternal ANC/PNC or Newborn Care, Immunisation Completed/Due Ledger, Read-only Backend Danger Signs, Follow-up Actions, and Spoken Read-Back & Correction Audit Trail) with per-field confirmation (`Confirm`, `Correct by Voice`, `Needs Clarification`) and inline visual editing.
- Both modes share the exact same live voice session and `VisitDraft` state without losing data on mode switch.

### 2. Push-to-Talk & Native 16kHz PCM Audio Pipeline
- **Native Android 16kHz PCM Capture ([`PcmAudioRecorderModule.kt`](file:///Users/shriii/Documents/GitHub/sakshya-app/android/app/src/main/java/org/nhm/sakshya/asha/PcmAudioRecorderModule.kt))**: Uses Android's `AudioRecord` (`16000 Hz`, mono, `ENCODING_PCM_16BIT`) with hardware `AcousticEchoCanceler` and `NoiseSuppressor` and live `PcmAudioLevel` waveform metering, avoiding compressed MediaRecorder formats.
- **Push-to-Talk by Default**: Press and hold the mic orb (`onPressIn`) to record continuously until you release your finger (`onPressOut`). Upon release, the app streams all captured `pcm_s16le` frames plus trailing silence to Gnani Prisma STT + Gemini to transcribe, translate, and auto-fill categorised visit fields.
- **Resume or Finish & Categorise**: Between holds, hold the mic orb again (**Hold to Speak / Resume**) to append more details to the same visit, or tap **Finish & Categorise** to finalize the session and review the structured draft. (A **Hands-Free** toggle is also available.)
- **Resilient WebSocket Handling**: 12s heartbeat pings, 15s handshake timeout, and automatic reconnect (up to 2 attempts) on transient mobile network drops.

### 3. Voice-Enabled Patient Registration ([`AddPatientModal.tsx`](file:///Users/shriii/Documents/GitHub/sakshya-app/src/components/asha/AddPatientModal.tsx))
- **Per-Field Voice Input**: Every text input (`Full Name`, `Age`, `Village / Ward`, `Household Head`, `Phone`, `EDD`) includes an inline mic button for single-field voice dictation and normalization.
- **Guided Voice Assistant (Bottom-Left Mic)**: Tap the mic button at the bottom-left of the modal to launch a step-by-step guided intake flow (or speak multiple details in one sentence) that extracts and populates all matching patient fields automatically via [`patient-voice-intake.ts`](file:///Users/shriii/Documents/GitHub/sakshya-app/src/lib/voice/patient-voice-intake.ts).

### 4. Firebase Firestore & Android Room Persistence (Zero Sample Data)
- **Zero Hardcoded Patient Fixtures**: All sample patients, visits, danger alerts, follow-ups, and immunisation fixtures have been removed ([`mock-data.ts`](file:///Users/shriii/Documents/GitHub/sakshya-app/src/lib/mock-data.ts)).
- **Cloud Database (`sakshya-aasha`)**: [`DataService`](file:///Users/shriii/Documents/GitHub/sakshya-app/src/services/data-service.ts) reads and writes `beneficiaries`, `visits`, `danger_alerts`, `follow_up_tasks`, and `audit_logs` directly to **Firebase Firestore** ([`src/lib/firebase/config.ts`](file:///Users/shriii/Documents/GitHub/sakshya-app/src/lib/firebase/config.ts)) with real-time `onSnapshot` alert subscriptions and `AsyncStorage` offline caching.
- **Android Native Firebase + Room Schema**: Configured `google-services.json`, `com.google.gms:google-services`, Firebase BoM `33.7.0`, and Room `2.6.1` entities, DAOs, type converters, `AppDatabase`, and `MIGRATION_1_2` under `android/app/src/main/java/com/sakshya/asha/data/local/`.

### 5. Urgent NHM Danger-Sign Alerts & PHC Supervisor Portal
- **Danger-Sign Banner**: High-contrast alert banner with haptic feedback, NHM guideline citation, spoken referral instruction, and one-tap `108` ambulance dialer.
- **PHC Supervisor Portal**: Real-time overview metrics, active danger-alert escalation/acknowledgement workflow, ASHA worker directory, visit register, analytics, and CSV audit exports.

---

## Backend & Environment Configuration

All Gnani, Gemini, and backend credentials stay strictly on the FastAPI backend—never in the mobile bundle.

- **Production Railway Backend**:
  - **REST API**: `https://sakshya-web-production.up.railway.app`
  - **Voice WebSocket**: `wss://sakshya-web-production.up.railway.app/ws/voice`
  - Configured in `.env` (`EXPO_PUBLIC_VOICE_API_BASE_URL`, `EXPO_PUBLIC_VOICE_WS_URL`), [`fastapi-client.ts`](file:///Users/shriii/Documents/GitHub/sakshya-app/src/lib/api/fastapi-client.ts), [`ApiConfig.kt`](file:///Users/shriii/Documents/GitHub/sakshya-app/android/app/src/main/java/org/nhm/sakshya/asha/ApiConfig.kt), and overrideable at runtime via the Login Screen's **Voice Backend URL** settings.
- **Firebase Configuration (`.env`)**:
  - `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`.
  - Native Android config at `android/app/google-services.json`.

---

## Project Structure

```text
sakshya-app/
├── App.tsx                                 # Root navigation, ASHA & PHC Supervisor portals
├── app.json                                # Expo 51 config + plugins/withCleartextTraffic
├── eas.json                                # EAS APK preview & AAB production profiles
├── plugins/withCleartextTraffic.js         # Persistent AndroidManifest cleartext plugin
├── scripts/build-apk.sh                    # Automated Android Release APK builder
├── builds/sakshya-asha-release.apk         # Built standalone Android Release APK (66 MB)
├── android/
│   ├── app/google-services.json            # Firebase Android app config (org.nhm.sakshya.asha)
│   └── app/src/main/java/
│       ├── org/nhm/sakshya/asha/
│       │   ├── ApiConfig.kt                # Production Railway REST/WS endpoints
│       │   ├── MainApplication.kt          # Initializes FirebaseApp, AppDatabase, PcmAudioRecorderPackage
│       │   └── PcmAudioRecorderModule.kt   # Native 16kHz pcm_s16le AudioRecord module
│       └── com/sakshya/asha/data/local/    # Room entities, DAOs, converters, MIGRATION_1_2, AppDatabase
├── src/
│   ├── components/
│   │   ├── asha/                           # Home, Directory, Follow-ups, History, Offline, AddPatientModal
│   │   ├── auth/                           # LoginScreen with backend URL configuration
│   │   ├── layout/                         # AppShell (drawer, language picker, bottom tabs)
│   │   ├── supervisor/                     # Overview, Alerts, Workers, Register, Analytics, Reports
│   │   └── voice/                          # VoiceVisitWorkspace, Basic/Advanced views, PTT & Review UI
│   ├── hooks/useVoiceVisitSession.ts       # Live voice state, PTT hold/resume, draft merging
│   ├── lib/
│   │   ├── api/fastapi-client.ts           # REST client for Railway/custom FastAPI backend
│   │   ├── firebase/config.ts              # Firebase App & Firestore initialization
│   │   ├── i18n/                           # LanguageContext & 11-language UI translations
│   │   ├── offline/ & sync/                # AsyncStorage draft queue & offline sync manager
│   │   └── voice/                          # MobileVoiceClient & patient-voice-intake parser
│   ├── services/data-service.ts            # Firestore + offline-cached clinical DataService
│   └── theme/tokens.ts                     # Clinical palette & Liquid Glass styling tokens
└── tests/                                  # Jest unit & live backend contract tests
```

---

## Quick Start & Verification

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Run verification gates (secret scan, TypeScript, ESLint, Jest unit + live backend tests)
./ralph/verify.sh

# 3. Start Expo dev server (optional for local development)
npx expo start
```

---

## Building & Installing the Android APK

```bash
# Build signed Release APK (Hermes + offline JS bundle)
npm run build:apk
# Output: builds/sakshya-asha-release.apk (66 MB)

# Install onto a connected Android device via ADB
adb install -r builds/sakshya-asha-release.apk
```

See [builds/README.md](file:///Users/shriii/Documents/GitHub/sakshya-app/builds/README.md) for direct device transfer instructions.

---

## Architecture & Documentation
- [docs/AUDIT.md](file:///Users/shriii/Documents/GitHub/sakshya-app/docs/AUDIT.md) — Reference web application audit, backend API/WebSocket contracts, and colour tokens.
- [docs/SCREEN_FLOW.md](file:///Users/shriii/Documents/GitHub/sakshya-app/docs/SCREEN_FLOW.md) — Screen-to-screen navigation map, voice state machine, and error/offline recovery flows.
- [docs/TEST_REPORT.md](file:///Users/shriii/Documents/GitHub/sakshya-app/docs/TEST_REPORT.md) — Verification matrix (`LIVE` vs `UNIT` vs `DEVICE`) and field demo guide.
- [ralph/](file:///Users/shriii/Documents/GitHub/sakshya-app/ralph/) — Verification harness (`verify.sh`, `loop.sh`, `PLAN.md`).
