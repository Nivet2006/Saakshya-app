# Learnings & Engineering Log

- Backend runs at `http://localhost:8000` (and LAN IP `http://10.178.123.170:8000`) with Gnani Prisma v3.0 STT (`prisma-v3.0`), Gnani Timbre v3.0 TTS (`timbre-v3.0`), and Gemini (`gemini-3.1-flash-lite`) already live-configured in `/Users/shriii/Documents/GitHub/sakshya-web/.env`.
- Never bundle `GNANI_API_KEY`, `GEMINI_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` into the mobile app; all voice STT/TTS/LLM requests go through the FastAPI backend (`/api/v1/sessions` and `/ws/voice/{session_id}`).
- WebSocket audio contract: client sends either binary frames of 16kHz 16-bit mono signed PCM (`pcm_s16le`) or JSON `{"type": "audio_chunk", "audio_base64": "...", "encoding": "pcm_s16le", "sample_rate": 16000, "channels": 1}`.
- Server sends `tts_audio_chunk` with `audio_base64` containing raw 16kHz 16-bit mono signed little-endian PCM (`pcm_s16le`); on mobile (`expo-av`), wrap raw PCM chunks or accumulated turn buffers in a valid 44-byte RIFF/WAVE header (`audio/wav`) for low-latency native playback, and immediately stop/unload active `Audio.Sound` on `barge_in` or `tts_cancelled`.
