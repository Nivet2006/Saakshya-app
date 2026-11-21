import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Baby,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Plus,
  ShieldCheck,
  Syringe,
} from 'lucide-react-native';
import type { NewPatientInput } from '@/components/asha/AddPatientModal';
import { FieldStatusPill, GlassCard } from '@/components/ui/ClinicalUI';
import { BeneficiarySelector } from '@/components/voice/BeneficiarySelector';
import { LanguageSelector } from '@/components/voice/LanguageSelector';
import {
  FieldConfirmation,
  SpokenDescription,
  VisitConfirmationActions,
  VisitSuccess,
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
import type { Beneficiary, LanguageCode, VisitDraft } from '@/types';

interface AdvancedVisitViewProps {
  beneficiaries: Beneficiary[];
  recentBeneficiaryIds: string[];
  selectedBeneficiary: Beneficiary | null;
  onSelectBeneficiary: (ben: Beneficiary | null) => void;
  onAddBeneficiary?: (input: NewPatientInput) => Promise<Beneficiary>;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  voice: ReturnType<typeof useVoiceVisitSession>;
  onSwitchToBasic: () => void;
  onGoHome: () => void;
}

export const AdvancedVisitView: React.FC<AdvancedVisitViewProps> = ({
  beneficiaries,
  recentBeneficiaryIds,
  selectedBeneficiary,
  onSelectBeneficiary,
  onAddBeneficiary,
  language,
  onChangeLanguage,
  voice,
  onSwitchToBasic,
  onGoHome,
}) => {
  const { ui } = useTranslation(language);

  // Mobile-optimized expandable clinical sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    beneficiary: true,
    vitals: true,
    immunisation: true,
    danger: true,
    followup: true,
    readback: true,
  });

  // Inline manual data-entry states for Advanced Mode
  const [weightInput, setWeightInput] = useState('');
  const [editingWeight, setEditingWeight] = useState(false);
  const [nextVisitInput, setNextVisitInput] = useState('');
  const [editingNextVisit, setEditingNextVisit] = useState(false);
  const [vaccineInput, setVaccineInput] = useState('');

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

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Ensure Advanced Mode can also initialize a manual draft if worker types before speaking
  const ensureManualDraft = (patch: Record<string, unknown>) => {
    if (voice.visitDraft) {
      voice.patchFieldsVisually(patch);
      return;
    }
    // If no voice session started yet, start or patch via voice hook
    voice.patchFieldsVisually(patch);
  };

  const draft: VisitDraft | null = voice.visitDraft;
  const statuses = draft?.field_statuses || {};
  const hasUnresolved = Object.values(statuses).some((s) => s === 'needs_clarification');

  const isMaternal =
    draft?.visit_type === 'ANC' ||
    draft?.visit_type === 'PNC' ||
    selectedBeneficiary?.category === 'PREGNANT_WOMAN' ||
    selectedBeneficiary?.category === 'LACTATING_MOTHER';

  const isNewborn =
    draft?.visit_type === 'Newborn' || selectedBeneficiary?.category === 'INFANT';

  return (
    <View style={styles.container}>
      {/* Patient & Language Selection */}
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

      <LanguageSelector selectedLanguage={language} onChange={onChangeLanguage} />

      {/* Voice Recorder + Text Entry */}
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

      <ProcessingIndicator active={voice.interactionState === 'processing'} />

      {/* Live Full Transcription */}
      <LiveTranscript
        history={voice.transcriptHistory}
        partialStable={voice.partialStable}
        partialVolatile={voice.partialVolatile}
        language={language}
      />

      {/* Detailed Multi-Section Mobile Clinical Review & Data Entry Cards */}
      {draft && (
        <View style={styles.sectionsWrap}>
          <View style={styles.reviewHeaderRow}>
            <Text style={styles.reviewHeadingText}>{ui.reviewCardTitle}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onSwitchToBasic}
              style={styles.switchBasicBtn}
            >
              <ArrowLeft size={14} color={ClinicalColors.primary} />
              <Text style={styles.switchBasicText}>{ui.basicModeTitle}</Text>
            </Pressable>
          </View>

          {/* Section 1 — Beneficiary & Visit Type */}
          <GlassCard>
            <Pressable
              accessibilityRole="button"
              onPress={() => toggleSection('beneficiary')}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleGroup}>
                <Activity size={16} color={ClinicalColors.primary} />
                <Text style={styles.sectionTitleText}>
                  1. {ui.beneficiaryLabel} &amp; {ui.visitTypeLabel}
                </Text>
              </View>
              <View style={styles.sectionRightGroup}>
                <FieldStatusPill status={statuses.visit_type || 'extracted'} compact />
                {expandedSections.beneficiary ? (
                  <ChevronUp size={18} color={ClinicalColors.textSecondary} />
                ) : (
                  <ChevronDown size={18} color={ClinicalColors.textSecondary} />
                )}
              </View>
            </Pressable>

            {expandedSections.beneficiary && (
              <View style={styles.sectionBody}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.beneficiaryLabel}</Text>
                  <Text style={styles.kvValue}>
                    {draft.beneficiary_name || ui.notIdentified} (
                    {draft.beneficiary_id || ui.unlinkedLabel})
                  </Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.colDate}</Text>
                  <Text style={styles.kvValue}>
                    {new Date(draft.visit_date).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={[styles.kvLabel, { marginTop: 6 }]}>{ui.visitTypeLabel}:</Text>
                <View style={styles.visitTypeRow}>
                  {(['ANC', 'PNC', 'Newborn', 'Immunisation'] as const).map((vt) => {
                    const active = draft.visit_type === vt;
                    return (
                      <Pressable
                        key={vt}
                        accessibilityRole="button"
                        onPress={() => ensureManualDraft({ visit_type: vt })}
                        style={[styles.vtOption, active && styles.vtOptionActive]}
                      >
                        <Text
                          style={[
                            styles.vtOptionText,
                            active && { color: ClinicalColors.white },
                          ]}
                        >
                          {vt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <FieldConfirmation
                  fieldKey="visit_type"
                  label={ui.visitTypeLabel}
                  currentStatus={statuses.visit_type || 'extracted'}
                  onUpdateStatus={voice.patchFieldStatus}
                  onVoiceCorrect={(k) => voice.startVoiceCorrection(k)}
                />
              </View>
            )}
          </GlassCard>

          {/* Section 2/3 — Maternal (ANC/PNC) OR Newborn Vitals & Weight */}
          {(isMaternal || isNewborn || draft.weight_kg !== null) && (
            <GlassCard>
              <Pressable
                accessibilityRole="button"
                onPress={() => toggleSection('vitals')}
                style={styles.sectionHeader}
              >
                <View style={styles.sectionTitleGroup}>
                  {isNewborn ? (
                    <Baby size={16} color={ClinicalColors.secondary} />
                  ) : (
                    <ShieldCheck size={16} color={ClinicalColors.primary} />
                  )}
                  <Text style={styles.sectionTitleText}>
                    2. {isNewborn ? ui.infantFilter : `${ui.ancFilter} / ${ui.pncFilter}`}
                  </Text>
                </View>
                <View style={styles.sectionRightGroup}>
                  <FieldStatusPill status={statuses.weight_kg || 'extracted'} compact />
                  {expandedSections.vitals ? (
                    <ChevronUp size={18} color={ClinicalColors.textSecondary} />
                  ) : (
                    <ChevronDown size={18} color={ClinicalColors.textSecondary} />
                  )}
                </View>
              </Pressable>

              {expandedSections.vitals && (
                <View style={styles.sectionBody}>
                  <View style={styles.kvRow}>
                    <Text style={styles.kvLabel}>{ui.weightLabel}</Text>
                    <View style={styles.inlineValueAction}>
                      <Text style={styles.kvValue}>
                        {draft.weight_kg !== null ? `${draft.weight_kg} kg` : ui.notIdentified}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setWeightInput(
                            draft.weight_kg !== null ? String(draft.weight_kg) : ''
                          );
                          setEditingWeight(!editingWeight);
                        }}
                        style={styles.miniEditBtn}
                      >
                        <Edit3 size={12} color={ClinicalColors.primary} />
                        <Text style={styles.miniEditText}>{ui.editLabel}</Text>
                      </Pressable>
                    </View>
                  </View>

                  {editingWeight && (
                    <View style={styles.inlineEditRow}>
                      <TextInput
                        accessibilityLabel={ui.weightLabel}
                        keyboardType="decimal-pad"
                        value={weightInput}
                        onChangeText={setWeightInput}
                        placeholder="e.g. 54.5 or 2.8"
                        placeholderTextColor={ClinicalColors.textMuted}
                        style={styles.inlineInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          const parsed = parseFloat(weightInput);
                          ensureManualDraft({
                            weight_kg: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                          });
                          setEditingWeight(false);
                        }}
                        style={styles.inlineSaveBtn}
                      >
                        <Text style={styles.inlineSaveText}>{ui.saveLabel}</Text>
                      </Pressable>
                    </View>
                  )}

                  {draft.weight_source_text && (
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>{ui.fromSpeechLabel}</Text>
                      <Text style={styles.kvMuted}>{draft.weight_source_text}</Text>
                    </View>
                  )}

                  {selectedBeneficiary?.edd_date && (
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>{ui.eddLabel}</Text>
                      <Text style={styles.kvValue}>{selectedBeneficiary.edd_date}</Text>
                    </View>
                  )}

                  <FieldConfirmation
                    fieldKey="weight_kg"
                    label={ui.weightLabel}
                    currentStatus={statuses.weight_kg || 'extracted'}
                    onUpdateStatus={voice.patchFieldStatus}
                    onVoiceCorrect={(k) => voice.startVoiceCorrection(k)}
                  />
                </View>
              )}
            </GlassCard>
          )}

          {/* Section 4 — Immunisation Completed & Due */}
          <GlassCard>
            <Pressable
              accessibilityRole="button"
              onPress={() => toggleSection('immunisation')}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleGroup}>
                <Syringe size={16} color={ClinicalColors.primary} />
                <Text style={styles.sectionTitleText}>3. {ui.vaccinesDue}</Text>
              </View>
              <View style={styles.sectionRightGroup}>
                <FieldStatusPill status={statuses.vaccinations_due || 'extracted'} compact />
                {expandedSections.immunisation ? (
                  <ChevronUp size={18} color={ClinicalColors.textSecondary} />
                ) : (
                  <ChevronDown size={18} color={ClinicalColors.textSecondary} />
                )}
              </View>
            </Pressable>

            {expandedSections.immunisation && (
              <View style={styles.sectionBody}>
                <Text style={styles.kvLabel}>{ui.vaccinationsCompleted}:</Text>
                {draft.vaccinations_completed.length > 0 ? (
                  <View style={styles.badgeWrap}>
                    {draft.vaccinations_completed.map((v) => (
                      <View key={v} style={styles.completedVacBadge}>
                        <Text style={styles.completedVacText}>{v}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.kvMuted}>{ui.noPendingVaccines}</Text>
                )}

                <Text style={[styles.kvLabel, { marginTop: 6 }]}>{ui.vaccinationsDue}:</Text>
                {draft.vaccinations_due.length > 0 ? (
                  <View style={styles.badgeWrap}>
                    {draft.vaccinations_due.map((v) => (
                      <View key={v} style={styles.dueVacBadge}>
                        <Text style={styles.dueVacText}>{v}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.kvMuted}>{ui.noScheduledVaccines}</Text>
                )}

                {/* Add due vaccine manually */}
                <View style={styles.inlineEditRow}>
                  <TextInput
                    accessibilityLabel="Add due vaccine"
                    value={vaccineInput}
                    onChangeText={setVaccineInput}
                    placeholder="Add vaccine (e.g. Td-2, OPV-1, BCG)"
                    placeholderTextColor={ClinicalColors.textMuted}
                    style={styles.inlineInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (!vaccineInput.trim()) return;
                      const nextDue = Array.from(
                        new Set([...draft.vaccinations_due, vaccineInput.trim()])
                      );
                      ensureManualDraft({ vaccinations_due: nextDue });
                      setVaccineInput('');
                    }}
                    style={styles.inlineSaveBtn}
                  >
                    <Plus size={14} color={ClinicalColors.white} />
                  </Pressable>
                </View>

                <FieldConfirmation
                  fieldKey="vaccinations_due"
                  label={ui.vaccinationsDue}
                  currentStatus={statuses.vaccinations_due || 'extracted'}
                  onUpdateStatus={voice.patchFieldStatus}
                  onVoiceCorrect={(k) => voice.startVoiceCorrection(k)}
                />
              </View>
            )}
          </GlassCard>

          {/* Section 5 — Danger Signs (Read-Only Backend Authority) */}
          <GlassCard>
            <Pressable
              accessibilityRole="button"
              onPress={() => toggleSection('danger')}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleGroup}>
                <AlertTriangle
                  size={16}
                  color={
                    draft.danger_sign_flagged
                      ? ClinicalColors.danger
                      : ClinicalColors.textSecondary
                  }
                />
                <Text style={styles.sectionTitleText}>4. {ui.dangerSignsLabel}</Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: draft.danger_sign_flagged
                      ? ClinicalColors.dangerContainer
                      : ClinicalColors.successSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    {
                      color: draft.danger_sign_flagged
                        ? ClinicalColors.dangerDark
                        : ClinicalColors.successDark,
                    },
                  ]}
                >
                  {draft.danger_sign_flagged ? ui.flaggedStatus : ui.clearStatus}
                </Text>
              </View>
            </Pressable>

            {expandedSections.danger && (
              <View style={styles.sectionBody}>
                <Text style={styles.kvMuted}>
                  {draft.danger_sign_flagged
                    ? ui.urgentPhcReferral
                    : ui.noDangerFlaggedSpeech}
                </Text>
                {draft.danger_signs.map((s) => (
                  <Text key={s} style={styles.dangerBullet}>
                    • {s}
                  </Text>
                ))}
              </View>
            )}
          </GlassCard>

          {/* Section 6 — Follow-up Actions & Next Visit Date */}
          <GlassCard>
            <Pressable
              accessibilityRole="button"
              onPress={() => toggleSection('followup')}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleGroup}>
                <CalendarCheck size={16} color={ClinicalColors.primary} />
                <Text style={styles.sectionTitleText}>5. {ui.pendingFollowUps}</Text>
              </View>
              {expandedSections.followup ? (
                <ChevronUp size={18} color={ClinicalColors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={ClinicalColors.textSecondary} />
              )}
            </Pressable>

            {expandedSections.followup && (
              <View style={styles.sectionBody}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.nextVisitDateLabel}</Text>
                  <View style={styles.inlineValueAction}>
                    <Text style={styles.kvValue}>
                      {draft.next_visit_date || ui.notIdentified}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setNextVisitInput(draft.next_visit_date || '');
                        setEditingNextVisit(!editingNextVisit);
                      }}
                      style={styles.miniEditBtn}
                    >
                      <Edit3 size={12} color={ClinicalColors.primary} />
                      <Text style={styles.miniEditText}>{ui.editLabel}</Text>
                    </Pressable>
                  </View>
                </View>

                {editingNextVisit && (
                  <View style={styles.inlineEditRow}>
                    <TextInput
                      accessibilityLabel={ui.nextVisitDateLabel}
                      value={nextVisitInput}
                      onChangeText={setNextVisitInput}
                      placeholder="YYYY-MM-DD (e.g. 2026-12-05)"
                      placeholderTextColor={ClinicalColors.textMuted}
                      style={styles.inlineInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        ensureManualDraft({
                          next_visit_date: nextVisitInput.trim() || null,
                        });
                        setEditingNextVisit(false);
                      }}
                      style={styles.inlineSaveBtn}
                    >
                      <Text style={styles.inlineSaveText}>{ui.saveLabel}</Text>
                    </Pressable>
                  </View>
                )}

                {draft.follow_up_actions.length > 0 ? (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {draft.follow_up_actions.map((act, i) => (
                      <View key={`${act.action_type}-${i}`} style={styles.followUpItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.followUpDesc}>{act.description}</Text>
                          {act.source_phrase && (
                            <Text style={styles.followUpSource}>
                              {ui.fromSpeechLabel}: &ldquo;{act.source_phrase}&rdquo;
                            </Text>
                          )}
                        </View>
                        <Text style={styles.followUpPriority}>
                          {act.priority.toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.kvMuted}>{ui.noPendingTasks}</Text>
                )}

                <FieldConfirmation
                  fieldKey="next_visit_date"
                  label={ui.nextVisitDateLabel}
                  currentStatus={statuses.next_visit_date || 'extracted'}
                  onUpdateStatus={voice.patchFieldStatus}
                  onVoiceCorrect={(k) => voice.startVoiceCorrection(k)}
                />
              </View>
            )}
          </GlassCard>

          {/* Section 7 — Spoken Read-back & Correction Audit Log */}
          <GlassCard>
            <View style={styles.sectionTitleGroup}>
              <FileText size={16} color={ClinicalColors.primary} />
              <Text style={styles.sectionTitleText}>
                6. {ui.spokenDescriptionHeading}
              </Text>
            </View>
            <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
              <SpokenDescription
                transcriptSummary={draft.raw_transcript_summary}
                readBackSummary={draft.read_back_summary}
                isTtsPlaying={voice.isTtsPlaying}
                isTtsPaused={voice.isTtsPaused}
                requiresReReadBack={voice.requiresReReadBack}
                onPausePlayback={voice.pauseReadBack}
                onResumePlayback={voice.resumeReadBack}
              />

              {voice.correctionHistory.length > 0 && (
                <View style={styles.auditCorrectionsBox}>
                  <Text style={styles.auditCorrectionsTitle}>
                    {ui.appliedVoiceCorrections}
                  </Text>
                  {voice.correctionHistory.map((c, idx) => (
                    <Text key={idx} style={styles.auditCorrectionLine}>
                      • Updated {c.corrected_fields.join(', ')}:{' '}
                      {JSON.stringify(c.previous_values)} → {JSON.stringify(c.new_values)}{' '}
                      (preserved: {c.preserved_fields.join(', ')})
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </GlassCard>

          {/* Section 8 — Final Detailed Confirmation Actions */}
          <VisitConfirmationActions
            draft={draft}
            isSaving={voice.isPersistencePending}
            requiresReReadBack={voice.requiresReReadBack}
            hasUnresolvedClarifications={hasUnresolved}
            onAcceptAndSave={voice.confirmAndSaveVisit}
            onRejectAndCorrect={() => voice.startVoiceCorrection()}
            onDiscardAndRerecord={voice.resetSessionState}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  sectionsWrap: {
    gap: Spacing.md,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reviewHeadingText: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  switchBasicBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  switchBasicText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitleText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  sectionRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBody: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
    gap: Spacing.sm,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  kvLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  kvValue: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  kvMuted: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    fontStyle: 'italic',
  },
  inlineValueAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniEditBtn: {
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: ClinicalColors.primary,
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  inlineInput: {
    flex: 1,
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.canvas,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sm,
    color: ClinicalColors.text,
  },
  inlineSaveBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineSaveText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  visitTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  vtOption: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  vtOptionActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  vtOptionText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  completedVacBadge: {
    backgroundColor: ClinicalColors.successSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.successContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  completedVacText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.successDark,
  },
  dueVacBadge: {
    backgroundColor: ClinicalColors.warningSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.warningContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  dueVacText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dangerBullet: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  followUpItem: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  followUpDesc: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  followUpSource: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  followUpPriority: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
  auditCorrectionsBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.indigoSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.indigoBorder,
    gap: 4,
  },
  auditCorrectionsTitle: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.indigoDark,
  },
  auditCorrectionLine: {
    fontSize: 11,
    color: ClinicalColors.indigoDark,
    lineHeight: 16,
  },
});

