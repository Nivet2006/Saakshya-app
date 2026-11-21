import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { AddPatientModal, type NewPatientInput } from '@/components/asha/AddPatientModal';
import { GlassCard } from '@/components/ui/ClinicalUI';
import type { ClarificationCandidateV1 } from '@/lib/contracts/v1';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { Beneficiary, LanguageCode } from '@/types';

interface BeneficiarySelectorProps {
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary | null;
  recentBeneficiaryIds?: string[];
  onSelect: (beneficiary: Beneficiary | null) => void;
  onAddBeneficiary?: (input: NewPatientInput) => Promise<Beneficiary>;
  currentLanguage?: LanguageCode;
  ambiguousCandidates?: ClarificationCandidateV1[];
  onSelectCandidate?: (candidate: ClarificationCandidateV1) => void;
  disabled?: boolean;
}

export const BeneficiarySelector: React.FC<BeneficiarySelectorProps> = ({
  beneficiaries,
  selectedBeneficiary,
  recentBeneficiaryIds = [],
  onSelect,
  onAddBeneficiary,
  currentLanguage = 'hi-IN',
  ambiguousCandidates,
  onSelectCandidate,
  disabled = false,
}) => {
  const { ui } = useTranslation(currentLanguage);
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return beneficiaries;
    return beneficiaries.filter(
      (b) =>
        b.full_name.toLowerCase().includes(q) ||
        b.beneficiary_id.toLowerCase().includes(q) ||
        b.village.toLowerCase().includes(q)
    );
  }, [beneficiaries, query]);

  const recentList = useMemo(() => {
    if (!recentBeneficiaryIds.length) return beneficiaries.slice(0, 3);
    const matches = recentBeneficiaryIds
      .map((id) => beneficiaries.find((b) => b.beneficiary_id === id))
      .filter((b): b is Beneficiary => !!b);
    return matches.length > 0 ? matches : beneficiaries.slice(0, 3);
  }, [beneficiaries, recentBeneficiaryIds]);

  const formatCategory = (cat: Beneficiary['category']): string => {
    switch (cat) {
      case 'PREGNANT_WOMAN':
        return ui.categoryAncBeneficiary;
      case 'LACTATING_MOTHER':
        return ui.categoryPncMother;
      case 'INFANT':
        return ui.categoryNewbornInfant;
      case 'CHILD':
        return ui.categoryChild;
      default:
        return ui.categoryBeneficiary;
    }
  };

  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ui.step1Title}</Text>
          <Text style={styles.subtitle}>{ui.step1Subtitle}</Text>
        </View>

        <View style={styles.headerActions}>
          {onAddBeneficiary && !disabled && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ui.addNewPatientBtn}
              onPress={() => setShowAddModal(true)}
              style={styles.addBtn}
            >
              <UserPlus size={14} color={ClinicalColors.primary} />
              <Text style={styles.addBtnText}>{ui.addNewPatientBtn}</Text>
            </Pressable>
          )}
          {selectedBeneficiary && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ui.changeBeneficiary}
              disabled={disabled}
              onPress={() => onSelect(null)}
              style={styles.changeBtn}
            >
              <Text style={styles.changeBtnText}>{ui.changeBeneficiary}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Ambiguous Beneficiary Clarification Prompt from Agent 1 */}
      {ambiguousCandidates && ambiguousCandidates.length > 0 && onSelectCandidate && (
        <View accessibilityRole="alert" style={styles.ambiguousBox}>
          <View style={styles.ambiguousHeader}>
            <AlertCircle size={16} color={ClinicalColors.warningDark} />
            <Text style={styles.ambiguousTitle}>{ui.multipleBeneficiaryMatch}</Text>
          </View>
          <View style={styles.candidateRow}>
            {ambiguousCandidates.map((cand) => (
              <Pressable
                key={cand.id}
                accessibilityRole="button"
                onPress={() => onSelectCandidate(cand)}
                style={styles.candidateBtn}
              >
                <Text style={styles.candidateBtnText}>
                  {cand.label} ({cand.id}){cand.detail ? ` · ${cand.detail}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Selected Compact Beneficiary Card */}
      {selectedBeneficiary ? (
        <View style={styles.selectedCard}>
          <View style={styles.selectedLeft}>
            <View style={styles.avatarCircle}>
              <UserCheck size={20} color={ClinicalColors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.selectedName}>{selectedBeneficiary.full_name}</Text>
                <View style={styles.benIdBadge}>
                  <Text style={styles.benIdBadgeText}>
                    {selectedBeneficiary.beneficiary_id}
                  </Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {formatCategory(selectedBeneficiary.category)} ·
                </Text>
                <MapPin size={12} color={ClinicalColors.textSecondary} />
                <Text style={styles.metaText}>{selectedBeneficiary.village}</Text>
              </View>
            </View>
          </View>
          <CheckCircle2 size={22} color={ClinicalColors.primary} />
        </View>
      ) : (
        <View style={{ gap: Spacing.md }}>
          {/* Search Input */}
          <View style={styles.searchWrap}>
            <Search size={16} color={ClinicalColors.textMuted} />
            <TextInput
              accessibilityLabel="Search beneficiary by name, ID, or village"
              editable={!disabled}
              value={query}
              onChangeText={setQuery}
              placeholder={ui.searchDirectoryPlaceholder}
              placeholderTextColor={ClinicalColors.textMuted}
              style={styles.searchInput}
            />
          </View>

          {/* Recently Visited Quick Chips */}
          {!query && recentList.length > 0 && (
            <View style={{ gap: 6 }}>
              <View style={styles.recentHeader}>
                <Users size={13} color={ClinicalColors.textSecondary} />
                <Text style={styles.recentHeaderLabel}>{ui.quickSelectRecent}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.sm }}
              >
                {recentList.map((ben) => (
                  <Pressable
                    key={ben.beneficiary_id}
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => onSelect(ben)}
                    style={styles.recentChip}
                  >
                    <View style={styles.recentChipTop}>
                      <Text style={styles.recentName} numberOfLines={1}>
                        {ben.full_name}
                      </Text>
                      <Text style={styles.recentCode}>{ben.beneficiary_id}</Text>
                    </View>
                    <Text style={styles.recentSub} numberOfLines={1}>
                      {formatCategory(ben.category)} · {ben.village}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selectable Directory List */}
          <View style={styles.listContainer}>
            {filtered.map((ben) => (
              <Pressable
                key={ben.beneficiary_id}
                accessibilityRole="button"
                accessibilityLabel={`Select ${ben.full_name}, ${ben.beneficiary_id}`}
                disabled={disabled}
                onPress={() => onSelect(ben)}
                style={styles.listItem}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.listName}>{ben.full_name}</Text>
                    {ben.high_risk_status && (
                      <View style={styles.highRiskBadge}>
                        <Text style={styles.highRiskText}>{ui.highRisk}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.listSub}>
                    {formatCategory(ben.category)} · {ben.village}
                  </Text>
                </View>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>{ben.beneficiary_id}</Text>
                </View>
              </Pressable>
            ))}

            {filtered.length === 0 && (
              <Text style={styles.emptySearchText}>{ui.noMatchingBeneficiaries}</Text>
            )}
          </View>
        </View>
      )}

      {onAddBeneficiary && (
        <AddPatientModal
          open={showAddModal}
          defaultLanguage={currentLanguage}
          onClose={() => setShowAddModal(false)}
          onSave={async (input) => {
            const created = await onAddBeneficiary(input);
            onSelect(created);
            return created;
          }}
        />
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primarySoft,
    borderWidth: 1,
    borderColor: ClinicalColors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  changeBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  changeBtnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.secondary,
  },
  ambiguousBox: {
    backgroundColor: ClinicalColors.warningSoft,
    borderWidth: 2,
    borderColor: ClinicalColors.warning,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ambiguousHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ambiguousTitle: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
    flex: 1,
  },
  candidateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  candidateBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.white,
    borderWidth: 1,
    borderColor: ClinicalColors.warning,
    justifyContent: 'center',
  },
  candidateBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
  selectedCard: {
    backgroundColor: ClinicalColors.glassTeal,
    borderWidth: 2,
    borderColor: ClinicalColors.primary,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ClinicalColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedName: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  benIdBadge: {
    backgroundColor: ClinicalColors.white,
    borderWidth: 1,
    borderColor: ClinicalColors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  benIdBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
  },
  searchWrap: {
    minHeight: TouchTargets.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.canvas,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    color: ClinicalColors.text,
    paddingVertical: 8,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recentHeaderLabel: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.textSecondary,
    textTransform: 'uppercase',
  },
  recentChip: {
    width: 185,
    minHeight: TouchTargets.min,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  recentChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  recentName: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
    flex: 1,
  },
  recentCode: {
    fontSize: 10,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
    backgroundColor: ClinicalColors.slate100,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recentSub: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    gap: Spacing.xs,
  },
  listItem: {
    minHeight: TouchTargets.comfortable,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  listName: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  highRiskBadge: {
    backgroundColor: ClinicalColors.dangerContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  highRiskText: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  listSub: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  codePill: {
    backgroundColor: ClinicalColors.primarySoft,
    borderWidth: 1,
    borderColor: ClinicalColors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  codePillText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  emptySearchText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});

