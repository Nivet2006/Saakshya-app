import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit3,
  HelpCircle,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react-native';
import {
  ConfirmModalDialog,
  FieldStatusPill,
  GlassCard,
} from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { FieldConfirmStatus, VisitDraft } from '@/types';

export const SpokenDescription: React.FC<{
  transcriptSummary?: string;
  readBackSummary?: string;
  isTtsPlaying: boolean;
  isTtsPaused: boolean;
  requiresReReadBack?: boolean;
  onPausePlayback: () => void;
  onResumePlayback: () => void;
}> = ({
  transcriptSummary,
  readBackSummary,
  isTtsPlaying,
  isTtsPaused,
  requiresReReadBack,
  onPausePlayback,
  onResumePlayback,
}) => {
  const { ui } = useTranslation();

  return (
    <View style={styles.spokenBox}>
      <View style={styles.spokenHeader}>
        <Text style={styles.spokenHeadingText}>{ui.spokenDescriptionHeading}</Text>

        {isTtsPlaying && (
          <View style={styles.ttsControlRow}>
            <View style={styles.ttsStatusInline}>
              <Volume2 size={14} color={ClinicalColors.primary} />
              <Text style={styles.ttsStatusLabel}>
                {isTtsPaused ? ui.readbackPaused : ui.timbreReadingAloud}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isTtsPaused ? ui.resumeReadback : ui.pauseReadback}
              onPress={isTtsPaused ? onResumePlayback : onPausePlayback}
              style={styles.pauseResumeBtn}
            >
              {isTtsPaused ? (
                <>
                  <Play size={12} color={ClinicalColors.text} />
                  <Text style={styles.pauseResumeText}>{ui.resumeReadback}</Text>
                </>
              ) : (
                <>
                  <Pause size={12} color={ClinicalColors.text} />
                  <Text style={styles.pauseResumeText}>{ui.pauseReadback}</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {transcriptSummary ? (
        <View style={styles.transcriptQuoteBox}>
          <Text style={styles.transcriptQuoteText}>&ldquo;{transcriptSummary}&rdquo;</Text>
        </View>
      ) : (
        <Text style={styles.emptySpokenText}>{ui.noSpokenDescriptionYet}</Text>
      )}

      {readBackSummary && (
        <View style={styles.readBackBox}>
          <Text style={styles.readBackTitle}>{ui.assistantSummaryHeading}:</Text>
          <Text style={styles.readBackBody}>{readBackSummary}</Text>
        </View>
      )}

      {requiresReReadBack && (
        <View style={styles.rereadNotice}>
          <Text style={styles.rereadNoticeText}>{ui.fieldUpdatedReread}</Text>
        </View>
      )}
    </View>
  );
};

export const VoiceCorrectionControl: React.FC<{
  fieldKey: string;
  fieldLabel: string;
  isActiveTarget?: boolean;
  onTriggerVoiceCorrection: (fieldKey: string) => void;
}> = ({ fieldKey, fieldLabel, isActiveTarget, onTriggerVoiceCorrection }) => {
  const { ui } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ui.correctButton} ${fieldLabel}`}
      onPress={() => onTriggerVoiceCorrection(fieldKey)}
      style={[
        styles.voiceCorrectBtn,
        isActiveTarget && styles.voiceCorrectBtnActive,
      ]}
    >
      <Mic
        size={13}
        color={isActiveTarget ? ClinicalColors.white : ClinicalColors.secondary}
      />
      <Text
        style={[
          styles.voiceCorrectText,
          isActiveTarget && { color: ClinicalColors.white },
        ]}
      >
        {ui.correctButton}
      </Text>
    </Pressable>
  );
};

export const CapturedField: React.FC<{
  fieldKey: string;
  label: string;
  value: string | null;
  rawEditValue?: string;
  editType?: 'text' | 'number' | 'date' | 'visit_type';
  sourcePhrase?: string | null;
  status: FieldConfirmStatus;
  onVoiceCorrect?: (fieldKey: string) => void;
  onVisualSave?: (fieldKey: string, nextValue: string) => void;
  activeCorrectionField?: string | null;
}> = ({
  fieldKey,
  label,
  value,
  rawEditValue,
  editType = 'text',
  sourcePhrase,
  status,
  onVoiceCorrect,
  onVisualSave,
  activeCorrectionField,
}) => {
  const { ui } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(rawEditValue ?? '');
  const isMissing = value === null || value === '';
  const needsAttn = status === 'needs_clarification' || isMissing;
  const isModified = status === 'corrected';

  const startEdit = () => {
    setEditDraft(rawEditValue ?? (value || ''));
    setEditing(true);
  };

  const handleSave = () => {
    onVisualSave?.(fieldKey, editDraft);
    setEditing(false);
  };

  return (
    <View
      style={[
        styles.fieldCard,
        activeCorrectionField === fieldKey
          ? styles.fieldCardTargeting
          : isModified
          ? styles.fieldCardModified
          : needsAttn
          ? styles.fieldCardAttention
          : styles.fieldCardNormal,
      ]}
    >
      <View style={styles.fieldTopRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabelText}>{label}</Text>
            <FieldStatusPill
              status={isMissing && status !== 'needs_clarification' ? 'missing' : status}
              compact
            />
          </View>
          <Text
            style={[
              styles.fieldValueText,
              isMissing && styles.fieldValueMissing,
            ]}
          >
            {isMissing ? ui.notIdentified : value}
          </Text>
          {sourcePhrase ? (
            <Text style={styles.sourcePhraseText}>
              {ui.fromSpeechLabel}: &ldquo;{sourcePhrase}&rdquo;
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldActionsRow}>
          {onVisualSave && !editing && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${ui.editLabel} ${label}`}
              onPress={startEdit}
              style={styles.visualEditBtn}
            >
              <Edit3 size={13} color={ClinicalColors.textSecondary} />
              <Text style={styles.visualEditText}>{ui.editLabel}</Text>
            </Pressable>
          )}
          {onVoiceCorrect && (
            <VoiceCorrectionControl
              fieldKey={fieldKey}
              fieldLabel={label}
              isActiveTarget={activeCorrectionField === fieldKey}
              onTriggerVoiceCorrection={onVoiceCorrect}
            />
          )}
        </View>
      </View>

      {editing && onVisualSave && (
        <View style={styles.inlineEditor}>
          {editType === 'visit_type' ? (
            <View style={styles.visitTypePills}>
              {(['ANC', 'PNC', 'Newborn', 'Immunisation'] as const).map((vt) => (
                <Pressable
                  key={vt}
                  accessibilityRole="button"
                  onPress={() => setEditDraft(vt)}
                  style={[
                    styles.vtPill,
                    editDraft === vt && styles.vtPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.vtPillText,
                      editDraft === vt && { color: ClinicalColors.white },
                    ]}
                  >
                    {vt}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <TextInput
              accessibilityLabel={`Edit ${label}`}
              keyboardType={editType === 'number' ? 'decimal-pad' : 'default'}
              value={editDraft}
              onChangeText={setEditDraft}
              style={styles.inlineInput}
            />
          )}
          <View style={styles.inlineEditorButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              style={styles.inlineSaveBtn}
            >
              <Text style={styles.inlineSaveText}>{ui.saveLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditing(false)}
              style={styles.inlineCancelBtn}
            >
              <Text style={styles.inlineCancelText}>{ui.cancelLabel}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

export const FieldConfirmation: React.FC<{
  fieldKey: string;
  label: string;
  currentStatus: FieldConfirmStatus;
  onUpdateStatus: (fieldKey: string, status: FieldConfirmStatus) => void;
  onVoiceCorrect: (fieldKey: string) => void;
}> = ({ fieldKey, label, currentStatus, onUpdateStatus, onVoiceCorrect }) => {
  const { ui } = useTranslation();

  return (
    <View style={styles.fieldConfirmBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ui.confirmField} ${label}`}
        onPress={() => onUpdateStatus(fieldKey, 'confirmed')}
        style={[
          styles.confirmChip,
          currentStatus === 'confirmed' && styles.confirmChipActive,
        ]}
      >
        <Check
          size={12}
          color={currentStatus === 'confirmed' ? ClinicalColors.white : ClinicalColors.successDark}
        />
        <Text
          style={[
            styles.confirmChipText,
            currentStatus === 'confirmed' && { color: ClinicalColors.white },
          ]}
        >
          {ui.confirmField} {label}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ui.correctByVoice} ${label}`}
        onPress={() => onVoiceCorrect(fieldKey)}
        style={styles.voiceChip}
      >
        <Mic size={12} color={ClinicalColors.secondaryDark} />
        <Text style={styles.voiceChipText}>{ui.correctByVoice}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ui.needsClarification} ${label}`}
        onPress={() => onUpdateStatus(fieldKey, 'needs_clarification')}
        style={[
          styles.clarifyChip,
          currentStatus === 'needs_clarification' && styles.clarifyChipActive,
        ]}
      >
        <HelpCircle
          size={12}
          color={
            currentStatus === 'needs_clarification'
              ? ClinicalColors.white
              : ClinicalColors.warningDark
          }
        />
        <Text
          style={[
            styles.clarifyChipText,
            currentStatus === 'needs_clarification' && { color: ClinicalColors.white },
          ]}
        >
          {ui.needsClarification}
        </Text>
      </Pressable>
    </View>
  );
};

export const VisitSummaryCard: React.FC<{
  draft: VisitDraft;
  isTtsPlaying: boolean;
  isTtsPaused: boolean;
  requiresReReadBack?: boolean;
  summaryOutdated?: boolean;
  activeCorrectionField?: string | null;
  onPausePlayback: () => void;
  onResumePlayback: () => void;
  onVoiceCorrectField?: (fieldKey: string) => void;
  onVisualPatchFields?: (fields: Record<string, unknown>) => void;
  onRemoveObservation?: (key: string) => void;
  onRemoveEvent?: (name: string) => void;
  onSpeakToMakeChanges?: () => void;
}> = ({
  draft,
  isTtsPlaying,
  isTtsPaused,
  requiresReReadBack,
  summaryOutdated,
  activeCorrectionField,
  onPausePlayback,
  onResumePlayback,
  onVoiceCorrectField,
  onVisualPatchFields,
  onRemoveObservation,
  onRemoveEvent,
  onSpeakToMakeChanges,
}) => {
  const { ui } = useTranslation();
  const statuses = draft.field_statuses || {};
  const [addingNote, setAddingNote] = useState(false);
  const [newObsLabel, setNewObsLabel] = useState('');
  const [newObsValue, setNewObsValue] = useState('');

  const vaccineText =
    draft.vaccinations_due.length > 0 || draft.vaccinations_completed.length > 0
      ? [
          draft.vaccinations_completed.length > 0
            ? `Completed: ${draft.vaccinations_completed.join(', ')}`
            : '',
          draft.vaccinations_due.length > 0 ? `Due: ${draft.vaccinations_due.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  const followUpText =
    draft.follow_up_actions.length > 0
      ? draft.follow_up_actions.map((a) => a.description).join('; ')
      : null;

  const handleFieldVisualSave = (fieldKey: string, nextValue: string) => {
    if (!onVisualPatchFields) return;
    if (fieldKey === 'weight_kg') {
      const parsed = parseFloat(nextValue);
      onVisualPatchFields({ weight_kg: Number.isFinite(parsed) && parsed > 0 ? parsed : null });
    } else if (fieldKey === 'next_visit_date') {
      onVisualPatchFields({ next_visit_date: nextValue.trim() || null });
    } else if (fieldKey === 'visit_type') {
      onVisualPatchFields({ visit_type: nextValue.trim() || null });
    } else if (fieldKey === 'beneficiary_id') {
      onVisualPatchFields({ beneficiary_id: nextValue.trim().toUpperCase() || null });
    } else if (fieldKey === 'vaccinations_due') {
      const items = nextValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      onVisualPatchFields({ vaccinations_due: items });
    }
  };

  return (
    <GlassCard padding="lg">
      <View style={styles.summaryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{ui.reviewCardTitle}</Text>
          <Text style={styles.summarySubtitle}>{ui.reviewCardSubtitle}</Text>
        </View>

        <View style={styles.summaryHeaderBadges}>
          {onSpeakToMakeChanges && draft.status === 'draft' && (
            <Pressable
              accessibilityRole="button"
              onPress={onSpeakToMakeChanges}
              style={styles.speakChangesBtn}
            >
              <Mic size={13} color={ClinicalColors.secondaryDark} />
              <Text style={styles.speakChangesText}>{ui.speakToMakeChanges}</Text>
            </Pressable>
          )}
          <View
            style={[
              styles.draftStatusBadge,
              {
                backgroundColor:
                  draft.status === 'committed'
                    ? ClinicalColors.successSoft
                    : draft.status === 'confirmed'
                    ? ClinicalColors.secondarySoft
                    : ClinicalColors.warningSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.draftStatusText,
                {
                  color:
                    draft.status === 'committed'
                      ? ClinicalColors.successDark
                      : draft.status === 'confirmed'
                      ? ClinicalColors.secondaryDark
                      : ClinicalColors.warningDark,
                },
              ]}
            >
              {draft.status === 'draft' ? ui.unsubmittedDraft : draft.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Section A: Spoken Description */}
      <SpokenDescription
        transcriptSummary={draft.raw_transcript_summary}
        readBackSummary={summaryOutdated ? undefined : draft.read_back_summary}
        isTtsPlaying={isTtsPlaying}
        isTtsPaused={isTtsPaused}
        requiresReReadBack={requiresReReadBack || summaryOutdated}
        onPausePlayback={onPausePlayback}
        onResumePlayback={onResumePlayback}
      />

      {/* Section B: Captured Structured Fields */}
      <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
        <Text style={styles.sectionCaps}>{ui.visitSummaryHeading}</Text>

        <CapturedField
          fieldKey="beneficiary_id"
          label={ui.beneficiaryLabel}
          value={
            draft.beneficiary_name && draft.beneficiary_id
              ? `${draft.beneficiary_name} (${draft.beneficiary_id})`
              : draft.beneficiary_id || draft.beneficiary_name
          }
          rawEditValue={draft.beneficiary_id || ''}
          status={
            statuses.beneficiary_id ||
            (draft.beneficiary_id ? 'extracted' : 'needs_clarification')
          }
          onVoiceCorrect={onVoiceCorrectField}
          onVisualSave={onVisualPatchFields ? handleFieldVisualSave : undefined}
          activeCorrectionField={activeCorrectionField}
        />

        <CapturedField
          fieldKey="visit_type"
          label={ui.visitTypeLabel}
          value={draft.visit_type}
          rawEditValue={draft.visit_type || ''}
          editType="visit_type"
          status={
            statuses.visit_type ||
            (draft.visit_type ? 'extracted' : 'needs_clarification')
          }
          onVoiceCorrect={onVoiceCorrectField}
          onVisualSave={onVisualPatchFields ? handleFieldVisualSave : undefined}
          activeCorrectionField={activeCorrectionField}
        />

        {(draft.weight_kg !== null || statuses.weight_kg === 'needs_clarification') && (
          <CapturedField
            fieldKey="weight_kg"
            label={ui.weightLabel}
            value={draft.weight_kg !== null ? `${draft.weight_kg} kg` : null}
            rawEditValue={draft.weight_kg !== null ? String(draft.weight_kg) : ''}
            editType="number"
            sourcePhrase={draft.weight_source_text}
            status={
              statuses.weight_kg ||
              (draft.weight_kg !== null ? 'extracted' : 'missing')
            }
            onVoiceCorrect={onVoiceCorrectField}
            onVisualSave={onVisualPatchFields ? handleFieldVisualSave : undefined}
            activeCorrectionField={activeCorrectionField}
          />
        )}

        {(vaccineText !== null || statuses.vaccinations_due === 'needs_clarification') &&
          !(draft.events && draft.events.length > 0) && (
            <CapturedField
              fieldKey="vaccinations_due"
              label={ui.vaccinationsDue}
              value={vaccineText}
              rawEditValue={draft.vaccinations_due.join(', ')}
              status={
                statuses.vaccinations_due || (vaccineText ? 'extracted' : 'missing')
              }
              onVoiceCorrect={onVoiceCorrectField}
              onVisualSave={onVisualPatchFields ? handleFieldVisualSave : undefined}
              activeCorrectionField={activeCorrectionField}
            />
          )}

        {(draft.next_visit_date !== null ||
          statuses.next_visit_date === 'needs_clarification') && (
          <CapturedField
            fieldKey="next_visit_date"
            label={ui.nextVisitDateLabel}
            value={draft.next_visit_date}
            rawEditValue={draft.next_visit_date || ''}
            editType="date"
            sourcePhrase={draft.next_visit_date_source_text}
            status={
              statuses.next_visit_date ||
              (draft.next_visit_date ? 'extracted' : 'missing')
            }
            onVoiceCorrect={onVoiceCorrectField}
            onVisualSave={onVisualPatchFields ? handleFieldVisualSave : undefined}
            activeCorrectionField={activeCorrectionField}
          />
        )}

        {followUpText !== null && (
          <CapturedField
            fieldKey="follow_up_actions"
            label={ui.pendingFollowUps}
            value={followUpText}
            status={statuses.follow_up_actions || 'extracted'}
            onVoiceCorrect={onVoiceCorrectField}
            activeCorrectionField={activeCorrectionField}
          />
        )}

        {/* Dynamic Observations */}
        {draft.observations && draft.observations.length > 0 && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={styles.sectionCaps}>
              {ui.capturedClinicalObs} ({draft.observations.length})
            </Text>
            {draft.observations.map((obs) => (
              <View key={obs.key} style={styles.obsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.obsLabel}>{obs.label}</Text>
                  <Text style={styles.obsValue}>
                    {String(obs.value ?? '')}
                    {obs.unit ? ` ${obs.unit}` : ''}
                  </Text>
                </View>
                {onRemoveObservation && draft.status === 'draft' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${obs.label}`}
                    onPress={() => onRemoveObservation(obs.key)}
                    style={styles.removeBtn}
                  >
                    <X size={16} color={ClinicalColors.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Repeatable Events & Vaccinations */}
        {draft.events && draft.events.length > 0 && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={styles.sectionCaps}>
              {ui.recordedEventsLabel} ({draft.events.length})
            </Text>
            <View style={styles.eventsWrap}>
              {draft.events.map((ev) => (
                <View key={`${ev.event_type}:${ev.name}`} style={styles.eventChip}>
                  <Text style={styles.eventName}>{ev.name}</Text>
                  <Text style={styles.eventStatus}>{ev.status.toUpperCase()}</Text>
                  {onRemoveEvent && draft.status === 'draft' && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onRemoveEvent(ev.name)}
                    >
                      <X size={14} color={ClinicalColors.danger} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Add Custom Observation */}
        {onVisualPatchFields && draft.status === 'draft' && (
          <View style={{ marginTop: 4 }}>
            {!addingNote ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAddingNote(true)}
                style={styles.addNoteToggle}
              >
                <Edit3 size={13} color={ClinicalColors.primary} />
                <Text style={styles.addNoteToggleText}>{ui.addObservationNote}</Text>
              </Pressable>
            ) : (
              <View style={styles.addNoteCard}>
                <TextInput
                  placeholder={ui.obsLabelPlaceholder}
                  placeholderTextColor={ClinicalColors.textMuted}
                  value={newObsLabel}
                  onChangeText={setNewObsLabel}
                  style={styles.inlineInput}
                />
                <TextInput
                  placeholder={ui.obsValuePlaceholder}
                  placeholderTextColor={ClinicalColors.textMuted}
                  value={newObsValue}
                  onChangeText={setNewObsValue}
                  style={styles.inlineInput}
                />
                <View style={styles.inlineEditorButtons}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (!newObsLabel.trim() || !newObsValue.trim()) return;
                      const key = newObsLabel
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_');
                      const nextObs = [
                        ...(draft.observations || []).filter((o) => o.key !== key),
                        {
                          key,
                          label: newObsLabel.trim(),
                          value: newObsValue.trim(),
                          value_type: 'text' as const,
                          status: 'confirmed' as const,
                          source_text: `${newObsLabel.trim()}: ${newObsValue.trim()}`,
                        },
                      ];
                      onVisualPatchFields({ observations: nextObs });
                      setNewObsLabel('');
                      setNewObsValue('');
                      setAddingNote(false);
                    }}
                    style={styles.inlineSaveBtn}
                  >
                    <Text style={styles.inlineSaveText}>{ui.saveNote}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAddingNote(false)}
                    style={styles.inlineCancelBtn}
                  >
                    <Text style={styles.inlineCancelText}>{ui.cancelLabel}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Danger Signs Summary Row */}
        <View
          style={[
            styles.dangerSummaryRow,
            {
              backgroundColor: draft.danger_sign_flagged
                ? ClinicalColors.dangerSoft
                : ClinicalColors.successSoft,
              borderColor: draft.danger_sign_flagged
                ? ClinicalColors.danger
                : ClinicalColors.successContainer,
            },
          ]}
        >
          {draft.danger_sign_flagged ? (
            <AlertTriangle size={16} color={ClinicalColors.danger} />
          ) : (
            <CheckCircle2 size={16} color={ClinicalColors.success} />
          )}
          <Text
            style={[
              styles.dangerSummaryText,
              {
                color: draft.danger_sign_flagged
                  ? ClinicalColors.dangerDark
                  : ClinicalColors.successDark,
              },
            ]}
          >
            {ui.dangerSignsLabel}:{' '}
            {draft.danger_sign_flagged
              ? draft.danger_signs.join(', ')
              : ui.noDangerFlaggedSpeech}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

export const VisitConfirmationActions: React.FC<{
  draft: VisitDraft;
  isSaving: boolean;
  requiresReReadBack?: boolean;
  hasUnresolvedClarifications?: boolean;
  onAcceptAndSave: () => void;
  onRejectAndCorrect: () => void;
  onDiscardAndRerecord: () => void;
}> = ({
  draft,
  isSaving,
  requiresReReadBack,
  hasUnresolvedClarifications,
  onAcceptAndSave,
  onRejectAndCorrect,
  onDiscardAndRerecord,
}) => {
  const { ui } = useTranslation();
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const canConfirm = Boolean(draft.beneficiary_id) && !hasUnresolvedClarifications;

  return (
    <GlassCard>
      {!canConfirm && (
        <View style={styles.clarifyWarning}>
          <Text style={styles.clarifyWarningText}>{ui.needsClarification}</Text>
        </View>
      )}

      {requiresReReadBack && (
        <Text style={styles.rereadHint}>{ui.fieldUpdatedReread}</Text>
      )}

      <View style={styles.confirmButtonsGrid}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.acceptAndSaveBtn}
          disabled={isSaving || !canConfirm}
          onPress={onAcceptAndSave}
          style={[
            styles.acceptSaveBtn,
            (isSaving || !canConfirm) && { opacity: 0.5 },
          ]}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color={ClinicalColors.white} />
              <Text style={styles.acceptSaveText}>{ui.savingVisitBtn}</Text>
            </>
          ) : (
            <>
              <Check size={18} color={ClinicalColors.white} />
              <Text style={styles.acceptSaveText}>{ui.acceptAndSaveBtn}</Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.rejectAndCorrectBtn}
          disabled={isSaving}
          onPress={onRejectAndCorrect}
          style={styles.rejectCorrectBtn}
        >
          <X size={18} color={ClinicalColors.warningDark} />
          <Text style={styles.rejectCorrectText}>{ui.rejectAndCorrectBtn}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ui.discardAndRerecordBtn}
        disabled={isSaving}
        onPress={() => setConfirmDiscardOpen(true)}
        style={styles.discardBtn}
      >
        <RotateCcw size={14} color={ClinicalColors.textSecondary} />
        <Text style={styles.discardBtnText}>{ui.discardAndRerecordBtn}</Text>
      </Pressable>

      <ConfirmModalDialog
        open={confirmDiscardOpen}
        title={ui.confirmDiscardTitle}
        description={ui.confirmDiscardDesc}
        confirmLabel={ui.discardConfirmBtn}
        cancelLabel={ui.cancelLabel}
        destructive
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onDiscardAndRerecord();
        }}
      />
    </GlassCard>
  );
};

export const VisitSuccess: React.FC<{
  savedVisit: VisitDraft;
  onStartAnother: () => void;
  onGoHome: () => void;
}> = ({ savedVisit, onStartAnother, onGoHome }) => {
  const { ui } = useTranslation();
  const isSynced = savedVisit.sync_status === 'synced' || savedVisit.status === 'committed';

  return (
    <GlassCard variant="teal" padding="lg">
      <View style={styles.successCenter}>
        <View style={styles.successIconCircle}>
          <CheckCircle2 size={36} color={ClinicalColors.white} />
        </View>

        <View
          style={[
            styles.syncStatusBadge,
            {
              backgroundColor: isSynced
                ? ClinicalColors.successSoft
                : ClinicalColors.warningSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.syncStatusText,
              {
                color: isSynced
                  ? ClinicalColors.successDark
                  : ClinicalColors.warningDark,
              },
            ]}
          >
            {isSynced ? ui.visitCommittedSynced : ui.confirmedQueuedOffline}
          </Text>
        </View>

        <Text style={styles.successTitle}>
          {ui.visitSavedFor}{' '}
          {savedVisit.beneficiary_name || savedVisit.beneficiary_id || ui.beneficiaryLabel}
        </Text>

        <View style={styles.successMetaCard}>
          <View style={styles.successMetaRow}>
            <Text style={styles.successMetaLabel}>{ui.visitIdLabel}</Text>
            <Text style={styles.successMetaVal}>{savedVisit.visit_id}</Text>
          </View>
          <View style={styles.successMetaRow}>
            <Text style={styles.successMetaLabel}>{ui.visitTypeLabel}</Text>
            <Text style={styles.successMetaVal}>
              {savedVisit.visit_type || ui.generalLabel}
            </Text>
          </View>
          {savedVisit.weight_kg !== null && (
            <View style={styles.successMetaRow}>
              <Text style={styles.successMetaLabel}>{ui.weightLabel}</Text>
              <Text style={styles.successMetaVal}>{savedVisit.weight_kg} kg</Text>
            </View>
          )}
          {savedVisit.next_visit_date && (
            <View style={styles.successMetaRow}>
              <Text style={styles.successMetaLabel}>{ui.nextVisitDateLabel}</Text>
              <Text style={styles.successMetaVal}>{savedVisit.next_visit_date}</Text>
            </View>
          )}
        </View>

        <View style={styles.successActionsCol}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.startAnotherVoiceVisit}
            onPress={onStartAnother}
            style={styles.acceptSaveBtn}
          >
            <Mic size={18} color={ClinicalColors.white} />
            <Text style={styles.acceptSaveText}>{ui.startAnotherVoiceVisit}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.returnToAshaHome}
            onPress={onGoHome}
            style={styles.homeBtn}
          >
            <Text style={styles.homeBtnText}>{ui.returnToAshaHome}</Text>
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  spokenBox: {
    backgroundColor: ClinicalColors.canvas,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  spokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  spokenHeadingText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.textSecondary,
    textTransform: 'uppercase',
  },
  ttsControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ttsStatusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ttsStatusLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.primary,
  },
  pauseResumeBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    backgroundColor: ClinicalColors.white,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pauseResumeText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  transcriptQuoteBox: {
    backgroundColor: ClinicalColors.white,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    padding: Spacing.md,
  },
  transcriptQuoteText: {
    fontSize: Typography.sm,
    color: ClinicalColors.text,
    lineHeight: 20,
  },
  emptySpokenText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    fontStyle: 'italic',
  },
  readBackBox: {
    backgroundColor: ClinicalColors.primarySoft,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.primaryContainer,
    padding: Spacing.md,
    gap: 4,
  },
  readBackTitle: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  readBackBody: {
    fontSize: Typography.xs,
    color: ClinicalColors.primaryDark,
    lineHeight: 18,
  },
  rereadNotice: {
    backgroundColor: ClinicalColors.warningSoft,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.warning,
    padding: Spacing.sm,
  },
  rereadNoticeText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.warningDark,
  },
  voiceCorrectBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceCorrectBtnActive: {
    backgroundColor: ClinicalColors.indigo,
    borderColor: ClinicalColors.indigoDark,
  },
  voiceCorrectText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.secondary,
  },
  fieldCard: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  fieldCardNormal: {
    backgroundColor: ClinicalColors.white,
    borderColor: ClinicalColors.borderSubtle,
  },
  fieldCardModified: {
    backgroundColor: ClinicalColors.secondarySoft,
    borderColor: ClinicalColors.secondary,
  },
  fieldCardAttention: {
    backgroundColor: ClinicalColors.warningSoft,
    borderColor: ClinicalColors.warning,
    borderStyle: 'dashed',
  },
  fieldCardTargeting: {
    backgroundColor: ClinicalColors.indigoSoft,
    borderColor: ClinicalColors.indigo,
  },
  fieldTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  fieldLabelText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  fieldValueText: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  fieldValueMissing: {
    color: ClinicalColors.warningDark,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  sourcePhraseText: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  fieldActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visualEditBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visualEditText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  inlineEditor: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
    gap: Spacing.sm,
  },
  visitTypePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vtPill: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  vtPillActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  vtPillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  inlineInput: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sm,
    color: ClinicalColors.text,
  },
  inlineEditorButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inlineSaveBtn: {
    minHeight: 40,
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
  inlineCancelBtn: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineCancelText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  fieldConfirmBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
  },
  confirmChip: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.successContainer,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmChipActive: {
    backgroundColor: ClinicalColors.success,
    borderColor: ClinicalColors.successDark,
  },
  confirmChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.successDark,
  },
  voiceChip: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.secondaryContainer,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.secondaryDark,
  },
  clarifyChip: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.warningContainer,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clarifyChipActive: {
    backgroundColor: ClinicalColors.warning,
    borderColor: ClinicalColors.warningDark,
  },
  clarifyChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
  },
  summaryTitle: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  summarySubtitle: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  summaryHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  speakChangesBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.secondarySoft,
    borderWidth: 1,
    borderColor: ClinicalColors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  speakChangesText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.secondaryDark,
  },
  draftStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  draftStatusText: {
    fontSize: Typography.xs,
    fontWeight: '800',
  },
  sectionCaps: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  obsRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  obsLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  obsValue: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
    marginTop: 2,
  },
  removeBtn: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.successSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.successContainer,
  },
  eventName: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.successDark,
  },
  eventStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  addNoteToggle: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addNoteToggleText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primary,
  },
  addNoteCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    gap: Spacing.sm,
  },
  dangerSummaryRow: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  dangerSummaryText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    flex: 1,
  },
  clarifyWarning: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.warningSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.warning,
    marginBottom: Spacing.sm,
  },
  clarifyWarningText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
  rereadHint: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.warningDark,
    marginBottom: Spacing.sm,
  },
  confirmButtonsGrid: {
    gap: Spacing.sm,
  },
  acceptSaveBtn: {
    minHeight: TouchTargets.comfortable,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.primary,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  acceptSaveText: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  rejectCorrectBtn: {
    minHeight: TouchTargets.comfortable,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.white,
    borderWidth: 2,
    borderColor: ClinicalColors.warning,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  rejectCorrectText: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
  discardBtn: {
    minHeight: TouchTargets.min,
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  discardBtnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  successCenter: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ClinicalColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  syncStatusText: {
    fontSize: Typography.xs,
    fontWeight: '800',
  },
  successTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: ClinicalColors.text,
    textAlign: 'center',
  },
  successMetaCard: {
    width: '100%',
    backgroundColor: ClinicalColors.white,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  successMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successMetaLabel: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    fontWeight: '600',
  },
  successMetaVal: {
    fontSize: Typography.sm,
    color: ClinicalColors.text,
    fontWeight: '800',
  },
  successActionsCol: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  homeBtn: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
});
