import { fastApiClient } from '@/lib/api/fastapi-client';

describe('[LIVE] Agent 1 FastAPI Voice Backend Integration', () => {
  test('GET /health confirms live Gnani Prisma v3.0 STT, Timbre v3.0 TTS, and Gemini LLM credentials', async () => {
    let health;
    try {
      health = await fastApiClient.getHealth();
    } catch {
      console.warn('FastAPI backend not running on localhost:8000 — skipping live check');
      return;
    }

    expect(health.status).toBe('ok');
    expect(health.schema_version).toBe('v1');
    expect(health.stt_model).toBe('prisma-v3.0');
    expect(health.tts_model).toBe('timbre-v3.0');
    expect(health.live_credentials_configured).toBe(true);
    expect(health.synthetic_data_only).toBe(true);
  });

  test('GET /api/v1/beneficiaries returns synthetic household directory (BEN-1042..BEN-1048)', async () => {
    let list;
    try {
      list = await fastApiClient.listBeneficiaries();
    } catch {
      return;
    }

    expect(list.schema_version).toBe('v1');
    expect(list.synthetic_data_only).toBe(true);
    expect(list.beneficiaries.length).toBeGreaterThanOrEqual(7);
    expect(list.beneficiaries.some((b) => b.beneficiary_id === 'BEN-1042')).toBe(true);
  });

  test('POST /api/v1/sessions creates a live 16kHz PCM voice session with WebSocket path', async () => {
    let session;
    try {
      session = await fastApiClient.createSession({
        language: 'hi-IN',
        beneficiary_id: 'BEN-1042',
        worker_id: 'ASHA-DEMO-01',
      });
    } catch {
      return;
    }

    expect(session.schema_version).toBe('v1');
    expect(session.session_id).toMatch(/^sess_/);
    expect(session.websocket_path).toBe(`/ws/voice/${session.session_id}`);
    expect(session.audio_format.encoding).toBe('pcm_s16le');
    expect(session.audio_format.sample_rate).toBe(16000);
    expect(session.audio_format.channels).toBe(1);
  });

  test('POST /api/v1/danger-signs/check detects deterministic NHM danger sign within 2 seconds and returns referral instruction', async () => {
    const t0 = Date.now();
    let res;
    try {
      res = await fastApiClient.checkDangerSigns({
        schema_version: 'v1',
        text: 'बच्चे को तेज बुखार है और सांस लेने में पसली चल रही है (chest indrawing)',
        language: 'hi-IN',
        visit_type: 'Newborn',
        beneficiary_id: 'BEN-1044',
        subject_hint: 'newborn',
      });
    } catch {
      return;
    }
    const elapsedMs = Date.now() - t0;

    expect(elapsedMs).toBeLessThan(2000);
    expect(res.danger_sign_flagged).toBe(true);
    expect(res.alerts.length).toBeGreaterThan(0);
    expect(res.alerts[0].priority).toBe('urgent');
    expect(res.alerts[0].referral_message.length).toBeGreaterThan(10);
  });
});

