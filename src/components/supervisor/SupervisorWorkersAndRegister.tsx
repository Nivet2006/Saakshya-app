import React, { useMemo, useState } from 'react';
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
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { EmptyState, GlassCard } from '@/components/ui/ClinicalUI';
import type { WorkerMetricsRow } from '@/lib/analytics/supervisor-metrics';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { VisitDraft } from '@/types';

export const AshaWorkerManagementView: React.FC<{
  workerRows: WorkerMetricsRow[];
  visits: VisitDraft[];
}> = ({ workerRows, visits }) => {
  const { ui } = useTranslation();
  const [selectedWorker, setSelectedWorker] = useState<WorkerMetricsRow | null>(null);

  const workerVisits = useMemo(() => {
    if (!selectedWorker) return [];
    return visits.filter(
      (v) =>
        v.asha_worker_id === selectedWorker.worker.id ||
        v.worker_name === selectedWorker.worker.full_name
    );
  }, [selectedWorker, visits]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{ui.ashaWorkersTitle}</Text>
        <Text style={styles.subtitle}>{ui.ashaWorkersSubtitle}</Text>
      </View>

      {workerRows.length === 0 ? (
        <EmptyState
          title="No ASHA workers assigned"
          description="Workers registered in this PHC sector will appear here."
          icon={<Users size={20} color={ClinicalColors.textSecondary} />}
        />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {workerRows.map((row) => (
            <GlassCard key={row.worker.id}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{row.worker.full_name}</Text>
                  <Text style={styles.workerCode}>{row.worker.worker_code}</Text>
                </View>
                <View
                  style={[
                    styles.onlineBadge,
                    {
                      backgroundColor: row.worker.is_online
                        ? ClinicalColors.successSoft
                        : ClinicalColors.slate100,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.onlineBadgeText,
                      {
                        color: row.worker.is_online
                          ? ClinicalColors.successDark
                          : ClinicalColors.textSecondary,
                      },
                    ]}
                  >
                    {row.worker.is_online ? ui.online : ui.offline}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 4, marginTop: Spacing.sm }}>
                <View style={styles.metaInline}>
                  <MapPin size={13} color={ClinicalColors.textSecondary} />
                  <Text style={styles.metaText}>{row.worker.assigned_area}</Text>
                </View>
                {row.worker.phone_number && (
                  <View style={styles.metaInline}>
                    <Phone size={13} color={ClinicalColors.textSecondary} />
                    <Text style={styles.metaText}>{row.worker.phone_number}</Text>
                  </View>
                )}
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{ui.householdsLabel}</Text>
                  <Text style={styles.statVal}>{row.assignedBeneficiaries}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{ui.visitsLoggedLabel}</Text>
                  <Text style={[styles.statVal, { color: ClinicalColors.primary }]}>
                    {row.completedVisits}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{ui.pendingTasksLabel}</Text>
                  <Text style={[styles.statVal, { color: ClinicalColors.warningDark }]}>
                    {row.pendingFollowUps}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{ui.activeAlertsLabel}</Text>
                  <Text
                    style={[
                      styles.statVal,
                      {
                        color:
                          row.activeAlerts > 0
                            ? ClinicalColors.danger
                            : ClinicalColors.text,
                      },
                    ]}
                  >
                    {row.activeAlerts}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedWorker(row)}
                style={styles.activityBtn}
              >
                <Text style={styles.activityBtnText}>{ui.viewWorkerActivity}</Text>
              </Pressable>
            </GlassCard>
          ))}
        </View>
      )}

      <Modal
        visible={Boolean(selectedWorker)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWorker(null)}
      >
        {selectedWorker && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{selectedWorker.worker.full_name}</Text>
                  <Text style={styles.metaText}>
                    {selectedWorker.worker.worker_code} ·{' '}
                    {selectedWorker.worker.assigned_area}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedWorker(null)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={ClinicalColors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ gap: Spacing.sm, paddingVertical: Spacing.md }}>
                <Text style={styles.sectionHeading}>
                  Recent Visits ({workerVisits.length})
                </Text>
                {workerVisits.length === 0 ? (
                  <Text style={styles.metaText}>No visits recorded by this worker yet.</Text>
                ) : (
                  workerVisits.map((v) => (
                    <View key={v.visit_id} style={styles.visitSubCard}>
                      <Text style={styles.workerName}>
                        {v.beneficiary_name || v.beneficiary_id} · {v.visit_type}
                      </Text>
                      <Text style={styles.metaText}>
                        {new Date(v.visit_date).toLocaleString()}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

export const SupervisorVisitRegisterView: React.FC<{
  visits: VisitDraft[];
  workers: WorkerMetricsRow[];
}> = ({ visits }) => {
  const { ui } = useTranslation();
  const [search, setSearch] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('ALL');
  const [dangerOnly, setDangerOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter((v) => {
      if (visitTypeFilter !== 'ALL' && v.visit_type !== visitTypeFilter) return false;
      if (dangerOnly && !v.danger_sign_flagged) return false;
      if (q) {
        const hay = `${v.beneficiary_name || ''} ${v.beneficiary_id || ''} ${
          v.visit_id
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visits, search, visitTypeFilter, dangerOnly]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{ui.fieldRegister}</Text>
        <Text style={styles.subtitle}>{ui.fieldRegisterSubtitle}</Text>
      </View>

      <GlassCard>
        <View style={{ gap: Spacing.sm }}>
          <View style={styles.searchBox}>
            <Search size={16} color={ClinicalColors.textMuted} />
            <TextInput
              accessibilityLabel="Search visits"
              value={search}
              onChangeText={setSearch}
              placeholder={ui.searchBeneficiariesPlaceholder}
              placeholderTextColor={ClinicalColors.textMuted}
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {(['ALL', 'ANC', 'PNC', 'Newborn', 'Immunisation'] as const).map((vt) => {
              const active = visitTypeFilter === vt;
              return (
                <Pressable
                  key={vt}
                  accessibilityRole="button"
                  onPress={() => setVisitTypeFilter(vt)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && { color: ClinicalColors.white },
                    ]}
                  >
                    {vt === 'ALL' ? ui.allVisitTypesFilter : vt}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.rowBetween}>
            <Text style={styles.metaText}>{ui.dangerFlaggedOnly}</Text>
            <Switch
              value={dangerOnly}
              onValueChange={setDangerOnly}
              trackColor={{
                false: ClinicalColors.border,
                true: ClinicalColors.danger,
              }}
            />
          </View>
        </View>
      </GlassCard>

      {filtered.length === 0 ? (
        <EmptyState
          title={ui.noSavedVisitsYet}
          description={ui.noSavedVisitsDesc}
          icon={<ClipboardList size={20} color={ClinicalColors.textSecondary} />}
        />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {filtered.map((v) => (
            <GlassCard key={v.visit_id || v.draft_id}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>
                    {v.beneficiary_name || 'Unlinked'} ({v.beneficiary_id || '—'})
                  </Text>
                  <Text style={styles.metaText}>
                    {ui.ashaWorkerCol}: {v.worker_name || v.asha_worker_id} ·{' '}
                    {new Date(v.visit_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.onlineBadge}>
                  <CheckCircle2 size={12} color={ClinicalColors.successDark} />
                  <Text style={styles.onlineBadgeText}>{v.status}</Text>
                </View>
              </View>

              <View style={styles.regMetaRow}>
                <Text style={styles.metaChip}>
                  {ui.colType}: {v.visit_type || 'General'}
                </Text>
                <Text style={styles.metaChip}>
                  {ui.colWeight}: {v.weight_kg !== null ? `${v.weight_kg} kg` : '—'}
                </Text>
                {v.danger_sign_flagged && (
                  <View style={styles.dangerTag}>
                    <AlertTriangle size={12} color={ClinicalColors.dangerDark} />
                    <Text style={styles.dangerTagText}>Flagged</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  workerName: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  workerCode: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: ClinicalColors.successSoft,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.successDark,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statBox: {
    width: '47%',
    flexGrow: 1,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
  },
  statLabel: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  statVal: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
    marginTop: 2,
  },
  activityBtn: {
    minHeight: TouchTargets.min,
    marginTop: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
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
    maxHeight: '80%',
  },
  closeBtn: {
    minWidth: TouchTargets.min,
    minHeight: TouchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  visitSubCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    gap: 3,
  },
  searchBox: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.canvas,
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
  filterChip: {
    minHeight: 38,
    paddingHorizontal: 12,
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
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  regMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metaChip: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
    backgroundColor: ClinicalColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  dangerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ClinicalColors.dangerContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  dangerTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
});

