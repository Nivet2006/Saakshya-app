import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  FastForward,
  Keyboard,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Square,
  Volume2,
} from 'lucide-react-native';
import { GlassCard } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import type { AudioInputDeviceInfo, MicPermissionState } from '@/lib/voice/voice-client';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { TranscriptLine, VoiceInteractionState } from '@/types';

interface VoiceRecorderProps {
  interactionState: VoiceInteractionState;
  isConnected: boolean;
  handsFree: boolean;
  pttPressed: boolean;
  audioLevel: number;
  waveformBands: number[];
  durationSeconds: number;
  language: string;
  inputDevices: AudioInputDeviceInfo[];
  selectedDeviceId: string;
  micPermissionState?: MicPermissionState;
  isCorrectingMode?: boolean;
  targetCorrectionField?: string | null;
  onSelectDevice: (deviceId: string) => void;
  onToggleHandsFree: (handsFree: boolean) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPttDown: () => void;
  onPttUp: () => void;
  onBargeIn: () => void;
  onSendTextUtterance?: (text: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  interactionState,
  isConnected,
  handsFree,
  pttPressed,
  audioLevel,
  waveformBands,
  durationSeconds,
  language,
  micPermissionState = 'unknown',
  isCorrectingMode,
  targetCorrectionField,
  onToggleHandsFree,
  onStartRecording,
  onStopRecording,
  onPttDown,
  onPttUp,
  onBargeIn,
  onSendTextUtterance,
}) => {
  const { ui, t } = useTranslation(language);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [typedUtterance, setTypedUtterance] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(Boolean(enabled)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(Boolean(enabled));
    });
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.25);
      return;
    }

    if (interactionState === 'listening' || interactionState === 'transcribing') {
      const anim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.24,
              duration: 750,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1.0,
              duration: 750,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.55,
              duration: 750,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.15,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    }

    if (interactionState === 'idle') {
      // Subtle Apple-inspired breathing animation in Idle state
      const idleAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.06,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      idleAnim.start();
      return () => idleAnim.stop();
    }

    pulseScale.setValue(1);
    pulseOpacity.setValue(0.25);
  }, [interactionState, reduceMotion, pulseScale, pulseOpacity]);

  const stateLabels: Record<VoiceInteractionState, string> = {
    idle: ui.stateIdle,
    connecting: ui.stateConnecting,
    listening: ui.stateListening,
    transcribing: ui.stateTranscribing,
    processing: ui.stateProcessing,
    responding: ui.stateResponding,
    speaking: ui.stateSpeaking,
    interrupted: ui.stateInterrupted,
    reconnecting: ui.stateReconnecting,
    error: ui.stateError,
    completed: ui.stateCompleted,
  };

  const stateHelpers: Record<VoiceInteractionState, string> = {
    idle: ui.helperIdle,
    connecting: ui.helperConnecting,
    listening: ui.helperListening,
    transcribing: ui.helperTranscribing,
    processing: ui.helperProcessing,
    responding: ui.helperResponding,
    speaking: ui.helperSpeaking,
    interrupted: ui.helperInterrupted,
    reconnecting: ui.helperReconnecting,
    error: ui.helperError,
    completed: ui.helperCompleted,
  };

  const isSessionActive =
    isConnected ||
    [
      'connecting',
      'listening',
      'transcribing',
      'processing',
      'responding',
      'speaking',
      'interrupted',
    ].includes(interactionState);

  const mins = String(Math.floor(durationSeconds / 60)).padStart(2, '0');
  const secs = String(durationSeconds % 60).padStart(2, '0');

  const getStateBadgeTheme = (st: VoiceInteractionState) => {
    switch (st) {
      case 'listening':
      case 'transcribing':
        return {
          bg: ClinicalColors.successSoft,
          border: ClinicalColors.successContainer,
          text: ClinicalColors.successDark,
        };
      case 'processing':
      case 'connecting':
      case 'reconnecting':
      case 'interrupted':
        return {
          bg: ClinicalColors.warningSoft,
          border: ClinicalColors.warningContainer,
          text: ClinicalColors.warningDark,
        };
      case 'speaking':
      case 'responding':
        return {
          bg: ClinicalColors.secondarySoft,
          border: ClinicalColors.secondaryContainer,
          text: ClinicalColors.secondaryDark,
        };
      case 'error':
        return {
          bg: ClinicalColors.dangerSoft,
          border: ClinicalColors.danger,
          text: ClinicalColors.dangerDark,
        };
      case 'completed':
        return {
          bg: ClinicalColors.successSoft,
          border: ClinicalColors.success,
          text: ClinicalColors.successDark,
        };
      default:
        return {
          bg: ClinicalColors.slate100,
          border: ClinicalColors.border,
          text: ClinicalColors.textSecondary,
        };
    }
  };

  const badgeTheme = getStateBadgeTheme(interactionState);

  const handleTextSubmit = () => {
    if (!typedUtterance.trim() || !onSendTextUtterance) return;
    onSendTextUtterance(typedUtterance.trim());
    setTypedUtterance('');
  };

  return (
    <GlassCard padding="lg">
      {/* Header Status Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ui.step3Title}</Text>
          <Text style={styles.subtitle}>{ui.step3Subtitle}</Text>
        </View>

        <View style={styles.statusCluster}>
          <View
            style={[
              styles.connPill,
              {
                backgroundColor: isConnected
                  ? ClinicalColors.successSoft
                  : ClinicalColors.slate100,
                borderColor: isConnected
                  ? ClinicalColors.successContainer
                  : ClinicalColors.border,
              },
            ]}
          >
            <Radio
              size={13}
              color={isConnected ? ClinicalColors.successDark : ClinicalColors.textSecondary}
            />
            <Text
              style={[
                styles.connPillText,
                {
                  color: isConnected
                    ? ClinicalColors.successDark
                    : ClinicalColors.textSecondary,
                },
              ]}
            >
              {isConnected ? `${ui.connectedLabel} (${language})` : ui.disconnectedLabel}
            </Text>
          </View>

          {isSessionActive && (
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>
                {mins}:{secs}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Microphone Permission Denied / Permanently Denied Recovery Banner */}
      {(micPermissionState === 'denied' || micPermissionState === 'permanently_denied') && (
        <View accessibilityRole="alert" style={styles.permBanner}>
          <AlertCircle size={18} color={ClinicalColors.dangerDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.permTitle}>{t.permissionDeniedStatus}</Text>
            <Text style={styles.permDesc}>
              {micPermissionState === 'permanently_denied'
                ? 'Microphone access is disabled in system settings. Open Settings to allow microphone capture, or use Type to Backend below.'
                : 'Microphone permission is required for live voice capture.'}
            </Text>
          </View>
          {micPermissionState === 'permanently_denied' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open System Settings"
              onPress={() => void Linking.openSettings().catch(() => {})}
              style={styles.permBtn}
            >
              <Settings size={14} color={ClinicalColors.dangerDark} />
              <Text style={styles.permBtnText}>Settings</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Voice Correction Prompt Banner */}
      {isCorrectingMode && (
        <View style={styles.correctionBanner}>
          <Mic size={16} color={ClinicalColors.indigoDark} />
          <Text style={styles.correctionBannerText}>
            {ui.voiceCorrectionActive}
            {targetCorrectionField ? ` (${targetCorrectionField})` : ''}: {ui.voiceCorrectionHint}
          </Text>
        </View>
      )}

      {/* Central Hero Microphone Control + 6 Distinct Visual States */}
      <View style={styles.centerStage}>
        {/* Explicit State Badge (Text + Icon + Color) */}
        <View
          style={[
            styles.statePill,
            {
              backgroundColor: badgeTheme.bg,
              borderColor: badgeTheme.border,
            },
          ]}
        >
          {(interactionState === 'connecting' ||
            interactionState === 'processing' ||
            interactionState === 'reconnecting') && (
            <ActivityIndicator size="small" color={badgeTheme.text} />
          )}
          {interactionState === 'speaking' && (
            <Volume2 size={14} color={badgeTheme.text} />
          )}
          {interactionState === 'error' && (
            <AlertCircle size={14} color={badgeTheme.text} />
          )}
          {interactionState === 'completed' && (
            <CheckCircle2 size={14} color={badgeTheme.text} />
          )}
          {(interactionState === 'listening' || interactionState === 'transcribing') && (
            <Mic size={14} color={badgeTheme.text} />
          )}
          <Text style={[styles.statePillText, { color: badgeTheme.text }]}>
            {stateLabels[interactionState]}
          </Text>
        </View>

        {/* Hero Microphone Interaction Element */}
        {!isSessionActive ? (
          <Animated.View style={{ transform: [{ scale: pulseScale }], width: '100%' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={handsFree ? ui.startRecording : ui.holdToSpeak}
              onPress={handsFree ? onStartRecording : undefined}
              onPressIn={!handsFree ? onPttDown : undefined}
              onPressOut={!handsFree ? onPttUp : undefined}
              style={[
                styles.startHeroBtn,
                !handsFree && pttPressed && { backgroundColor: ClinicalColors.danger },
                interactionState === 'error' && { backgroundColor: ClinicalColors.danger },
                interactionState === 'completed' && { backgroundColor: ClinicalColors.success },
              ]}
            >
              <View style={styles.startHeroIconCircle}>
                {interactionState === 'error' ? (
                  <AlertCircle size={26} color={ClinicalColors.white} />
                ) : interactionState === 'completed' ? (
                  <CheckCircle2 size={26} color={ClinicalColors.white} />
                ) : (
                  <Mic size={26} color={ClinicalColors.white} />
                )}
              </View>
              <Text style={styles.startHeroBtnText}>
                {handsFree
                  ? ui.startRecording
                  : pttPressed
                  ? ui.speakingShortLabel
                  : ui.holdToSpeak}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.activeControlsCol}>
            <View style={styles.activeOrbRow}>
              {handsFree ? (
                <View style={styles.orbWrap}>
                  <Animated.View
                    style={[
                      styles.orbPulseRing,
                      {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                        backgroundColor:
                          interactionState === 'speaking'
                            ? ClinicalColors.secondary
                            : interactionState === 'processing'
                            ? ClinicalColors.warning
                            : ClinicalColors.danger,
                      },
                    ]}
                  />
                  <View
                    accessibilityLabel="Live microphone active"
                    style={[
                      styles.heroMicOrb,
                      {
                        backgroundColor:
                          interactionState === 'speaking'
                            ? ClinicalColors.secondary
                            : interactionState === 'processing'
                            ? ClinicalColors.warning
                            : interactionState === 'error'
                            ? ClinicalColors.dangerDark
                            : ClinicalColors.danger,
                      },
                    ]}
                  >
                    {interactionState === 'speaking' ? (
                      <Volume2 size={36} color={ClinicalColors.white} />
                    ) : interactionState === 'processing' ? (
                      <ActivityIndicator size="large" color={ClinicalColors.white} />
                    ) : (
                      <Mic size={36} color={ClinicalColors.white} />
                    )}
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={pttPressed ? ui.speakingShortLabel : ui.holdToSpeak}
                  accessibilityState={{ selected: pttPressed }}
                  onPressIn={onPttDown}
                  onPressOut={onPttUp}
                  style={[
                    styles.pttOrb,
                    pttPressed ? styles.pttOrbPressed : styles.pttOrbIdle,
                  ]}
                >
                  {pttPressed ? (
                    <Mic size={32} color={ClinicalColors.white} />
                  ) : (
                    <MicOff size={28} color={ClinicalColors.white} />
                  )}
                  <Text style={styles.pttLabelText}>
                    {pttPressed ? ui.speakingShortLabel : ui.holdToSpeak}
                  </Text>
                </Pressable>
              )}

              {/* Barge-In / Interrupt Button when Assistant is Speaking */}
              {interactionState === 'speaking' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ui.bargeInInterrupt}
                  onPress={onBargeIn}
                  style={styles.bargeInBtn}
                >
                  <FastForward size={16} color={ClinicalColors.slate900} />
                  <Text style={styles.bargeInBtnText}>{ui.bargeInInterrupt}</Text>
                </Pressable>
              )}

              {/* Stop Recording Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ui.stopRecording}
                onPress={onStopRecording}
                style={styles.stopBtn}
              >
                <Square size={15} color={ClinicalColors.text} />
                <Text style={styles.stopBtnText}>{ui.stopRecording}</Text>
              </Pressable>
            </View>

            {/* Real 16-Band Audio Waveform Visualizer */}
            <View style={styles.waveformBox}>
              {waveformBands.map((band, idx) => {
                const heightPct = isConnected
                  ? Math.max(14, Math.min(94, Math.round((band * 0.7 + audioLevel * 0.3) * 100)))
                  : 12;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.waveBar,
                      {
                        height: `${heightPct}%`,
                        backgroundColor:
                          audioLevel > 0.08
                            ? ClinicalColors.primary
                            : ClinicalColors.border,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.helperText}>{stateHelpers[interactionState]}</Text>
      </View>

      {/* Bottom Toolbar: Hands-Free vs Push-to-Talk & Type-to-Backend */}
      <View style={styles.toolbarRow}>
        <View style={styles.micModeGroup}>
          <Text style={styles.micModeLabel}>{ui.micModeLabel}:</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: handsFree }}
              onPress={() => onToggleHandsFree(true)}
              style={[styles.segmentBtn, handsFree && styles.segmentBtnActive]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  handsFree && styles.segmentBtnTextActive,
                ]}
              >
                {ui.handsFreeLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !handsFree }}
              onPress={() => onToggleHandsFree(false)}
              style={[styles.segmentBtn, !handsFree && styles.segmentBtnActive]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  !handsFree && styles.segmentBtnTextActive,
                ]}
              >
                {ui.pushToTalkLabel}
              </Text>
            </Pressable>
          </View>
        </View>

        {onSendTextUtterance && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.typeToBackend}
            onPress={() => setShowTextFallback(!showTextFallback)}
            style={styles.typeToggleBtn}
          >
            <Keyboard size={14} color={ClinicalColors.textSecondary} />
            <Text style={styles.typeToggleText}>{ui.typeToBackend}</Text>
          </Pressable>
        )}
      </View>

      {/* Direct Text Input to Agent 1 WebSocket Pipeline */}
      {showTextFallback && onSendTextUtterance && (
        <View style={styles.textFallbackRow}>
          <TextInput
            accessibilityLabel={ui.typeToBackend}
            editable={isConnected}
            value={typedUtterance}
            onChangeText={setTypedUtterance}
            placeholder={
              isConnected ? ui.typeUtterancePlaceholder : ui.startSessionToTypePlaceholder
            }
            placeholderTextColor={ClinicalColors.textMuted}
            onSubmitEditing={handleTextSubmit}
            style={[styles.textFallbackInput, !isConnected && { opacity: 0.6 }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.sendText}
            disabled={!isConnected || !typedUtterance.trim()}
            onPress={handleTextSubmit}
            style={[
              styles.sendTextBtn,
              (!isConnected || !typedUtterance.trim()) && { opacity: 0.45 },
            ]}
          >
            <Send size={14} color={ClinicalColors.white} />
            <Text style={styles.sendTextBtnLabel}>{ui.sendText}</Text>
          </Pressable>
        </View>
      )}
    </GlassCard>
  );
};

export const LiveTranscript: React.FC<{
  history: TranscriptLine[];
  partialStable: string;
  partialVolatile: string;
  language: string;
}> = ({ history, partialStable, partialVolatile, language }) => {
  const { ui } = useTranslation(language);

  return (
    <GlassCard>
      <View style={styles.transcriptHeader}>
        <Text style={styles.transcriptTitle}>{ui.liveTranscriptHeading}</Text>
        <View style={styles.langTag}>
          <Text style={styles.langTagText}>{language}</Text>
        </View>
      </View>

      <View style={{ gap: Spacing.sm }}>
        {history.length === 0 && !partialStable && !partialVolatile && (
          <Text style={styles.transcriptEmpty}>{ui.liveTranscriptPlaceholder}</Text>
        )}

        {history.map((line) => {
          const isAsha = line.role === 'asha';
          const isDanger = line.role === 'danger';
          return (
            <View
              key={line.id}
              style={[
                styles.transcriptBubble,
                isDanger
                  ? styles.bubbleDanger
                  : isAsha
                  ? styles.bubbleAsha
                  : styles.bubbleAssistant,
              ]}
            >
              <View style={styles.bubbleMetaRow}>
                <Text
                  style={[
                    styles.bubbleRoleText,
                    {
                      color: isDanger
                        ? ClinicalColors.dangerDark
                        : isAsha
                        ? ClinicalColors.textSecondary
                        : ClinicalColors.primaryDark,
                    },
                  ]}
                >
                  {isDanger
                    ? ui.urgentReferralSpeechLabel
                    : isAsha
                    ? ui.ashaWorkerLabel
                    : ui.sakshyaAssistantLabel}
                </Text>
                {line.latency_ms !== undefined && line.latency_ms !== null && (
                  <Text style={styles.bubbleLatency}>{Math.round(line.latency_ms)}ms</Text>
                )}
              </View>
              <Text style={styles.bubbleBodyText}>{line.text}</Text>
            </View>
          );
        })}

        {/* Streaming Partial Transcription (Stable + Volatile) */}
        {(Boolean(partialStable) || Boolean(partialVolatile)) && (
          <View style={styles.partialBubble}>
            <Text style={styles.partialHeaderLabel}>{ui.listeningLiveLabel}</Text>
            <Text style={styles.bubbleBodyText}>
              {partialStable}
              {partialVolatile ? (
                <Text style={styles.volatileItalic}>
                  {partialStable ? ' ' : ''}
                  {partialVolatile}
                </Text>
              ) : null}
            </Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
};

export const ProcessingIndicator: React.FC<{ active: boolean; message?: string }> = ({
  active,
  message,
}) => {
  const { ui } = useTranslation();
  if (!active) return null;

  return (
    <View accessibilityRole="progressbar" style={styles.procBox}>
      <RefreshCw size={20} color={ClinicalColors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.procTitle}>{ui.processingVisitNotesTitle}</Text>
        <Text style={styles.procDesc}>{message || ui.processingVisitNotesDesc}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  statusCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  connPillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  timerBadge: {
    backgroundColor: ClinicalColors.slate900,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  timerText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
    fontVariant: ['tabular-nums'],
  },
  permBanner: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.dangerSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  permTitle: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  permDesc: {
    fontSize: Typography.xs,
    color: ClinicalColors.dangerDark,
    marginTop: 2,
    lineHeight: 16,
  },
  permBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.white,
    borderWidth: 1,
    borderColor: ClinicalColors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  permBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  correctionBanner: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.indigoSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.indigoBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  correctionBannerText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.indigoDark,
    flex: 1,
  },
  centerStage: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  statePillText: {
    fontSize: Typography.xs,
    fontWeight: '800',
  },
  startHeroBtn: {
    minHeight: 68,
    borderRadius: Radii.xxl,
    backgroundColor: ClinicalColors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    ...Shadows.elevated,
  },
  startHeroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startHeroBtnText: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  activeControlsCol: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
  },
  activeOrbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  orbWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbPulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  heroMicOrb: {
    width: TouchTargets.heroMic,
    height: TouchTargets.heroMic,
    borderRadius: TouchTargets.heroMic / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.dangerGlow,
  },
  pttOrb: {
    width: 98,
    height: 98,
    borderRadius: 49,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...Shadows.glassCard,
  },
  pttOrbPressed: {
    backgroundColor: ClinicalColors.danger,
  },
  pttOrbIdle: {
    backgroundColor: ClinicalColors.slate800,
  },
  pttLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  bargeInBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bargeInBtnText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.slate900,
  },
  stopBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.slate100,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopBtnText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  waveformBox: {
    width: '100%',
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
  },
  helperText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  toolbarRow: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  micModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  micModeLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: ClinicalColors.slate100,
    padding: 3,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
  },
  segmentBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: ClinicalColors.white,
  },
  segmentBtnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  segmentBtnTextActive: {
    color: ClinicalColors.primary,
    fontWeight: '800',
  },
  typeToggleBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeToggleText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  textFallbackRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textFallbackInput: {
    flex: 1,
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sm,
    color: ClinicalColors.text,
  },
  sendTextBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sendTextBtnLabel: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  transcriptTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  langTag: {
    backgroundColor: ClinicalColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  langTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  transcriptEmpty: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  transcriptBubble: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: 4,
  },
  bubbleAsha: {
    backgroundColor: ClinicalColors.canvas,
    borderColor: ClinicalColors.borderSubtle,
    marginRight: Spacing.lg,
  },
  bubbleAssistant: {
    backgroundColor: ClinicalColors.glassTeal,
    borderColor: ClinicalColors.primaryContainer,
    marginLeft: Spacing.lg,
  },
  bubbleDanger: {
    backgroundColor: ClinicalColors.dangerSoft,
    borderColor: ClinicalColors.danger,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bubbleRoleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bubbleLatency: {
    fontSize: 11,
    color: ClinicalColors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  bubbleBodyText: {
    fontSize: Typography.sm,
    color: ClinicalColors.text,
    lineHeight: 20,
  },
  partialBubble: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ClinicalColors.secondary,
    backgroundColor: ClinicalColors.secondarySoft,
    gap: 4,
  },
  partialHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.secondaryDark,
    textTransform: 'uppercase',
  },
  volatileItalic: {
    color: ClinicalColors.secondaryDark,
    fontStyle: 'italic',
  },
  procBox: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.primarySoft,
    borderWidth: 1,
    borderColor: ClinicalColors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  procTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  procDesc: {
    fontSize: Typography.xs,
    color: ClinicalColors.primaryDark,
    marginTop: 2,
  },
});

