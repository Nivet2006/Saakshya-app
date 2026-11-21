import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Mic, MicOff, Sparkles, UserPlus, Volume2, X } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { PRISMA_LANGUAGES } from '@/lib/translations';
import {
  extractPatientFieldsFromTranscript,
  extractPatientFieldValue,
  getNextGuidedStep,
  type PatientFieldKey,
  type PatientIntakeDraftState,
} from '@/lib/voice/patient-voice-intake';
import { MobileVoiceClient } from '@/lib/voice/voice-client';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { Beneficiary, BeneficiaryCategory, LanguageCode } from '@/types';

export interface NewPatientInput {
  full_name: string;
  category: BeneficiaryCategory;
  age_years: number;
  village: string;
  household_head?: string;
  phone_number?: string;
  edd_date?: string;
  high_risk_status: boolean;
  preferred_language: LanguageCode;
}

interface AddPatientModalProps {
  open: boolean;
  defaultLanguage: LanguageCode;
  onClose: () => void;
  onSave: (input: NewPatientInput) => Promise<Beneficiary>;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  open,
  defaultLanguage,
  onClose,
  onSave,
}) => {
  const { ui } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState<BeneficiaryCategory>('PREGNANT_WOMAN');
  const [ageYears, setAgeYears] = useState('24');
  const [village, setVillage] = useState('');
  const [householdHead, setHouseholdHead] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [eddDate, setEddDate] = useState('');
  const [highRisk, setHighRisk] = useState(false);
  const [preferredLang, setPreferredLang] = useState<LanguageCode>(
    defaultLanguage === 'indic-auto' ? 'hi-IN' : defaultLanguage
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice input state (per-field + guided leftmost-bottom assistant)
  const [activeFieldMic, setActiveFieldMic] = useState<PatientFieldKey | null>(null);
  const [guidedActive, setGuidedActive] = useState(false);
  const [guidedConnecting, setGuidedConnecting] = useState(false);
  const [guidedPrompt, setGuidedPrompt] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const voiceClientRef = useRef<MobileVoiceClient | null>(null);
  const activeFieldRef = useRef<PatientFieldKey | null>(null);
  const guidedActiveRef = useRef(false);
  const guidedStepRef = useRef<PatientFieldKey | null>('fullName');
  const askedStepsRef = useRef<Set<PatientFieldKey>>(new Set());
  const stateSnapshotRef = useRef<PatientIntakeDraftState>({
    fullName: '',
    category: 'PREGNANT_WOMAN',
    ageYears: '24',
    village: '',
    householdHead: '',
    phoneNumber: '',
    eddDate: '',
    highRisk: false,
  });

  useEffect(() => {
    stateSnapshotRef.current = {
      fullName,
      category,
      ageYears,
      village,
      householdHead,
      phoneNumber,
      eddDate,
      highRisk,
    };
  }, [fullName, category, ageYears, village, householdHead, phoneNumber, eddDate, highRisk]);

  const stopVoiceSession = () => {
    voiceClientRef.current?.stopSession();
    voiceClientRef.current = null;
    activeFieldRef.current = null;
    guidedActiveRef.current = false;
    setActiveFieldMic(null);
    setGuidedActive(false);
    setGuidedConnecting(false);
    setLiveTranscript('');
  };

  useEffect(() => {
    if (!open) {
      stopVoiceSession();
    }
    return () => {
      stopVoiceSession();
    };
  }, [open]);

  const applyFieldUpdates = (updates: Partial<PatientIntakeDraftState>) => {
    if (updates.fullName !== undefined) setFullName(updates.fullName);
    if (updates.category !== undefined) setCategory(updates.category);
    if (updates.ageYears !== undefined) setAgeYears(updates.ageYears);
    if (updates.village !== undefined) setVillage(updates.village);
    if (updates.householdHead !== undefined) setHouseholdHead(updates.householdHead);
    if (updates.phoneNumber !== undefined) setPhoneNumber(updates.phoneNumber);
    if (updates.eddDate !== undefined) setEddDate(updates.eddDate);
    if (updates.highRisk !== undefined) setHighRisk(updates.highRisk);
  };

  const startSingleFieldVoice = async (field: PatientFieldKey) => {
    if (activeFieldMic === field) {
      // Second tap stops recording & transcribes
      voiceClientRef.current?.setMicTransmissionActive(false);
      setActiveFieldMic(null);
      return;
    }

    stopVoiceSession();
    setErrorMsg(null);
    setActiveFieldMic(field);
    activeFieldRef.current = field;
    setLiveTranscript('Listening...');

    const client = new MobileVoiceClient({
      onStateChange: () => {},
      onConnectionChange: (connected) => {
        if (connected && activeFieldRef.current === field) {
          client.setMicTransmissionActive(true);
        }
      },
      onAudioLevel: () => {},
      onPartialTranscript: (ev) => {
        const text = (ev.stable_text || ev.text || ev.volatile_text || '').trim();
        if (text) setLiveTranscript(text);
      },
      onFinalTranscript: (ev) => {
        const val = extractPatientFieldValue(field, ev.text);
        if (val) {
          applyFieldUpdates({ [field]: val } as Partial<PatientIntakeDraftState>);
        }
        stopVoiceSession();
      },
      onAssistantResponse: () => {},
      onVisitDraftUpdated: () => {},
      onClarificationRequired: () => {},
      onCorrectionApplied: () => {},
      onDangerAlert: () => {},
      onReadBackStarted: () => {},
      onVisitConfirmed: () => {},
      onVisitCommitted: () => {},
      onError: (_code, msg) => {
        setErrorMsg(msg);
        stopVoiceSession();
      },
    });

    voiceClientRef.current = client;
    await client.startSession({
      language: preferredLang,
      workerId: 'ASHA-INTAKE',
      handsFree: false,
    });
  };

  const handleToggleGuidedVoice = async () => {
    if (guidedActive) {
      stopVoiceSession();
      setGuidedPrompt(null);
      return;
    }

    stopVoiceSession();
    setErrorMsg(null);
    setGuidedActive(true);
    guidedActiveRef.current = true;
    setGuidedConnecting(true);
    askedStepsRef.current = new Set();

    const first = getNextGuidedStep(stateSnapshotRef.current, askedStepsRef.current);
    guidedStepRef.current = first.step;
    setGuidedPrompt(first.prompt);
    setLiveTranscript('Connecting voice assistant...');

    const client = new MobileVoiceClient({
      onStateChange: () => {},
      onConnectionChange: (connected) => {
        setGuidedConnecting(false);
        if (connected && guidedActiveRef.current) {
          setLiveTranscript('Listening — speak naturally...');
          client.setMicTransmissionActive(true);
        }
      },
      onAudioLevel: () => {},
      onPartialTranscript: (ev) => {
        const text = (ev.stable_text || ev.text || ev.volatile_text || '').trim();
        if (text) setLiveTranscript(text);
      },
      onFinalTranscript: (ev) => {
        if (!guidedActiveRef.current) return;
        const currentStep = guidedStepRef.current;
        if (currentStep) {
          askedStepsRef.current.add(currentStep);
        }
        const updates = extractPatientFieldsFromTranscript(ev.text, currentStep);
        applyFieldUpdates(updates);

        const nextSnapshot: PatientIntakeDraftState = {
          ...stateSnapshotRef.current,
          ...updates,
        };
        stateSnapshotRef.current = nextSnapshot;

        const next = getNextGuidedStep(nextSnapshot, askedStepsRef.current);
        guidedStepRef.current = next.step;
        setGuidedPrompt(next.prompt);
        setLiveTranscript('');

        if (!next.step) {
          // All fields collected
          setTimeout(() => {
            stopVoiceSession();
          }, 1200);
        }
      },
      onAssistantResponse: () => {},
      onVisitDraftUpdated: () => {},
      onClarificationRequired: () => {},
      onCorrectionApplied: () => {},
      onDangerAlert: () => {},
      onReadBackStarted: () => {},
      onVisitConfirmed: () => {},
      onVisitCommitted: () => {},
      onError: (_code, msg) => {
        setErrorMsg(msg);
        stopVoiceSession();
      },
    });

    voiceClientRef.current = client;
    await client.startSession({
      language: preferredLang,
      workerId: 'ASHA-INTAKE',
      handsFree: true,
    });
  };

  const categories: Array<{ id: BeneficiaryCategory; label: string }> = [
    { id: 'PREGNANT_WOMAN', label: ui.ancFilter },
    { id: 'LACTATING_MOTHER', label: ui.pncFilter },
    { id: 'INFANT', label: ui.infantFilter },
    { id: 'CHILD', label: ui.childFilter },
  ];

  const handleSubmit = async () => {
    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMsg('Please enter the patient name.');
      return;
    }
    stopVoiceSession();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSave({
        full_name: cleanName,
        category,
        age_years: Math.max(0, Number.parseInt(ageYears || '0', 10) || 0),
        village: village.trim() || 'Field Ward',
        household_head: householdHead.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
        edd_date: category === 'PREGNANT_WOMAN' && eddDate.trim() ? eddDate.trim() : undefined,
        high_risk_status: highRisk,
        preferred_language: preferredLang,
      });
      setFullName('');
      setVillage('');
      setHouseholdHead('');
      setPhoneNumber('');
      setEddDate('');
      setHighRisk(false);
      setGuidedPrompt(null);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldMic = (field: PatientFieldKey, label: string) => {
    const active = activeFieldMic === field;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Voice input for ${label}`}
        onPress={() => void startSingleFieldVoice(field)}
        style={[styles.fieldMicBtn, active && styles.fieldMicBtnActive]}
      >
        {active ? (
          <MicOff size={16} color={ClinicalColors.white} />
        ) : (
          <Mic size={16} color={ClinicalColors.primary} />
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBox}>
                <UserPlus size={20} color={ClinicalColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{ui.addNewPatientTitle}</Text>
                <Text style={styles.subtitle}>
                  Saved to Firebase Firestore · Tap any field mic or use the bottom-left Voice Assistant
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ui.cancelLabel}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X size={20} color={ClinicalColors.textSecondary} />
            </Pressable>
          </View>

          {(guidedPrompt || activeFieldMic) && (
            <View style={styles.voiceAssistantBanner}>
              <View style={styles.voiceAssistantTop}>
                {guidedConnecting ? (
                  <ActivityIndicator size="small" color={ClinicalColors.primary} />
                ) : (
                  <Volume2 size={16} color={ClinicalColors.primary} />
                )}
                <Text style={styles.voiceAssistantPrompt}>
                  {activeFieldMic
                    ? `Listening for ${activeFieldMic} (tap mic again when done)...`
                    : guidedPrompt}
                </Text>
              </View>
              {!!liveTranscript && (
                <Text style={styles.voiceAssistantTranscript}>&ldquo;{liveTranscript}&rdquo;</Text>
              )}
            </View>
          )}

          <ScrollView contentContainerStyle={styles.formContent}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{ui.patientNameLabel} *</Text>
              <View style={styles.inputWithMic}>
                <TextInput
                  accessibilityLabel={ui.patientNameLabel}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Priya Devi"
                  placeholderTextColor={ClinicalColors.textMuted}
                  style={styles.inputFlex}
                />
                {renderFieldMic('fullName', ui.patientNameLabel)}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{ui.patientCategoryLabel}</Text>
              <View style={styles.chipGrid}>
                {categories.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        setCategory(cat.id);
                        if (cat.id === 'INFANT') setAgeYears('0');
                        else if (ageYears === '0') setAgeYears('24');
                      }}
                      style={[
                        styles.catChip,
                        active && styles.catChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          active && styles.catChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>{ui.patientAgeLabel}</Text>
                <View style={styles.inputWithMic}>
                  <TextInput
                    accessibilityLabel={ui.patientAgeLabel}
                    keyboardType="numeric"
                    value={ageYears}
                    onChangeText={setAgeYears}
                    style={styles.inputFlex}
                  />
                  {renderFieldMic('ageYears', ui.patientAgeLabel)}
                </View>
              </View>
              <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                <Text style={styles.label}>{ui.villageWardLabel}</Text>
                <View style={styles.inputWithMic}>
                  <TextInput
                    accessibilityLabel={ui.villageWardLabel}
                    value={village}
                    onChangeText={setVillage}
                    placeholder="e.g. Ward 1"
                    placeholderTextColor={ClinicalColors.textMuted}
                    style={styles.inputFlex}
                  />
                  {renderFieldMic('village', ui.villageWardLabel)}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>{ui.householdHead}</Text>
                <View style={styles.inputWithMic}>
                  <TextInput
                    accessibilityLabel={ui.householdHead}
                    value={householdHead}
                    onChangeText={setHouseholdHead}
                    placeholder="Optional"
                    placeholderTextColor={ClinicalColors.textMuted}
                    style={styles.inputFlex}
                  />
                  {renderFieldMic('householdHead', ui.householdHead)}
                </View>
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>{ui.phoneOptionalLabel}</Text>
                <View style={styles.inputWithMic}>
                  <TextInput
                    accessibilityLabel={ui.phoneOptionalLabel}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="98765-00000"
                    placeholderTextColor={ClinicalColors.textMuted}
                    style={styles.inputFlex}
                  />
                  {renderFieldMic('phoneNumber', ui.phoneOptionalLabel)}
                </View>
              </View>
            </View>

            {category === 'PREGNANT_WOMAN' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{ui.eddLabel} (YYYY-MM-DD)</Text>
                <View style={styles.inputWithMic}>
                  <TextInput
                    accessibilityLabel={ui.eddLabel}
                    value={eddDate}
                    onChangeText={setEddDate}
                    placeholder="2027-02-15"
                    placeholderTextColor={ClinicalColors.textMuted}
                    style={styles.inputFlex}
                  />
                  {renderFieldMic('eddDate', ui.eddLabel)}
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{ui.languageLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.langRow}>
                  {PRISMA_LANGUAGES.map((l) => {
                    const active = preferredLang === l.code;
                    return (
                      <Pressable
                        key={l.code}
                        accessibilityRole="button"
                        onPress={() => setPreferredLang(l.code)}
                        style={[
                          styles.langPill,
                          active && styles.langPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.langPillText,
                            active && styles.langPillTextActive,
                          ]}
                        >
                          {l.nativeName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{ui.highRiskPatientLabel}</Text>
              <Switch
                value={highRisk}
                onValueChange={setHighRisk}
                trackColor={{
                  false: ClinicalColors.border,
                  true: ClinicalColors.danger,
                }}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {/* Leftmost-Bottom Guided Human-Like Voice Assistant Mic Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guided Voice Assistant"
              onPress={() => void handleToggleGuidedVoice()}
              style={[
                styles.guidedMicBtn,
                guidedActive && styles.guidedMicBtnActive,
              ]}
            >
              {guidedActive ? (
                <MicOff size={18} color={ClinicalColors.white} />
              ) : (
                <Mic size={18} color={ClinicalColors.white} />
              )}
              <Sparkles size={13} color={ClinicalColors.white} />
            </Pressable>

            <View style={styles.footerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ui.cancelLabel}
                onPress={onClose}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>{ui.cancelLabel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ui.savePatientBtn}
                disabled={submitting}
                onPress={handleSubmit}
                style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
              >
                <Text style={styles.saveText}>
                  {submitting ? ui.savingVisitBtn : ui.savePatientBtn}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: ClinicalColors.backdropOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: ClinicalColors.card,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    maxHeight: '90%',
    padding: Spacing.xl,
    ...Shadows.glassCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    minWidth: TouchTargets.min,
    minHeight: TouchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAssistantBanner: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primarySoft,
    borderWidth: 1,
    borderColor: ClinicalColors.primary,
    gap: 4,
  },
  voiceAssistantTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceAssistantPrompt: {
    flex: 1,
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  voiceAssistantTranscript: {
    fontSize: Typography.xs,
    fontStyle: 'italic',
    color: ClinicalColors.textSecondary,
  },
  formContent: {
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  errorBox: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.dangerSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.danger,
  },
  errorText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.dangerDark,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  inputWithMic: {
    minHeight: TouchTargets.min,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingRight: 4,
  },
  inputFlex: {
    flex: 1,
    minHeight: TouchTargets.min,
    fontSize: Typography.base,
    color: ClinicalColors.text,
    paddingVertical: 8,
  },
  fieldMicBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ClinicalColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldMicBtnActive: {
    backgroundColor: ClinicalColors.danger,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  catChip: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  catChipActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  catChipText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  catChipTextActive: {
    color: ClinicalColors.white,
  },
  langRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  langPill: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  langPillActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  langPillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  langPillTextActive: {
    color: ClinicalColors.white,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  switchLabel: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
  },
  guidedMicBtn: {
    minWidth: 58,
    minHeight: TouchTargets.min,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    backgroundColor: ClinicalColors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...Shadows.glassCard,
  },
  guidedMicBtnActive: {
    backgroundColor: ClinicalColors.danger,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cancelBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  saveBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
});
