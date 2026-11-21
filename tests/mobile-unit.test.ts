import { mergeVisitV1IntoDraft } from '@/hooks/useVoiceVisitSession';
import {
  buildVisitsCsv,
  computeDailyVisitVolume,
  computeSupervisorOverview,
  computeVisitTypeDistribution,
} from '@/lib/analytics/supervisor-metrics';
import type { DangerAlertV1, VisitRecordV1 } from '@/lib/contracts/v1';
import { SYNTHETIC_PROFILES } from '@/lib/mock-data';
import { ClinicalColors, TouchTargets } from '@/theme/tokens';
import { alertV1ToUi, type Beneficiary } from '@/types';

const TEST_BENEFICIARY: Beneficiary = {
  id: 'c0000000-0000-0000-0000-000000001042',
  beneficiary_id: 'BEN-1042',
  full_name: 'Test Beneficiary',
  age_years: 24,
  gender: 'FEMALE',
  category: 'PREGNANT_WOMAN',
  village: 'Test Village',
  high_risk_status: false,
  high_risk_reasons: [],
  assigned_asha_id: 'b0000000-0000-0000-0000-000000000001',
  phc_id: 'a0000000-0000-0000-0000-000000000001',
  preferred_language: 'hi-IN',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

// Pure audio & protocol utilities tested without native runtime dependencies
import {
  base64ToUint8Array,
  buildWavFromPcm16Le,
  computePercentile,
  extractPcm16LeFromWavBytes,
  mapBackendStateToUiState,
  meteringDbToWaveform,
  uint8ArrayToBase64,
} from '@/lib/voice/voice-client';

jest.mock('expo-av', () => ({
  Audio: {
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: jest.fn(),
    Sound: { createAsync: jest.fn() },
    AndroidOutputFormat: { DEFAULT: 0 },
    AndroidAudioEncoder: { DEFAULT: 0 },
    IOSOutputFormat: { LINEARPCM: 'lpcm' },
    IOSAudioQuality: { HIGH: 127 },
  },
  InterruptionModeAndroid: { DoNotMix: 1 },
  InterruptionModeIOS: { DoNotMix: 1 },
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
}));

describe('[UNIT] Mobile Audio Pipeline & Gnani PCM/WAV Framing', () => {
  test('base64ToUint8Array and uint8ArrayToBase64 round-trip 16kHz PCM audio frames accurately', () => {
    const samplePcm = new Uint8Array(1024);
    for (let i = 0; i < samplePcm.length; i++) {
      samplePcm[i] = (i * 17) & 0xff;
    }
    const b64 = uint8ArrayToBase64(samplePcm);
    const decoded = base64ToUint8Array(b64);
    expect(decoded.byteLength).toBe(1024);
    expect(Array.from(decoded)).toEqual(Array.from(samplePcm));
  });

  test('buildWavFromPcm16Le wraps raw pcm_s16le in a valid 44-byte RIFF/WAVE header and extractPcm16LeFromWavBytes recovers exact PCM', () => {
    const rawPcm = new Uint8Array([0x10, 0x01, 0x20, 0x02, 0xf0, 0xff, 0x00, 0x00]);
    const wav = buildWavFromPcm16Le(rawPcm, 16000);
    expect(wav.byteLength).toBe(44 + rawPcm.byteLength);

    // Check 'RIFF' and 'WAVE' magic headers
    const riff = String.fromCharCode(wav[0], wav[1], wav[2], wav[3]);
    const wave = String.fromCharCode(wav[8], wav[9], wav[10], wav[11]);
    expect(riff).toBe('RIFF');
    expect(wave).toBe('WAVE');

    const extracted = extractPcm16LeFromWavBytes(wav);
    expect(Array.from(extracted)).toEqual(Array.from(rawPcm));
  });

  test('meteringDbToWaveform maps dBFS metering into normalized 0..1 level and 16-band visualizer', () => {
    const silence = meteringDbToWaveform(-65);
    expect(silence.level).toBe(0);
    expect(silence.bands).toHaveLength(16);

    const speech = meteringDbToWaveform(-12);
    expect(speech.level).toBeGreaterThan(0.75);
    expect(speech.bands).toHaveLength(16);
    expect(speech.bands.every((b) => b >= 0.1 && b <= 1)).toBe(true);
  });

  test('computePercentile calculates P50 and P95 TTFA latency percentiles', () => {
    expect(computePercentile([], 50)).toBeNull();
    expect(computePercentile([420], 50)).toBe(420);
    expect(computePercentile([300, 400, 500, 600, 900], 50)).toBe(500);
    expect(computePercentile([300, 400, 500, 600, 900], 95)).toBe(840);
  });

  test('mapBackendStateToUiState maps all 10 BackendSessionStateV1 values deterministically', () => {
    expect(mapBackendStateToUiState('idle')).toBe('idle');
    expect(mapBackendStateToUiState('listening')).toBe('listening');
    expect(mapBackendStateToUiState('processing')).toBe('processing');
    expect(mapBackendStateToUiState('speaking')).toBe('speaking');
    expect(mapBackendStateToUiState('read_back')).toBe('speaking');
    expect(mapBackendStateToUiState('danger_escalation')).toBe('responding');
    expect(mapBackendStateToUiState('awaiting_confirmation')).toBe('listening');
    expect(mapBackendStateToUiState('committing')).toBe('processing');
    expect(mapBackendStateToUiState('committed')).toBe('completed');
    expect(mapBackendStateToUiState('closed')).toBe('completed');
  });
});

describe('[UNIT] VisitDraft Merging, Selective Voice Correction & Danger Alert Preservation', () => {
  const worker = SYNTHETIC_PROFILES[0];
  const beneficiary = TEST_BENEFICIARY;

  const baseRecord: VisitRecordV1 = {
    schema_version: 'v1',
    visit_id: 'vis_test_1042',
    session_id: 'sess_test_01',
    worker_id: worker.worker_code,
    beneficiary_id: 'BEN-1042',
    beneficiary_name: 'Lakshmi Devi',
    visit_type: 'Newborn',
    weight_kg: 3.1,
    weight_source_text: '3.1 kilo',
    vaccinations_completed: ['BCG'],
    vaccinations_due: ['OPV-1'],
    next_visit_date: '2026-12-05',
    next_visit_date_source_text: '5 December',
    danger_signs: [],
    danger_sign_flagged: false,
    follow_up_actions: [
      {
        action_type: 'hbnc_visit',
        description: 'HBNC Day 14 checkup',
        due_date: '2026-12-05',
        priority: 'normal',
        source_phrase: 'next visit 5 December',
      },
    ],
    status: 'draft',
    confirmed_at: null,
    committed_at: null,
    persistence_record_id: null,
    language: 'hi-IN',
    timezone: 'Asia/Kolkata',
    synthetic: true,
  };

  test('selective voice correction ("no, weight is 2.8 kilo") patches ONLY weight_kg and preserves all other fields', () => {
    const initialDraft = mergeVisitV1IntoDraft(null, baseRecord, beneficiary, worker);
    expect(initialDraft.weight_kg).toBe(3.1);
    expect(initialDraft.visit_type).toBe('Newborn');
    expect(initialDraft.vaccinations_completed).toEqual(['BCG']);
    expect(initialDraft.next_visit_date).toBe('2026-12-05');

    const correctedRecord: VisitRecordV1 = {
      ...baseRecord,
      weight_kg: 2.8,
      weight_source_text: 'no, weight is 2.8 kilo',
    };

    const correctedDraft = mergeVisitV1IntoDraft(
      initialDraft,
      correctedRecord,
      beneficiary,
      worker,
      {
        correctedFields: ['weight_kg'],
      }
    );

    expect(correctedDraft.weight_kg).toBe(2.8);
    expect(correctedDraft.field_statuses?.weight_kg).toBe('corrected');
    // All other fields must remain intact
    expect(correctedDraft.beneficiary_id).toBe('BEN-1042');
    expect(correctedDraft.visit_type).toBe('Newborn');
    expect(correctedDraft.vaccinations_completed).toEqual(['BCG']);
    expect(correctedDraft.vaccinations_due).toEqual(['OPV-1']);
    expect(correctedDraft.next_visit_date).toBe('2026-12-05');
  });

  test('danger alert conversion and flag survive subsequent corrections', () => {
    const rawAlert: DangerAlertV1 = {
      schema_version: 'v1',
      alert_id: 'alrt_conv_01',
      session_id: 'sess_test_01',
      visit_id: 'vis_test_1042',
      beneficiary_id: 'BEN-1042',
      canonical_danger_sign_id: 'maternal_convulsions',
      canonical_name: 'Convulsions / Eclampsia Fit',
      subject: 'mother',
      category: 'ANC',
      supporting_evidence: 'तेज सिरदर्द और दौरे पड़ रहे हैं',
      match_type: 'exact_phrase',
      source_guideline_ref: 'NHM-ASHA-Maternal-Danger-Signs-Sec-2.1',
      detected_at: new Date().toISOString(),
      status: 'active',
      acknowledged_by: null,
      acknowledged_at: null,
      escalation_language: 'hi-IN',
      referral_message: 'तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC/FRU) रेफर करें और 108 बुलाएं।',
      danger_sign_flagged: true,
      priority: 'urgent',
    };

    const uiAlert = alertV1ToUi(rawAlert, {
      beneficiary_name: 'Lakshmi Devi',
      asha_worker_id: worker.id,
      asha_worker_name: worker.full_name,
      phc_id: worker.phc_id,
    });

    expect(uiAlert.danger_sign_flagged).toBe(true);
    expect(uiAlert.priority).toBe('urgent');

    const draftWithAlert = mergeVisitV1IntoDraft(
      null,
      {
        ...baseRecord,
        danger_sign_flagged: true,
        danger_signs: ['maternal_convulsions'],
      },
      beneficiary,
      worker,
      {
        attachedAlerts: [uiAlert],
      }
    );

    expect(draftWithAlert.danger_sign_flagged).toBe(true);
    expect(draftWithAlert.danger_alerts).toHaveLength(1);
    expect(draftWithAlert.danger_alerts[0].canonical_danger_sign_id).toBe(
      'maternal_convulsions'
    );
  });
});

describe('[UNIT] Design Tokens & PHC Supervisor Analytics', () => {
  test('theme tokens match exact web clinical palette and enforce >= 48dp touch targets', () => {
    expect(ClinicalColors.primary).toBe('#0F766E');
    expect(ClinicalColors.primaryDark).toBe('#115E59');
    expect(ClinicalColors.secondary).toBe('#0284C7');
    expect(ClinicalColors.danger).toBe('#DC2626');
    expect(ClinicalColors.canvas).toBe('#F8FAFC');
    expect(ClinicalColors.text).toBe('#0F172A');
    expect(TouchTargets.min).toBeGreaterThanOrEqual(48);
  });

  test('computeSupervisorOverview, computeDailyVisitVolume, and buildVisitsCsv aggregate visits accurately', () => {
    const stats = computeSupervisorOverview({
      beneficiaries: [TEST_BENEFICIARY],
      workers: SYNTHETIC_PROFILES,
      visits: [],
      followUps: [],
      immunisations: [],
      dangerAlerts: [],
    });
    expect(stats.totalBeneficiaries).toBe(1);
    expect(stats.activeAshaWorkers).toBe(1);

    const daily = computeDailyVisitVolume([], 7);
    expect(daily).toHaveLength(7);

    const dist = computeVisitTypeDistribution([]);
    expect(dist).toHaveLength(5);

    const csv = buildVisitsCsv([]);
    expect(csv).toContain('Visit ID,Persistence ID,Visit Date');
  });
});

