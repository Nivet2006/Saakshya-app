import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Clock, ShieldCheck, Volume2 } from 'lucide-react-native';
import type { NewPatientInput } from '@/components/asha/AddPatientModal';
import { BeneficiarySelector } from '@/components/voice/BeneficiarySelector';
import { LanguageSelector } from '@/components/voice/LanguageSelector';
import {
  VisitConfirmationActions,
  VisitSuccess,
  VisitSummaryCard,
} from '@/components/voice/VisitReviewShared';
import {
  LiveTranscript,
  ProcessingIndicator,
  VoiceRecorder,
} from '@/components/voice/VoiceRecorderAndTranscript';
import type { useVoiceVisitSession } from '@/hooks/useVoiceVisitSession';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { Beneficiary, LanguageCode } from '@/types';

interface BasicVisitViewProps {
  beneficiaries: Beneficiary[];
  recentBeneficiaryIds: string[];
  selectedBeneficiary: Beneficiary | null;
  onSelectBeneficiary: (ben: Beneficiary | null) => void;
  onAddBeneficiary?: (input: NewPatientInput) => Promise<Beneficiary>;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  voice: ReturnType<typeof useVoiceVisitSession>;
  onGoHome: () => void;
}

export const BasicVisitView: React.FC<BasicVisitViewProps> = ({
  beneficiaries,
  recentBeneficiaryIds,
  selectedBeneficiary,
  onSelectBeneficiary,
  onAddBeneficiary,
  language,
  onChangeLanguage,
  voice,
  onGoHome,
}) => {
  const { ui } = useTranslation(language);

  if (voice.committedResult) {
    return (
      <VisitSuccess
        savedVisit={voice.committedResult}
        onStartAnother={() => {
          voice.resetSessionState();
          onSelectBeneficiary(null);
        }}
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Step 1: Minimal Patient Selection */}
      <BeneficiarySelector
        beneficiaries={beneficiaries}
        selectedBeneficiary={selectedBeneficiary}
        recentBeneficiaryIds={recentBeneficiaryIds}
        onSelect={onSelectBeneficiary}
        onAddBeneficiary={onAddBeneficiary}
        currentLanguage={language}
        ambiguousCandidates={
          voice.clarification?.reason === 'ambiguous_beneficiary'
            ? voice.clarification.candidates
            : undefined
        }
        onSelectCandidate={(cand) => voice.sendClarificationSelection(cand)}
        disabled={voice.isConnected}
      />

      {/* Step 2: Language Selection */}
      <LanguageSelector selectedLanguage={language} onChange={onChangeLanguage} />

      {/* Voice Beneficiary Verification & Live TTFA Performance Status */}
      {(voice.isConnected || voice.identityVerificationStatus !== 'idle') && (
        <View
          style={[
            styles.identityBanner,
            voice.identityVerificationStatus === 'verified'
              ? styles.identityVerified
              : voice.identityVerificationStatus === 'correcting'
              ? styles.identityCorrecting
              : styles.identityChecking,
          ]}
        >
          <View style={styles.identityRow}>
            {voice.identityVerificationStatus === 'verified' ? (
              <ShieldCheck size={18} color={ClinicalColors.successDark} />
            ) : voice.identityVerificationStatus === 'correcting' ? (
              <AlertCircle size={18} color={ClinicalColors.warningDark} />
            ) : (
              <Volume2 size={18} color={ClinicalColors.secondaryDark} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.identityTitle}>
                {voice.identityVerificationStatus === 'verified'
                  ? ui.identityVerifiedVoice
                  : voice.identityVerificationStatus === 'candidate_confirmation'
                  ? ui.identityCandidatePrompt
                  : voice.identityVerificationStatus === 'correcting'
                  ? ui.identityCorrectionPrompt
                  : ui.identityCheckPrompt}
              </Text>
              {(voice.visitDraft?.beneficiary_id || selectedBeneficiary?.beneficiary_id) && (
                <Text style={styles.identityPatientTag}>
                  {voice.visitDraft?.beneficiary_name || selectedBeneficiary?.full_name} (
                  {voice.visitDraft?.beneficiary_id || selectedBeneficiary?.beneficiary_id})
                </Text>
              )}
              {(voice.verificationPrompt || voice.assistantText) && (
                <Text style={styles.identityPromptText}>
                  {voice.verificationPrompt || voice.assistantText}
                </Text>
              )}
            </View>
          </View>

          {voice.latencyMetrics && (
            <View style={styles.ttfaChip}>
              <Clock size={12} color={ClinicalColors.primary} />
              <Text style={styles.ttfaText}>
                {voice.latencyMetrics.lastTtfaMs !== null
                  ? `TTFA: ${voice.latencyMetrics.lastTtfaMs}ms (P50: ${
                      voice.latencyMetrics.p50TtfaMs ?? '-'
                    }ms)`
                  : voice.latencyMetrics.greetingLatencyMs !== null
                  ? `Greeting: ${voice.latencyMetrics.greetingLatencyMs}ms`
                  : 'Measuring TTFA...'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Step 3: Voice Interaction Screen (Prominent Liquid-Glass Mic + Live Transcript) */}
      <VoiceRecorder
        interactionState={voice.interactionState}
        isConnected={voice.isConnected}
        handsFree={voice.handsFree}
        pttPressed={voice.pttPressed}
        audioLevel={voice.audioLevel}
        waveformBands={voice.waveformBands}
        durationSeconds={voice.durationSeconds}
        language={language}
        inputDevices={voice.inputDevices}
        selectedDeviceId={voice.selectedDeviceId}
        micPermissionState={voice.micPermissionState}
        isCorrectingMode={voice.isCorrectingMode}
        targetCorrectionField={voice.targetCorrectionField}
        onSelectDevice={voice.setSelectedDeviceId}
        onToggleHandsFree={voice.toggleHandsFree}
        onStartRecording={voice.startVoiceSession}
        onStopRecording={voice.stopRecordingSession}
        onPttDown={voice.handlePttDown}
        onPttUp={voice.handlePttUp}
        onBargeIn={voice.triggerBargeIn}
        onSendTextUtterance={voice.submitVoiceTextInput}
      />

      {(voice.transcriptHistory.length > 0 ||
        Boolean(voice.partialStable) ||
        Boolean(voice.partialVolatile)) && (
        <LiveTranscript
          history={voice.transcriptHistory}
          partialStable={voice.partialStable}
          partialVolatile={voice.partialVolatile}
          language={language}
        />
      )}

      {/* Step 4: Processing Indicator */}
      <ProcessingIndicator active={voice.interactionState === 'processing'} />

      {/* Step 5: Read-Back Summary & Selective Voice Corrections */}
      {voice.visitDraft && (
        <>
          <VisitSummaryCard
            draft={voice.visitDraft}
            isTtsPlaying={voice.isTtsPlaying}
            isTtsPaused={voice.isTtsPaused}
            requiresReReadBack={voice.requiresReReadBack}
            summaryOutdated={voice.summaryOutdated}
            activeCorrectionField={voice.targetCorrectionField}
            onPausePlayback={voice.pauseReadBack}
            onResumePlayback={voice.resumeReadBack}
            onVoiceCorrectField={(fieldKey) => voice.startVoiceCorrection(fieldKey)}
            onVisualPatchFields={voice.patchFieldsVisually}
            onRemoveObservation={voice.removeObservationVisually}
            onRemoveEvent={voice.removeEventVisually}
            onSpeakToMakeChanges={voice.speakToMakeChanges}
          />

          {voice.reviewPhase === 'ask_readback' && (
            <View style={styles.readbackPrefCard}>
              <Text style={styles.readbackPrefTitle}>{ui.readbackPrefPrompt}</Text>
              <View style={styles.readbackPrefButtons}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => voice.respondReadbackPreference(true)}
                  style={styles.prefPrimaryBtn}
                >
                  <Text style={styles.prefPrimaryText}>{ui.yesReadSummaryBtn}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => voice.respondReadbackPreference(false)}
                  style={styles.prefSecondaryBtn}
                >
                  <Text style={styles.prefSecondaryText}>{ui.noSkipSubmissionBtn}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={voice.speakToMakeChanges}
                  style={styles.prefAmberBtn}
                >
                  <Text style={styles.prefAmberText}>{ui.speakMoreChangesBtn}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {voice.reviewPhase === 'editing' && voice.isConnected && (
            <View style={styles.finishNotesBar}>
              <Text style={styles.finishNotesText}>{ui.finishNotesAndReviewPrompt}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={voice.finishNotesAndReview}
                style={styles.finishNotesBtn}
              >
                <Text style={styles.finishNotesBtnText}>{ui.finishAndReviewBtn}</Text>
              </Pressable>
            </View>
          )}

          {voice.reviewPhase === 'draft_retained' && (
            <View style={styles.draftRetainedBox}>
              <Text style={styles.draftRetainedText}>{ui.draftRetainedNotice}</Text>
            </View>
          )}

          {/* Step 6: Explicit Confirmation & Save Gate */}
          <VisitConfirmationActions
            draft={voice.visitDraft}
            isSaving={voice.isPersistencePending}
            requiresReReadBack={voice.requiresReReadBack}
            onAcceptAndSave={voice.confirmAndSaveVisit}
            onRejectAndCorrect={voice.speakToMakeChanges}
            onDiscardAndRerecord={voice.resetSessionState}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  identityBanner: {
    borderRadius: Radii.lg,
    borderWidth: 2,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  identityVerified: {
    backgroundColor: ClinicalColors.successSoft,
    borderColor: ClinicalColors.success,
  },
  identityCorrecting: {
    backgroundColor: ClinicalColors.warningSoft,
    borderColor: ClinicalColors.warning,
  },
  identityChecking: {
    backgroundColor: ClinicalColors.secondarySoft,
    borderColor: ClinicalColors.secondary,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  identityTitle: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  identityPatientTag: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
    marginTop: 2,
  },
  identityPromptText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  ttfaChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ClinicalColors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
  },
  ttfaText: {
    fontSize: 11,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  readbackPrefCard: {
    backgroundColor: ClinicalColors.secondarySoft,
    borderWidth: 2,
    borderColor: ClinicalColors.secondary,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  readbackPrefTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.secondaryDark,
  },
  readbackPrefButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  prefPrimaryBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    justifyContent: 'center',
  },
  prefPrimaryText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  prefSecondaryBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.white,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    justifyContent: 'center',
  },
  prefSecondaryText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  prefAmberBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.warningContainer,
    borderWidth: 1,
    borderColor: ClinicalColors.warning,
    justifyContent: 'center',
  },
  prefAmberText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
  finishNotesBar: {
    backgroundColor: ClinicalColors.canvas,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  finishNotesText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
    flex: 1,
  },
  finishNotesBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.slate900,
    justifyContent: 'center',
  },
  finishNotesBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  draftRetainedBox: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.warningSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.warning,
  },
  draftRetainedText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.warningDark,
  },
});
