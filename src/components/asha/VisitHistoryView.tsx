import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlertTriangle, CheckCircle2, FileText, X } from 'lucide-react-native';
import { EmptyState, GlassCard } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { VisitDraft } from '@/types';

interface VisitHistoryViewProps {
  visits: VisitDraft[];
  onClearVisits?: () => void;
}

export const VisitHistoryView: React.FC<VisitHistoryViewProps> = ({
  visits,
  onClearVisits,
}) => {
  const { ui } = useTranslation();
  const [selectedVisit, setSelectedVisit] = useState<VisitDraft | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ui.visitHistoryTitle}</Text>
          <Text style={styles.subtitle}>{ui.visitHistorySubtitle}</Text>
        </View>
        {visits.length > 0 && onClearVisits && (
          <Pressable
            accessibilityRole="button"
            onPress={onClearVisits}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>{ui.clearAllVisits}</Text>
          </Pressable>
        )}
      </View>

      {visits.length === 0 ? (
        <EmptyState
          title={ui.noSavedVisitsYet}
          description={ui.noSavedVisitsDesc}
          icon={<FileText size={20} color={ClinicalColors.textSecondary} />}
        />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {visits.map((v) => (
            <GlassCard key={v.visit_id || v.draft_id}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benName}>
                    {v.beneficiary_name || ui.unlinkedLabel}
                  </Text>
                  <Text style={styles.metaText}>
                    {v.beneficiary_id || '—'} ·{' '}
                    {new Date(v.visit_date).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.statusPill}>
                  <CheckCircle2 size={12} color={ClinicalColors.successDark} />
                  <Text style={styles.statusPillText}>{v.status}</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailChip}>
                  {ui.colType}: {v.visit_type || ui.generalLabel}
                </Text>
                <Text style={styles.detailChip}>
                  {ui.colWeight}: {v.weight_kg !== null ? `${v.weight_kg} kg` : '—'}
                </Text>
                {v.danger_sign_flagged ? (
                  <View style={styles.dangerBadge}>
                    <AlertTriangle size={12} color={ClinicalColors.dangerDark} />
                    <Text style={styles.dangerBadgeText}>{ui.flaggedStatus}</Text>
                  </View>
                ) : (
                  <Text style={styles.clearText}>{ui.clearStatus}</Text>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedVisit(v)}
                style={styles.inspectBtn}
              >
                <Text style={styles.inspectBtnText}>{ui.inspectButton}</Text>
              </Pressable>
            </GlassCard>
          ))}
        </View>
      )}

      <Modal
        visible={Boolean(selectedVisit)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedVisit(null)}
      >
        {selectedVisit && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {ui.visitRecordTitle} · {selectedVisit.visit_id}
                  </Text>
                  <Text style={styles.metaText}>
                    {selectedVisit.beneficiary_name} ({selectedVisit.beneficiary_id})
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedVisit(null)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={ClinicalColors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ gap: Spacing.sm, paddingVertical: Spacing.md }}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.visitTypeLabel}</Text>
                  <Text style={styles.kvVal}>{selectedVisit.visit_type || '—'}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.weightLabel}</Text>
                  <Text style={styles.kvVal}>
                    {selectedVisit.weight_kg !== null ? `${selectedVisit.weight_kg} kg` : '—'}
                  </Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.vaccinationsCompleted}</Text>
                  <Text style={styles.kvVal}>
                    {selectedVisit.vaccinations_completed.join(', ') || '—'}
                  </Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.vaccinationsDue}</Text>
                  <Text style={styles.kvVal}>
                    {selectedVisit.vaccinations_due.join(', ') || '—'}
                  </Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.nextVisitDateLabel}</Text>
                  <Text style={styles.kvVal}>{selectedVisit.next_visit_date || '—'}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{ui.persistenceRef}</Text>
                  <Text style={styles.kvVal}>
                    {selectedVisit.persistence_record_id || 'Local'}
                  </Text>
                </View>

                {selectedVisit.raw_transcript_summary && (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.kvLabel}>{ui.summaryTranscript}:</Text>
                    <Text style={styles.transcriptText}>
                      {selectedVisit.raw_transcript_summary}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
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
  clearBtn: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.dangerSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.dangerContainer,
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  benName: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  metaText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ClinicalColors.successSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.successContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusPillText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.successDark,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  detailChip: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
    backgroundColor: ClinicalColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  dangerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ClinicalColors.dangerContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  dangerBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  clearText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.successDark,
  },
  inspectBtn: {
    minHeight: 40,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  inspectBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: ClinicalColors.backdropOverlay,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: ClinicalColors.card,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    maxHeight: '85%',
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
    fontSize: Typography.lg,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  closeBtn: {
    minWidth: TouchTargets.min,
    minHeight: TouchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kvLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  kvVal: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  transcriptBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    gap: 4,
    marginTop: 4,
  },
  transcriptText: {
    fontSize: Typography.xs,
    color: ClinicalColors.text,
    lineHeight: 18,
  },
});
