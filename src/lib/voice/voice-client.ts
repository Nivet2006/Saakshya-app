import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import {
  fastApiClient,
  FastApiError,
  getVoiceApiBaseUrl,
  getVoiceWsBaseUrl,
} from '@/lib/api/fastapi-client';
import type {
  BackendSessionStateV1,
  ClarificationCandidateV1,
  ClarificationReasonV1,
  ClientWebSocketEventV1,
  DangerAlertV1,
  ServerBargeInEventV1,
  ServerClarificationRequiredEventV1,
  ServerCorrectionAppliedEventV1,
  ServerDangerAlertEventV1,
  ServerErrorEventV1,
  ServerFinalTranscriptEventV1,
  ServerPartialTranscriptEventV1,
  ServerPersistenceRejectedEventV1,
  ServerPersistenceRequestedEventV1,
  ServerReadBackStartedEventV1,
  ServerSessionReadyEventV1,
  ServerVisitCommittedEventV1,
  ServerVisitConfirmedEventV1,
  ServerVisitDraftUpdatedEventV1,
  VisitRecordV1,
} from '@/lib/contracts/v1';
import type { LanguageCode, VoiceInteractionState } from '@/types';

const TARGET_SAMPLE_RATE = 16000;
const TARGET_FRAME_BYTES = 1024; // 512 samples * 2 bytes = 32ms @ 16kHz pcm_s16le
const WAV_HEADER_BYTES = 44;

export type MicPermissionState = 'unknown' | 'granted' | 'denied' | 'permanently_denied';

export interface AudioInputDeviceInfo {
  deviceId: string;
  label: string;
}

export interface AudioDiagnostics {
  captureSampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  usedAudioWorklet: boolean;
  framesSent: number;
  bytesSent: number;
  droppedFrames: number;
  clippedSamples: number;
  lastRms: number;
  ambientNoiseRms: number;
  staleChunksDiscarded: number;
  localBargeInCount: number;
  localPlaybackStopMs: number | null;
}

export interface VoiceLatencyMetrics {
  lastTtfaMs: number | null;
  p50TtfaMs: number | null;
  p95TtfaMs: number | null;
  avgTtfaMs: number | null;
  greetingLatencyMs: number | null;
  lastSttFinalizationMs: number | null;
  lastTtsFirstChunkMs: number | null;
  turnCount: number;
}

export function computePercentile(sorted: number[], pct: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return Math.round(sorted[0]);
  const rank = (pct / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return Math.round(sorted[low]);
  const weight = rank - low;
  return Math.round(sorted[low] * (1 - weight) + sorted[high] * weight);
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  if (len === 0) return new Uint8Array(0);
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((len * 3) / 4) - pad;
  const bytes = new Uint8Array(Math.max(0, byteLength));
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(clean.charAt(i));
    const enc2 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
    const enc3 = clean.charAt(i + 2) === '=' ? 0 : BASE64_CHARS.indexOf(clean.charAt(i + 2));
    const enc4 = clean.charAt(i + 3) === '=' ? 0 : BASE64_CHARS.indexOf(clean.charAt(i + 3));

    const triplet = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;
    if (p < byteLength) bytes[p++] = (triplet >> 16) & 0xff;
    if (p < byteLength) bytes[p++] = (triplet >> 8) & 0xff;
    if (p < byteLength) bytes[p++] = triplet & 0xff;
  }

  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < len ? BASE64_CHARS[(triplet >> 6) & 0x3f] : '=';
    result += i + 2 < len ? BASE64_CHARS[triplet & 0x3f] : '=';
  }
  return result;
}

/**
 * Wraps raw 16kHz 16-bit mono signed little-endian PCM bytes (`pcm_s16le`)
 * in a standard 44-byte RIFF/WAVE header so `expo-av` can play streamed Gnani Timbre TTS chunks natively.
 */
export function buildWavFromPcm16Le(pcmBytes: Uint8Array, sampleRate = 16000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBytes.byteLength;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const out = new Uint8Array(buffer);
  out.set(pcmBytes, WAV_HEADER_BYTES);
  return out;
}

/**
 * Strips the 44-byte WAV header from a recorded 16kHz 16-bit mono WAV file
 * to extract raw `pcm_s16le` bytes for Agent 1's Gnani Prisma STT WebSocket.
 */
export function extractPcm16LeFromWavBytes(wavBytes: Uint8Array): Uint8Array {
  if (wavBytes.byteLength <= WAV_HEADER_BYTES) {
    return new Uint8Array(0);
  }
  // Locate 'data' chunk if non-standard header size, otherwise default 44 bytes
  for (let i = 12; i < Math.min(wavBytes.byteLength - 8, 256); i++) {
    if (
      wavBytes[i] === 0x64 && // 'd'
      wavBytes[i + 1] === 0x61 && // 'a'
      wavBytes[i + 2] === 0x74 && // 't'
      wavBytes[i + 3] === 0x61 // 'a'
    ) {
      return wavBytes.subarray(i + 8);
    }
  }
  return wavBytes.subarray(WAV_HEADER_BYTES);
}

/** Converts normalized 0..1 amplitude into 16-band visualizer. */
export function levelToWaveformBands(level: number): number[] {
  const clamped = Math.max(0, Math.min(1, level));
  const bands: number[] = [];
  for (let i = 0; i < 16; i++) {
    const phase = Math.sin((i / 16) * Math.PI) * 0.75 + 0.25;
    const jitter = ((i * 7) % 5) * 0.04;
    const val = clamped <= 0.03 ? 0.08 : Math.min(1, Math.max(0.1, clamped * phase + jitter * clamped));
    bands.push(Math.round(val * 100) / 100);
  }
  return bands;
}

/** Converts dBFS metering (-160..0) from expo-av into normalized 0..1 amplitude + 16-band visualizer. */
export function meteringDbToWaveform(db: number): { level: number; bands: number[] } {
  const clampedDb = Math.max(-65, Math.min(0, db));
  const level = Math.max(0, Math.min(1, (clampedDb + 65) / 65));
  return { level, bands: levelToWaveformBands(level) };
}

export async function checkMicrophonePermission(): Promise<MicPermissionState> {
  try {
    const perm = await Audio.getPermissionsAsync();
    if (perm.granted) return 'granted';
    if (!perm.canAskAgain) return 'permanently_denied';
    return 'denied';
  } catch {
    return 'unknown';
  }
}

export async function requestMicrophonePermission(): Promise<MicPermissionState> {
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (perm.granted) return 'granted';
    if (!perm.canAskAgain) return 'permanently_denied';
    return 'denied';
  } catch {
    return 'denied';
  }
}

export async function listAudioInputDevices(): Promise<AudioInputDeviceInfo[]> {
  return [{ deviceId: 'default', label: 'Device Microphone (16kHz PCM)' }];
}

const WAV_16KHZ_MONO_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: TARGET_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: TARGET_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export interface VoiceClientCallbacks {
  onStateChange: (state: VoiceInteractionState, backendState?: BackendSessionStateV1) => void;
  onSessionReady?: (event: ServerSessionReadyEventV1) => void;
  onConnectionChange?: (connected: boolean, reconnecting?: boolean) => void;
  onSpeechActivity?: (speaking: boolean, utteranceId: string | null) => void;
  onPartialTranscript: (event: ServerPartialTranscriptEventV1) => void;
  onFinalTranscript: (event: ServerFinalTranscriptEventV1) => void;
  onAssistantResponse: (
    text: string,
    turnId: number,
    isDangerEscalation: boolean,
    language: string
  ) => void;
  onTtsPlaybackChange?: (isPlaying: boolean, isPaused: boolean, turnId: number) => void;
  onBargeIn?: (event: ServerBargeInEventV1) => void;
  onAudioLevel: (level: number, bands?: number[]) => void;
  onVisitDraftUpdated: (event: ServerVisitDraftUpdatedEventV1) => void;
  onClarificationRequired?: (event: ServerClarificationRequiredEventV1) => void;
  onReadBackStarted?: (event: ServerReadBackStartedEventV1) => void;
  onCorrectionApplied?: (event: ServerCorrectionAppliedEventV1) => void;
  onVisitConfirmed?: (event: ServerVisitConfirmedEventV1) => void;
  onPersistenceRequested?: (event: ServerPersistenceRequestedEventV1) => void;
  onVisitCommitted?: (event: ServerVisitCommittedEventV1) => void;
  onPersistenceRejected?: (event: ServerPersistenceRejectedEventV1) => void;
  onDangerAlert: (event: ServerDangerAlertEventV1) => void;
  onLatencyUpdate?: (metrics: VoiceLatencyMetrics) => void;
  onAudioDiagnostics?: (diag: AudioDiagnostics) => void;
  onPermissionStateChange?: (perm: MicPermissionState) => void;
  onError: (code: string, message: string, retryable: boolean) => void;
}

export class MobileVoiceClient {
  private ws: WebSocket | null = null;
  private recording: Audio.Recording | null = null;
  private isRotatingSegment = false;
  private activeSound: Audio.Sound | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private wsConnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private lastWsUrl: string | null = null;
  private isPreparingRecording = false;
  private pendingStopAfterPrepare = false;
  private nativePcmActive = false;
  private nativeLevelSub: EmitterSubscription | null = null;

  private activeTurnId = 0;
  private minPlayableTurnId = 0;
  private cancelledTurnIds = new Set<number>();
  private turnPcmChunks = new Map<number, Uint8Array[]>();
  private playbackQueue: Array<{ turnId: number; pcmBytes: Uint8Array }> = [];
  private isProcessingPlaybackQueue = false;
  private isPlaybackPaused = false;
  private isPlayingAudio = false;
  private localBargeInStreak = 0;
  private localBargeInSentTurnId = -1;
  private speechDetectedInSegment = false;
  private silenceStreakTicks = 0;
  private segmentTickCount = 0;

  private audioDiag: AudioDiagnostics = {
    captureSampleRate: TARGET_SAMPLE_RATE,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    usedAudioWorklet: true,
    framesSent: 0,
    bytesSent: 0,
    droppedFrames: 0,
    clippedSamples: 0,
    lastRms: 0,
    ambientNoiseRms: 0.008,
    staleChunksDiscarded: 0,
    localBargeInCount: 0,
    localPlaybackStopMs: null,
  };

  private sessionId = '';
  private language: LanguageCode = 'hi-IN';
  private workerId = 'ASHA-DEMO-01';
  private beneficiaryId: string | null = null;
  private callbacks: VoiceClientCallbacks;
  private isClosing = false;
  private isMicStreaming = true;
  private handsFreeMode = true;

  // TTFA Latency Instrumentation
  private sessionReadyAtMs = 0;
  private speechStartedAtMs = 0;
  private speechEndedAtMs = 0;
  private llmFirstTokenAtMs = 0;
  private ttsFirstChunkAtMs = 0;
  private recordedTurnPlaybacks = new Set<number>();
  private ttfaSamplesMs: number[] = [];
  private greetingLatencyMs: number | null = null;
  private lastSttFinalizationMs: number | null = null;
  private lastTtsFirstChunkMs: number | null = null;

  constructor(callbacks: VoiceClientCallbacks) {
    this.callbacks = callbacks;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  setHandsFreeMode(enabled: boolean): void {
    this.handsFreeMode = enabled;
    this.setMicTransmissionActive(enabled);
  }

  setMicTransmissionActive(active: boolean): void {
    const wasActive = this.isMicStreaming;
    this.isMicStreaming = active;
    if (!active) {
      this.callbacks.onAudioLevel(0, new Array(16).fill(0));
      if (this.isPreparingRecording) {
        this.pendingStopAfterPrepare = true;
        return;
      }
      if ((wasActive || this.nativePcmActive || this.recording) && !this.isRotatingSegment) {
        this.callbacks.onStateChange('transcribing');
        void this.flushCurrentRecordingSegment(false);
      }
    } else {
      this.pendingStopAfterPrepare = false;
      if (this.isPlayingAudio) {
        this.triggerBargeIn('ptt_press');
      }
      if (!this.recording && !this.nativePcmActive && !this.isPreparingRecording && this.isConnected() && !this.isClosing) {
        this.callbacks.onStateChange('listening');
        void this.startRecordingSegment();
      }
    }
  }

  async startSession(config: {
    language: LanguageCode;
    workerId: string;
    beneficiaryId?: string | null;
    deviceId?: string;
    handsFree?: boolean;
    existingSessionId?: string;
  }): Promise<string | null> {
    await this.cleanupAudioOnly();
    this.closeSocketOnly();

    this.isClosing = false;
    this.language = config.language;
    this.workerId = config.workerId;
    this.beneficiaryId = config.beneficiaryId ?? null;
    this.handsFreeMode = config.handsFree ?? true;
    this.isMicStreaming = this.handsFreeMode;
    this.activeTurnId = 0;
    this.minPlayableTurnId = 0;
    this.cancelledTurnIds.clear();
    this.turnPcmChunks.clear();
    this.playbackQueue = [];
    this.localBargeInStreak = 0;
    this.localBargeInSentTurnId = -1;

    this.callbacks.onStateChange('connecting');

    // 1. Check / request microphone permission
    const permState = await requestMicrophonePermission();
    this.callbacks.onPermissionStateChange?.(permState);
    if (permState !== 'granted') {
      const msg =
        permState === 'permanently_denied'
          ? 'Microphone access is permanently denied. Open system Settings to enable microphone permission for Saakshya ASHA, or use Type to Backend.'
          : 'Microphone permission was denied. Grant microphone access to record voice visits.';
      this.callbacks.onStateChange('error');
      this.callbacks.onError('MICROPHONE_PERMISSION_DENIED', msg, true);
      return null;
    }

    // 2. Configure background-safe mobile audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });
    } catch {
      // non-fatal in simulator
    }

    // 3. Create session on Agent 1 FastAPI backend
    let wsPath = '';
    try {
      if (config.existingSessionId) {
        this.sessionId = config.existingSessionId;
        wsPath = `/ws/voice/${encodeURIComponent(config.existingSessionId)}`;
      } else {
        const created = await fastApiClient.createSession({
          language: this.language,
          beneficiary_id: this.beneficiaryId,
          worker_id: this.workerId,
        });
        this.sessionId = created.session_id;
        wsPath = created.websocket_path;
      }
    } catch (err) {
      const code = err instanceof FastApiError ? err.code : 'BACKEND_UNREACHABLE';
      const msg =
        err instanceof FastApiError
          ? err.message
          : `Voice backend server is unreachable at ${getVoiceApiBaseUrl()}. Ensure FastAPI is running or update the Backend URL in Connection Settings.`;
      this.callbacks.onStateChange('error');
      this.callbacks.onConnectionChange?.(false, false);
      this.callbacks.onError(code, msg, true);
      return null;
    }

    // 4. Open WebSocket to /ws/voice/{session_id}?language=...&greet=true
    const wsUrl = `${getVoiceWsBaseUrl()}${wsPath}?language=${encodeURIComponent(
      this.language
    )}&greet=true`;
    this.openWebSocket(wsUrl);
    return this.sessionId;
  }

  private openWebSocket(wsUrl: string, isReconnect = false): void {
    this.lastWsUrl = wsUrl;
    if (this.wsConnectTimer) {
      clearTimeout(this.wsConnectTimer);
      this.wsConnectTimer = null;
    }

    const ws = new WebSocket(wsUrl);
    this.ws = ws;
    let opened = false;

    // Guard against hanging WebSocket handshake (15s timeout)
    this.wsConnectTimer = setTimeout(() => {
      if (!opened && !this.isClosing && this.ws === ws) {
        try {
          ws.close(4000, 'Connection timeout');
        } catch {
          // ignore
        }
      }
    }, 15000);

    ws.onopen = () => {
      opened = true;
      if (this.wsConnectTimer) {
        clearTimeout(this.wsConnectTimer);
        this.wsConnectTimer = null;
      }
      if (this.isClosing) {
        ws.close(1000);
        return;
      }
      this.reconnectAttempts = 0;
      this.callbacks.onConnectionChange?.(true, false);
      if (this.isMicStreaming && !isReconnect) {
        void this.startRecordingSegment();
      }
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
      }
      this.pingTimer = setInterval(() => {
        this.sendJson({
          schema_version: 'v1',
          type: 'ping',
          client_timestamp: new Date().toISOString(),
        });
      }, 12000);
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        this.handleServerEvent(payload);
      } catch {
        // ignore malformed frame
      }
    };

    ws.onerror = () => {
      // Handled by onclose so we can attempt transparent reconnect first
    };

    ws.onclose = (ev) => {
      if (this.wsConnectTimer) {
        clearTimeout(this.wsConnectTimer);
        this.wsConnectTimer = null;
      }
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      if (this.isClosing) {
        this.callbacks.onConnectionChange?.(false, false);
        return;
      }

      // Clean server close (1000) -> session completed normally
      if (ev.code === 1000) {
        this.callbacks.onConnectionChange?.(false, false);
        this.callbacks.onStateChange('completed');
        return;
      }

      // Unexpected close / timeout (e.g. 1006, 4000): auto-reconnect up to 2 times
      if (this.reconnectAttempts < 2 && this.sessionId) {
        this.reconnectAttempts += 1;
        this.callbacks.onConnectionChange?.(false, true);
        const retryUrl = `${getVoiceWsBaseUrl()}/ws/voice/${encodeURIComponent(
          this.sessionId
        )}?language=${encodeURIComponent(this.language)}&greet=false`;
        const delayMs = this.reconnectAttempts * 1500;
        this.reconnectTimer = setTimeout(() => {
          if (!this.isClosing) {
            this.openWebSocket(retryUrl, true);
          }
        }, delayMs);
        return;
      }

      this.callbacks.onConnectionChange?.(false, false);
      this.callbacks.onStateChange('error');
      this.callbacks.onError(
        ev.code === 4000 ? 'SESSION_TIMEOUT' : 'WS_CONNECTION_ERROR',
        ev.code === 4000
          ? 'Voice session timed out while connecting. Tap Reconnect Session to retry.'
          : 'Voice session disconnected. Tap Reconnect Session to resume.',
        true
      );
    };
  }

  private async startRecordingSegment(): Promise<void> {
    if (
      this.isClosing ||
      !this.isMicStreaming ||
      this.recording ||
      this.nativePcmActive ||
      this.isRotatingSegment ||
      this.isPreparingRecording
    ) {
      return;
    }

    this.isPreparingRecording = true;
    const nativePcm =
      Platform.OS === 'android' ? NativeModules.PcmAudioRecorder : undefined;

    if (nativePcm && typeof nativePcm.startRecording === 'function') {
      try {
        if (!this.nativeLevelSub) {
          const emitter = new NativeEventEmitter(nativePcm);
          this.nativeLevelSub = emitter.addListener('PcmAudioLevel', (ev: { level?: number }) => {
            if (!this.isMicStreaming || !this.nativePcmActive) return;
            const lvl = typeof ev?.level === 'number' ? ev.level : 0;
            this.audioDiag.lastRms = lvl;
            this.callbacks.onAudioLevel(lvl, levelToWaveformBands(lvl));
          });
        }
        await nativePcm.startRecording();
        this.nativePcmActive = true;
        this.speechStartedAtMs = Date.now();
        this.isPreparingRecording = false;
        if (this.pendingStopAfterPrepare || !this.isMicStreaming || this.isClosing) {
          this.pendingStopAfterPrepare = false;
          void this.flushCurrentRecordingSegment(false);
        }
        return;
      } catch {
        this.nativePcmActive = false;
        this.isPreparingRecording = false;
        // Fallback to expo-av if native AudioRecord fails
      }
    }

    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(WAV_16KHZ_MONO_RECORDING_OPTIONS);
      this.speechDetectedInSegment = false;
      this.silenceStreakTicks = 0;
      this.segmentTickCount = 0;

      rec.setProgressUpdateInterval(120);
      rec.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording || !this.isMicStreaming) return;
        const db = typeof status.metering === 'number' ? status.metering : -60;
        const { level, bands } = meteringDbToWaveform(db);
        this.audioDiag.lastRms = level;
        this.callbacks.onAudioLevel(level, bands);

        this.segmentTickCount += 1;

        // Local VAD Barge-in when assistant TTS is playing and user speaks loudly
        if (this.isPlayingAudio && !this.isPlaybackPaused && level >= 0.42) {
          this.localBargeInStreak += 1;
          if (
            this.localBargeInStreak >= 2 &&
            this.localBargeInSentTurnId !== this.activeTurnId
          ) {
            this.localBargeInSentTurnId = this.activeTurnId;
            this.localBargeInStreak = 0;
            this.triggerBargeIn('local_vad');
          }
        } else {
          this.localBargeInStreak = Math.max(0, this.localBargeInStreak - 1);
        }

        // Segment rotation for Hands-Free continuous streaming to Gnani Prisma STT
        if (level >= 0.22) {
          if (!this.speechDetectedInSegment) {
            this.speechStartedAtMs = Date.now();
          }
          this.speechDetectedInSegment = true;
          this.silenceStreakTicks = 0;
        } else if (this.speechDetectedInSegment) {
          this.silenceStreakTicks += 1;
        }

        // Flush utterance when user pauses after speaking (~720ms) or max 4.2s segment
        if (
          this.handsFreeMode &&
          !this.isRotatingSegment &&
          ((this.speechDetectedInSegment && this.silenceStreakTicks >= 6) ||
            (this.speechDetectedInSegment && this.segmentTickCount >= 35))
        ) {
          void this.flushCurrentRecordingSegment(true);
        }
      });

      await rec.startAsync();
      this.recording = rec;
      this.isPreparingRecording = false;
      if (this.pendingStopAfterPrepare || !this.isMicStreaming || this.isClosing) {
        this.pendingStopAfterPrepare = false;
        void this.flushCurrentRecordingSegment(false);
      }
    } catch {
      this.isPreparingRecording = false;
      this.pendingStopAfterPrepare = false;
      // ignore if recording already active
    }
  }

  private async flushCurrentRecordingSegment(restartAfter: boolean): Promise<void> {
    if ((!this.recording && !this.nativePcmActive) || this.isRotatingSegment) return;
    this.isRotatingSegment = true;

    if (this.nativePcmActive) {
      this.nativePcmActive = false;
      const nativePcm =
        Platform.OS === 'android' ? NativeModules.PcmAudioRecorder : undefined;
      try {
        const b64Pcm: string = nativePcm ? await nativePcm.stopRecording() : '';
        if (b64Pcm && b64Pcm.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.speechEndedAtMs = Date.now();
          this.callbacks.onStateChange('processing');
          const pcmBytes = base64ToUint8Array(b64Pcm);
          await this.streamPcmBytesToBackend(pcmBytes);
        } else if (!this.isClosing) {
          this.callbacks.onStateChange('listening');
        }
      } catch {
        // ignore
      } finally {
        this.isRotatingSegment = false;
        if (restartAfter && !this.isClosing && this.isMicStreaming && this.isConnected()) {
          void this.startRecordingSegment();
        }
      }
      return;
    }

    const currentRec = this.recording;
    this.recording = null;
    const hadSpeech = this.speechDetectedInSegment || !this.handsFreeMode;

    try {
      if (currentRec) {
        await currentRec.stopAndUnloadAsync();
        const uri = currentRec.getURI();
        if (uri && hadSpeech && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.speechEndedAtMs = Date.now();
          this.callbacks.onStateChange('processing');
          const b64Wav = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const wavBytes = base64ToUint8Array(b64Wav);
          const pcmBytes = extractPcm16LeFromWavBytes(wavBytes);
          await this.streamPcmBytesToBackend(pcmBytes);
        }
        if (uri) {
          void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      }
    } catch {
      // ignore segment stop errors
    } finally {
      this.isRotatingSegment = false;
      if (restartAfter && !this.isClosing && this.isMicStreaming && this.isConnected()) {
        void this.startRecordingSegment();
      }
    }
  }

  /**
   * Streams 16kHz 16-bit mono signed PCM (`pcm_s16le`) in exact 32ms (1024-byte) frames
   * matching Agent 1's `ClientAudioChunkEventV1` contract, followed by silence frames so
   * Silero VAD + Gnani Prisma v3.0 finalize the utterance promptly.
   */
  private async streamPcmBytesToBackend(pcmBytes: Uint8Array): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || pcmBytes.byteLength === 0) {
      return;
    }
    let seq = 1;
    for (let offset = 0; offset < pcmBytes.byteLength; offset += TARGET_FRAME_BYTES) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) break;
      const slice = pcmBytes.subarray(
        offset,
        Math.min(offset + TARGET_FRAME_BYTES, pcmBytes.byteLength)
      );
      const b64Chunk = uint8ArrayToBase64(slice);
      this.sendJson({
        schema_version: 'v1',
        type: 'audio_chunk',
        audio_base64: b64Chunk,
        seq: seq++,
        encoding: 'pcm_s16le',
        sample_rate: 16000,
        channels: 1,
      });
      this.audioDiag.framesSent += 1;
      this.audioDiag.bytesSent += slice.byteLength;
    }

    // Append 960ms of trailing silence (30 frames * 32ms) to trigger endpointing cleanly
    const silenceFrameB64 = uint8ArrayToBase64(new Uint8Array(TARGET_FRAME_BYTES));
    for (let i = 0; i < 30; i++) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) break;
      this.sendJson({
        schema_version: 'v1',
        type: 'audio_chunk',
        audio_base64: silenceFrameB64,
        seq: seq++,
        encoding: 'pcm_s16le',
        sample_rate: 16000,
        channels: 1,
      });
    }
    this.callbacks.onAudioDiagnostics?.({ ...this.audioDiag });
  }

  private handleServerEvent(raw: Record<string, unknown>): void {
    const type = raw.type as string;
    switch (type) {
      case 'session_ready': {
        this.sessionReadyAtMs = Date.now();
        const ev = raw as unknown as ServerSessionReadyEventV1;
        this.callbacks.onSessionReady?.(ev);
        this.callbacks.onStateChange('listening', 'listening');
        break;
      }
      case 'session_state': {
        const backendState = raw.state as BackendSessionStateV1;
        const mapped = mapBackendStateToUiState(backendState);
        this.callbacks.onStateChange(mapped, backendState);
        break;
      }
      case 'speech_start': {
        this.speechStartedAtMs = Date.now();
        this.callbacks.onSpeechActivity?.(true, (raw.utterance_id as string | null) ?? null);
        break;
      }
      case 'speech_end': {
        this.speechEndedAtMs = Date.now();
        this.callbacks.onSpeechActivity?.(false, (raw.utterance_id as string | null) ?? null);
        break;
      }
      case 'partial_transcript': {
        const ev = raw as unknown as ServerPartialTranscriptEventV1;
        const now = Date.now();
        if (!this.speechStartedAtMs) this.speechStartedAtMs = now;
        this.callbacks.onStateChange('transcribing');
        this.callbacks.onPartialTranscript(ev);
        break;
      }
      case 'final_transcript': {
        const ev = raw as unknown as ServerFinalTranscriptEventV1;
        const now = Date.now();
        if (!this.speechEndedAtMs) {
          this.speechEndedAtMs =
            typeof ev.latency_ms === 'number' && ev.latency_ms >= 0
              ? now - ev.latency_ms
              : now;
        }
        this.lastSttFinalizationMs = Math.max(0, Math.round(now - this.speechEndedAtMs));
        this.callbacks.onFinalTranscript(ev);
        this.callbacks.onStateChange('processing');
        break;
      }
      case 'assistant_response': {
        const turnId = Number(raw.turn_id || 1);
        this.llmFirstTokenAtMs = Date.now();
        this.callbacks.onStateChange('responding');
        this.callbacks.onAssistantResponse(
          String(raw.text || ''),
          turnId,
          Boolean(raw.is_danger_escalation),
          String(raw.language || this.language)
        );
        break;
      }
      case 'tts_start': {
        const turnId = Number(raw.turn_id || 1);
        if (turnId < this.minPlayableTurnId || this.cancelledTurnIds.has(turnId)) {
          return;
        }
        if (turnId > this.activeTurnId) {
          this.activeTurnId = turnId;
        }
        this.turnPcmChunks.set(turnId, []);
        this.isPlaybackPaused = false;
        this.isPlayingAudio = true;
        this.localBargeInSentTurnId = -1;
        this.callbacks.onStateChange('speaking', 'speaking');
        this.callbacks.onTtsPlaybackChange?.(true, false, turnId);
        break;
      }
      case 'tts_audio_chunk': {
        const turnId = Number(raw.turn_id || 0);
        if (
          turnId < this.minPlayableTurnId ||
          this.cancelledTurnIds.has(turnId) ||
          turnId !== this.activeTurnId
        ) {
          // Zero-stale-audio rule: discard stale chunks synchronously
          this.audioDiag.staleChunksDiscarded += 1;
          return;
        }
        const seq = Number(raw.seq || 1);
        if (seq === 1) {
          this.ttsFirstChunkAtMs = Date.now();
          if (this.llmFirstTokenAtMs > 0) {
            this.lastTtsFirstChunkMs = Math.max(
              0,
              Math.round(this.ttsFirstChunkAtMs - this.llmFirstTokenAtMs)
            );
          }
        }
        const b64 = String(raw.audio_base64 || '');
        if (b64) {
          const pcmChunk = base64ToUint8Array(b64);
          const list = this.turnPcmChunks.get(turnId) || [];
          list.push(pcmChunk);
          this.turnPcmChunks.set(turnId, list);
        }
        break;
      }
      case 'tts_complete': {
        const turnId = Number(raw.turn_id || this.activeTurnId);
        if (turnId < this.minPlayableTurnId || this.cancelledTurnIds.has(turnId)) {
          this.turnPcmChunks.delete(turnId);
          return;
        }
        const chunks = this.turnPcmChunks.get(turnId) || [];
        this.turnPcmChunks.delete(turnId);
        if (chunks.length > 0) {
          const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const c of chunks) {
            merged.set(c, offset);
            offset += c.byteLength;
          }
          this.enqueueTurnWavPlayback(turnId, merged);
        } else {
          this.isPlayingAudio = false;
          this.callbacks.onTtsPlaybackChange?.(false, false, turnId);
          this.callbacks.onStateChange('listening', 'listening');
        }
        break;
      }
      case 'barge_in': {
        const ev = raw as unknown as ServerBargeInEventV1;
        this.cancelledTurnIds.add(ev.cancelled_turn_id);
        this.turnPcmChunks.delete(ev.cancelled_turn_id);
        this.minPlayableTurnId = Math.max(this.minPlayableTurnId, ev.new_turn_id);
        this.activeTurnId = Math.max(this.activeTurnId, ev.new_turn_id);
        this.flushAudioPlayback();
        this.callbacks.onTtsPlaybackChange?.(false, false, ev.cancelled_turn_id);
        this.callbacks.onBargeIn?.(ev);
        this.callbacks.onStateChange('interrupted');
        break;
      }
      case 'tts_cancelled': {
        const cancelledTurnId = Number(raw.cancelled_turn_id || 0);
        this.cancelledTurnIds.add(cancelledTurnId);
        this.turnPcmChunks.delete(cancelledTurnId);
        const nextAllowed = cancelledTurnId + 1;
        this.minPlayableTurnId = Math.max(this.minPlayableTurnId, nextAllowed);
        if (this.activeTurnId <= cancelledTurnId) {
          this.activeTurnId = nextAllowed;
        }
        this.flushAudioPlayback();
        this.callbacks.onTtsPlaybackChange?.(false, false, cancelledTurnId);
        this.callbacks.onStateChange('interrupted');
        break;
      }
      case 'visit_draft_updated': {
        this.callbacks.onVisitDraftUpdated(raw as unknown as ServerVisitDraftUpdatedEventV1);
        break;
      }
      case 'clarification_required': {
        this.callbacks.onClarificationRequired?.(
          raw as unknown as ServerClarificationRequiredEventV1
        );
        break;
      }
      case 'read_back_started': {
        this.callbacks.onReadBackStarted?.(raw as unknown as ServerReadBackStartedEventV1);
        break;
      }
      case 'correction_applied': {
        this.callbacks.onCorrectionApplied?.(raw as unknown as ServerCorrectionAppliedEventV1);
        break;
      }
      case 'visit_confirmed': {
        this.callbacks.onVisitConfirmed?.(raw as unknown as ServerVisitConfirmedEventV1);
        break;
      }
      case 'persistence_requested': {
        this.callbacks.onPersistenceRequested?.(
          raw as unknown as ServerPersistenceRequestedEventV1
        );
        break;
      }
      case 'visit_committed': {
        this.callbacks.onVisitCommitted?.(raw as unknown as ServerVisitCommittedEventV1);
        this.callbacks.onStateChange('completed', 'committed');
        break;
      }
      case 'persistence_rejected': {
        this.callbacks.onPersistenceRejected?.(raw as unknown as ServerPersistenceRejectedEventV1);
        break;
      }
      case 'danger_alert': {
        this.callbacks.onDangerAlert(raw as unknown as ServerDangerAlertEventV1);
        break;
      }
      case 'error': {
        const err = raw as unknown as ServerErrorEventV1;
        this.callbacks.onStateChange('error');
        this.callbacks.onError(err.code, err.message, err.retryable);
        break;
      }
      case 'pong':
      default:
        break;
    }
  }

  private enqueueTurnWavPlayback(turnId: number, pcmBytes: Uint8Array): void {
    if (turnId < this.minPlayableTurnId || this.cancelledTurnIds.has(turnId)) {
      this.audioDiag.staleChunksDiscarded += 1;
      return;
    }
    this.playbackQueue.push({ turnId, pcmBytes });
    if (!this.isProcessingPlaybackQueue) {
      void this.processPlaybackQueue();
    }
  }

  private async processPlaybackQueue(): Promise<void> {
    if (this.isProcessingPlaybackQueue) return;
    this.isProcessingPlaybackQueue = true;

    try {
      while (this.playbackQueue.length > 0 && !this.isClosing) {
        const item = this.playbackQueue.shift();
        if (!item) break;
        if (
          item.turnId < this.minPlayableTurnId ||
          this.cancelledTurnIds.has(item.turnId)
        ) {
          this.audioDiag.staleChunksDiscarded += 1;
          continue;
        }

        const wavBytes = buildWavFromPcm16Le(item.pcmBytes, TARGET_SAMPLE_RATE);
        const wavBase64 = uint8ArrayToBase64(wavBytes);
        const tempUri = `${FileSystem.cacheDirectory || ''}sakshya_tts_${item.turnId}_${Date.now()}.wav`;

        try {
          await FileSystem.writeAsStringAsync(tempUri, wavBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (
            item.turnId < this.minPlayableTurnId ||
            this.cancelledTurnIds.has(item.turnId)
          ) {
            void FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
            continue;
          }

          await new Promise<void>((resolve) => {
            Audio.Sound.createAsync(
              { uri: tempUri },
              { shouldPlay: !this.isPlaybackPaused }
            )
              .then(({ sound }) => {
                if (
                  item.turnId < this.minPlayableTurnId ||
                  this.cancelledTurnIds.has(item.turnId)
                ) {
                  void sound.stopAsync().catch(() => {});
                  void sound.unloadAsync().catch(() => {});
                  resolve();
                  return;
                }

                this.activeSound = sound;
                this.isPlayingAudio = true;
                if (!this.recordedTurnPlaybacks.has(item.turnId)) {
                  this.recordedTurnPlaybacks.add(item.turnId);
                  this.recordFirstAudioPlayed(item.turnId);
                }

                sound.setOnPlaybackStatusUpdate((st) => {
                  if (!st.isLoaded) {
                    resolve();
                    return;
                  }
                  if (st.didJustFinish) {
                    void sound.unloadAsync().catch(() => {});
                    if (this.activeSound === sound) {
                      this.activeSound = null;
                    }
                    resolve();
                  }
                });
              })
              .catch(() => resolve());
          });
        } finally {
          void FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
        }
      }
    } finally {
      this.isProcessingPlaybackQueue = false;
      if (!this.isClosing && this.playbackQueue.length === 0) {
        this.isPlayingAudio = false;
        this.callbacks.onTtsPlaybackChange?.(false, false, this.activeTurnId);
        this.callbacks.onStateChange('listening', 'listening');
      }
    }
  }

  private recordFirstAudioPlayed(turnId: number): void {
    const audioFirstPlayedAtMs = Date.now();
    let turnTtfaMs: number | null = null;

    if (this.speechEndedAtMs > 0) {
      turnTtfaMs = Math.max(0, Math.round(audioFirstPlayedAtMs - this.speechEndedAtMs));
      this.ttfaSamplesMs.push(turnTtfaMs);
      this.speechStartedAtMs = 0;
      this.speechEndedAtMs = 0;
    } else if (this.greetingLatencyMs === null && this.sessionReadyAtMs > 0) {
      this.greetingLatencyMs = Math.max(
        0,
        Math.round(audioFirstPlayedAtMs - this.sessionReadyAtMs)
      );
    }

    const sorted = [...this.ttfaSamplesMs].sort((a, b) => a - b);
    const avg =
      sorted.length > 0
        ? Math.round(sorted.reduce((acc, v) => acc + v, 0) / sorted.length)
        : null;

    this.callbacks.onLatencyUpdate?.({
      lastTtfaMs:
        turnTtfaMs ??
        (this.ttfaSamplesMs.length > 0
          ? this.ttfaSamplesMs[this.ttfaSamplesMs.length - 1]
          : null),
      p50TtfaMs: computePercentile(sorted, 50),
      p95TtfaMs: computePercentile(sorted, 95),
      avgTtfaMs: avg,
      greetingLatencyMs: this.greetingLatencyMs,
      lastSttFinalizationMs: this.lastSttFinalizationMs,
      lastTtsFirstChunkMs: this.lastTtsFirstChunkMs,
      turnCount: this.ttfaSamplesMs.length,
    });

    if (this.sessionId) {
      fetch(
        `${getVoiceApiBaseUrl()}/api/v1/sessions/${encodeURIComponent(
          this.sessionId
        )}/metrics/client-playback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema_version: 'v1',
            turn_id: turnId,
            client_ttfa_ms: turnTtfaMs,
            audio_first_played_epoch_ms: audioFirstPlayedAtMs,
          }),
        }
      ).catch(() => {});
    }
  }

  flushAudioPlayback(): void {
    this.playbackQueue = [];
    this.turnPcmChunks.clear();
    if (this.activeSound) {
      const snd = this.activeSound;
      this.activeSound = null;
      void snd
        .stopAsync()
        .then(() => snd.unloadAsync())
        .catch(() => {});
    }
    this.isPlayingAudio = false;
    this.isPlaybackPaused = false;
  }

  async pausePlayback(): Promise<void> {
    if (this.activeSound && !this.isPlaybackPaused) {
      try {
        await this.activeSound.pauseAsync();
        this.isPlaybackPaused = true;
        this.callbacks.onTtsPlaybackChange?.(true, true, this.activeTurnId);
      } catch {
        // ignore
      }
    }
  }

  async resumePlayback(): Promise<void> {
    if (this.activeSound && this.isPlaybackPaused) {
      try {
        await this.activeSound.playAsync();
        this.isPlaybackPaused = false;
        this.callbacks.onTtsPlaybackChange?.(true, false, this.activeTurnId);
      } catch {
        // ignore
      }
    }
  }

  triggerBargeIn(reason = 'user_tap'): void {
    const t0 = Date.now();
    const cancelledTurn = this.activeTurnId;
    this.cancelledTurnIds.add(cancelledTurn);
    this.minPlayableTurnId = Math.max(this.minPlayableTurnId, cancelledTurn + 1);
    this.activeTurnId = this.minPlayableTurnId;
    this.flushAudioPlayback();
    const stopMs = Math.max(1, Date.now() - t0);
    this.audioDiag.localBargeInCount += 1;
    this.audioDiag.localPlaybackStopMs = stopMs;
    this.callbacks.onTtsPlaybackChange?.(false, false, cancelledTurn);
    this.callbacks.onAudioDiagnostics?.({ ...this.audioDiag });
    this.callbacks.onStateChange('interrupted');
    this.sendJson({
      schema_version: 'v1',
      type: 'barge_in',
      reason,
      client_timestamp: new Date().toISOString(),
    });
  }

  sendTextInput(text: string, language?: string): boolean {
    if (!text.trim()) return false;
    return this.sendJson({
      schema_version: 'v1',
      type: 'text_input',
      text: text.trim(),
      language: language || this.language,
    });
  }

  setLanguage(language: LanguageCode): void {
    this.language = language;
    this.sendJson({
      schema_version: 'v1',
      type: 'set_language',
      language,
    });
  }

  sendConfirmVisit(visitId: string, confirmed: boolean): boolean {
    return this.sendJson({
      schema_version: 'v1',
      type: 'confirm_visit',
      visit_id: visitId,
      confirmed,
      worker_id: this.workerId,
      confirmation_method: 'ui_button',
    });
  }

  sendPatchFields(fields: Record<string, unknown>): boolean {
    return this.sendJson({
      schema_version: 'v1',
      type: 'patch_fields',
      fields,
    });
  }

  sendRemoveObservation(key: string): boolean {
    return this.sendJson({
      schema_version: 'v1',
      type: 'remove_observation',
      key,
    });
  }

  sendRemoveEvent(name: string): boolean {
    return this.sendJson({
      schema_version: 'v1',
      type: 'remove_event',
      name,
    });
  }

  sendFinishNotes(): boolean {
    return this.sendJson({
      schema_version: 'v1',
      type: 'finish_notes',
    });
  }

  sendPersistenceAck(payload: {
    visitId: string;
    correlationId: string;
    accepted: boolean;
    persistenceRecordId?: string | null;
    committedAt?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): boolean {
    return this.sendJson({
      schema_version: 'v1',
      type: 'persistence_ack',
      visit_id: payload.visitId,
      correlation_id: payload.correlationId,
      accepted: payload.accepted,
      persistence_record_id: payload.persistenceRecordId ?? null,
      committed_at: payload.committedAt ?? null,
      error_code: payload.errorCode ?? null,
      error_message: payload.errorMessage ?? null,
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private sendJson(msg: ClientWebSocketEventV1): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  private async cleanupAudioOnly(): Promise<void> {
    this.flushAudioPlayback();
    this.isPreparingRecording = false;
    this.pendingStopAfterPrepare = false;
    if (this.nativeLevelSub) {
      this.nativeLevelSub.remove();
      this.nativeLevelSub = null;
    }
    if (this.nativePcmActive) {
      this.nativePcmActive = false;
      const nativePcm =
        Platform.OS === 'android' ? NativeModules.PcmAudioRecorder : undefined;
      try {
        await nativePcm?.stopRecording?.();
      } catch {
        // ignore
      }
    }
    if (this.recording) {
      const rec = this.recording;
      this.recording = null;
      try {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (uri) {
          void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }

  private closeSocketOnly(): void {
    if (this.wsConnectTimer) {
      clearTimeout(this.wsConnectTimer);
      this.wsConnectTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.sendJson({
            schema_version: 'v1',
            type: 'end_session',
            reason: 'client_stop',
          });
        }
        this.ws.close(1000, 'Session ended');
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  stopSession(): void {
    this.isClosing = true;
    this.closeSocketOnly();
    void this.cleanupAudioOnly();
    this.callbacks.onConnectionChange?.(false, false);
    this.callbacks.onStateChange('idle');
  }
}

export function mapBackendStateToUiState(state: BackendSessionStateV1): VoiceInteractionState {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'listening':
      return 'listening';
    case 'processing':
      return 'processing';
    case 'speaking':
    case 'read_back':
      return 'speaking';
    case 'danger_escalation':
      return 'responding';
    case 'awaiting_confirmation':
      return 'listening';
    case 'committing':
      return 'processing';
    case 'committed':
    case 'closed':
      return 'completed';
    default:
      return 'idle';
  }
}

export type {
  VisitRecordV1,
  DangerAlertV1,
  ClarificationReasonV1,
  ClarificationCandidateV1,
};

