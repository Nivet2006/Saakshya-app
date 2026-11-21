import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { UserPlus, X } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { PRISMA_LANGUAGES } from '@/lib/translations';
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
  const [village, setVillage] = useState('Rampur Demo Ward 1');
  const [householdHead, setHouseholdHead] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [eddDate, setEddDate] = useState('');
  const [highRisk, setHighRisk] = useState(false);
  const [preferredLang, setPreferredLang] = useState<LanguageCode>(
    defaultLanguage === 'indic-auto' ? 'hi-IN' : defaultLanguage
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSave({
        full_name: cleanName,
        category,
        age_years: Math.max(0, Number.parseInt(ageYears || '0', 10) || 0),
        village: village.trim() || 'Rampur Demo Ward 1',
        household_head: householdHead.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
        edd_date: category === 'PREGNANT_WOMAN' && eddDate.trim() ? eddDate.trim() : undefined,
        high_risk_status: highRisk,
        preferred_language: preferredLang,
      });
      setFullName('');
      setHouseholdHead('');
      setPhoneNumber('');
      setEddDate('');
      setHighRisk(false);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save patient.');
    } finally {
      setSubmitting(false);
    }
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
                <Text style={styles.subtitle}>{ui.zeroPiiNote}</Text>
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

          <ScrollView contentContainerStyle={styles.formContent}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{ui.patientNameLabel} *</Text>
              <TextInput
                accessibilityLabel={ui.patientNameLabel}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Priya Devi"
                placeholderTextColor={ClinicalColors.textMuted}
                style={styles.input}
              />
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
                <TextInput
                  accessibilityLabel={ui.patientAgeLabel}
                  keyboardType="numeric"
                  value={ageYears}
                  onChangeText={setAgeYears}
                  style={styles.input}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                <Text style={styles.label}>{ui.villageWardLabel}</Text>
                <TextInput
                  accessibilityLabel={ui.villageWardLabel}
                  value={village}
                  onChangeText={setVillage}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>{ui.householdHead}</Text>
                <TextInput
                  accessibilityLabel={ui.householdHead}
                  value={householdHead}
                  onChangeText={setHouseholdHead}
                  placeholder="Optional"
                  placeholderTextColor={ClinicalColors.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>{ui.phoneOptionalLabel}</Text>
                <TextInput
                  accessibilityLabel={ui.phoneOptionalLabel}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="98765-00000"
                  placeholderTextColor={ClinicalColors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            {category === 'PREGNANT_WOMAN' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{ui.eddLabel} (YYYY-MM-DD)</Text>
                <TextInput
                  accessibilityLabel={ui.eddLabel}
                  value={eddDate}
                  onChangeText={setEddDate}
                  placeholder="2027-02-15"
                  placeholderTextColor={ClinicalColors.textMuted}
                  style={styles.input}
                />
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
  input: {
    minHeight: TouchTargets.min,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.base,
    color: ClinicalColors.text,
    backgroundColor: ClinicalColors.canvas,
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
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
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
