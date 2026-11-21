import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  Calendar,
  MapPin,
  Mic,
  Phone,
  Search,
  Syringe,
  User,
  UserPlus,
  X,
} from 'lucide-react-native';
import { AddPatientModal, type NewPatientInput } from '@/components/asha/AddPatientModal';
import { EmptyState, GlassCard } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type {
  Beneficiary,
  FollowUpTask,
  ImmunisationScheduleItem,
  LanguageCode,
  VisitDraft,
} from '@/types';

interface BeneficiaryDirectoryViewProps {
  beneficiaries: Beneficiary[];
  visits: VisitDraft[];
  followUps: FollowUpTask[];
  immunisations: ImmunisationScheduleItem[];
  onStartVoiceVisit: (beneficiary: Beneficiary) => void;
  onAddBeneficiary?: (input: NewPatientInput) => Promise<Beneficiary>;
  currentLanguage?: LanguageCode;
}

export const BeneficiaryDirectoryView: React.FC<BeneficiaryDirectoryViewProps> = ({
  beneficiaries,
  visits,
  followUps,
  immunisations,
  onStartVoiceVisit,
  onAddBeneficiary,
  currentLanguage = 'hi-IN',
}) => {
  const { ui } = useTranslation(currentLanguage);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedProfile, setSelectedProfile] = useState<Beneficiary | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return beneficiaries.filter((b) => {
      const matchQuery =
        !q ||
        b.full_name.toLowerCase().includes(q) ||
        b.beneficiary_id.toLowerCase().includes(q) ||
        b.village.toLowerCase().includes(q);
      if (!matchQuery) return false;
      if (categoryFilter === 'HIGH_RISK') return b.high_risk_status;
      if (categoryFilter !== 'ALL' && b.category !== categoryFilter) return false;
      return true;
    });
  }, [beneficiaries, search, categoryFilter]);

  const profileVisits = useMemo(() => {
    if (!selectedProfile) return [];
    return visits.filter(
      (v) =>
        v.beneficiary_id === selectedProfile.beneficiary_id ||
        v.beneficiary_uuid === selectedProfile.id
    );
  }, [selectedProfile, visits]);

  const profileFollowUps = useMemo(() => {
    if (!selectedProfile) return [];
    return followUps.filter(
      (f) =>
        f.beneficiary_id === selectedProfile.beneficiary_id ||
        f.beneficiary_uuid === selectedProfile.id
    );
  }, [selectedProfile, followUps]);

  const profileImmunisations = useMemo(() => {
    if (!selectedProfile) return [];
    return immunisations.filter(
      (i) =>
        i.beneficiary_id === selectedProfile.beneficiary_id ||
        i.beneficiary_uuid === selectedProfile.id
    );
  }, [selectedProfile, immunisations]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ui.beneficiaryDirectoryTitle}</Text>
          <Text style={styles.subtitle}>{ui.beneficiaryDirectorySubtitle}</Text>
        </View>
        {onAddBeneficiary && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.addNewPatientBtn}
            onPress={() => setShowAddModal(true)}
            style={styles.addBtn}
          >
            <UserPlus size={16} color={ClinicalColors.white} />
            <Text style={styles.addBtnText}>{ui.addNewPatientBtn}</Text>
          </Pressable>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Search size={16} color={ClinicalColors.textMuted} />
        <TextInput
          accessibilityLabel={ui.searchBeneficiariesPlaceholder}
          value={search}
          onChangeText={setSearch}
          placeholder={ui.searchBeneficiariesPlaceholder}
          placeholderTextColor={ClinicalColors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {[
          { id: 'ALL', label: ui.allBeneficiaries },
          { id: 'HIGH_RISK', label: ui.highRiskWatch },
          { id: 'PREGNANT_WOMAN', label: ui.ancFilter },
          { id: 'LACTATING_MOTHER', label: ui.pncFilter },
          { id: 'INFANT', label: ui.infantFilter },
          { id: 'CHILD', label: ui.childFilter },
        ].map((chip) => {
          const active = categoryFilter === chip.id;
          return (
            <Pressable
              key={chip.id}
              accessibilityRole="button"
              onPress={() => setCategoryFilter(chip.id)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && { color: ClinicalColors.white },
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          title={ui.noMatchingBeneficiaries}
          description={ui.noMatchingBeneficiariesDesc}
          icon={<User size={20} color={ClinicalColors.textSecondary} />}
        />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {filtered.map((ben) => (
            <GlassCard key={ben.beneficiary_id}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benName}>{ben.full_name}</Text>
                  <View style={styles.idTag}>
                    <Text style={styles.idTagText}>{ben.beneficiary_id}</Text>
                  </View>
                </View>
                {ben.high_risk_status && (
                  <View style={styles.highRiskPill}>
                    <AlertCircle size={12} color={ClinicalColors.dangerDark} />
                    <Text style={styles.highRiskPillText}>{ui.highRisk}</Text>
                  </View>
                )}
              </View>

              <View style={styles.metaList}>
                <Text style={styles.metaText}>
                  {ben.category.toLowerCase().replace(/_/g, ' ')} ·{' '}
                  {ben.age_years > 0 ? `${ben.age_years} ${ui.yrsLabel}` : ui.infantNewborn}
                </Text>
                <View style={styles.metaInline}>
                  <MapPin size={13} color={ClinicalColors.textSecondary} />
                  <Text style={styles.metaText}>{ben.village}</Text>
                </View>
                {ben.edd_date && (
                  <View style={styles.metaInline}>
                    <Calendar size={13} color={ClinicalColors.primary} />
                    <Text style={styles.eddText}>
                      {ui.eddLabel}: {ben.edd_date}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedProfile(ben)}
                  style={styles.profileBtn}
                >
                  <Text style={styles.profileBtnText}>{ui.viewProfile}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onStartVoiceVisit(ben)}
                  style={styles.voiceBtn}
                >
                  <Mic size={15} color={ClinicalColors.white} />
                  <Text style={styles.voiceBtnText}>{ui.voiceVisitButton}</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </View>
      )}

      {/* Beneficiary Profile Modal Sheet */}
      <Modal
        visible={Boolean(selectedProfile)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProfile(null)}
      >
        {selectedProfile && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idTagText}>{selectedProfile.beneficiary_id}</Text>
                  <Text style={styles.modalTitle}>{selectedProfile.full_name}</Text>
                  <Text style={styles.metaText}>
                    {selectedProfile.village} · {ui.householdHead}:{' '}
                    {selectedProfile.household_head || '—'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedProfile(null)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={ClinicalColors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ gap: Spacing.md, paddingVertical: Spacing.md }}>
                {selectedProfile.phone_number && (
                  <View style={styles.metaInline}>
                    <Phone size={14} color={ClinicalColors.textSecondary} />
                    <Text style={styles.metaText}>{selectedProfile.phone_number}</Text>
                  </View>
                )}

                <View style={{ gap: 6 }}>
                  <Text style={styles.sectionTitle}>
                    {ui.visitHistoryTitle} ({profileVisits.length})
                  </Text>
                  {profileVisits.length === 0 ? (
                    <Text style={styles.emptySmall}>{ui.noRecordedVisitsYet}</Text>
                  ) : (
                    profileVisits.map((v) => (
                      <View key={v.visit_id || v.draft_id} style={styles.subCard}>
                        <Text style={styles.subCardBold}>
                          {v.visit_type || ui.visitTypeLabel} ·{' '}
                          {new Date(v.visit_date).toLocaleDateString()}
                        </Text>
                        {v.weight_kg !== null && (
                          <Text style={styles.metaText}>
                            {ui.weightLabel}: {v.weight_kg} kg
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </View>

                <View style={{ gap: 6 }}>
                  <View style={styles.metaInline}>
                    <Syringe size={15} color={ClinicalColors.primary} />
                    <Text style={styles.sectionTitle}>
                      {ui.immunisationRecordsTitle} ({profileImmunisations.length})
                    </Text>
                  </View>
                  {profileImmunisations.length === 0 ? (
                    <Text style={styles.emptySmall}>{ui.noScheduledVaccines}</Text>
                  ) : (
                    profileImmunisations.map((im) => (
                      <View key={im.id} style={styles.subCardRow}>
                        <View>
                          <Text style={styles.subCardBold}>
                            {im.vaccine_name} (Dose {im.dose_number})
                          </Text>
                          <Text style={styles.metaText}>
                            {ui.dueLabel}: {im.due_date}
                          </Text>
                        </View>
                        <Text style={styles.imStatus}>{im.status}</Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={styles.sectionTitle}>
                    {ui.followUpsHeading} ({profileFollowUps.length})
                  </Text>
                  {profileFollowUps.length === 0 ? (
                    <Text style={styles.emptySmall}>{ui.noFollowUpsRecorded}</Text>
                  ) : (
                    profileFollowUps.map((f) => (
                      <View key={f.id} style={styles.subCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subCardBold}>{f.task_type}</Text>
                          <Text style={styles.metaText}>
                            {ui.dueLabel}: {f.due_date}
                          </Text>
                        </View>
                        <Text style={styles.imStatus}>{f.status}</Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const target = selectedProfile;
                  setSelectedProfile(null);
                  onStartVoiceVisit(target);
                }}
                style={styles.voiceBtnFull}
              >
                <Mic size={16} color={ClinicalColors.white} />
                <Text style={styles.voiceBtnText}>
                  {ui.startVoiceVisit} · {selectedProfile.full_name}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      {onAddBeneficiary && (
        <AddPatientModal
          open={showAddModal}
          defaultLanguage={currentLanguage}
          onClose={() => setShowAddModal(false)}
          onSave={onAddBeneficiary}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  searchBox: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    color: ClinicalColors.text,
  },
  chipsRow: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  filterChipText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  benName: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  idTag: {
    alignSelf: 'flex-start',
    backgroundColor: ClinicalColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  idTagText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  highRiskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ClinicalColors.dangerContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  highRiskPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  metaList: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    textTransform: 'capitalize',
  },
  eddText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.primary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
  },
  profileBtn: {
    flex: 1,
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  voiceBtn: {
    flex: 1,
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  voiceBtnFull: {
    minHeight: TouchTargets.comfortable,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voiceBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: ClinicalColors.backdropOverlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: ClinicalColors.card,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    padding: Spacing.xl,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
  },
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: ClinicalColors.text,
    marginTop: 2,
  },
  closeBtn: {
    minWidth: TouchTargets.min,
    minHeight: TouchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  emptySmall: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    fontStyle: 'italic',
  },
  subCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    gap: 3,
  },
  subCardRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subCardBold: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  imStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
});

