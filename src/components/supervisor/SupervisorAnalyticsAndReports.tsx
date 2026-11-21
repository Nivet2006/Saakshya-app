import React from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart3, Download, FileSpreadsheet, Shield } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/ClinicalUI';
import {
  buildVisitsCsv,
  type DailyVisitVolumeItem,
  type SupervisorOverviewStats,
  type VisitTypeBreakdownItem,
  type WorkerMetricsRow,
} from '@/lib/analytics/supervisor-metrics';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { AuditLogEntry, DangerAlert, UserProfile, VisitDraft } from '@/types';

export const SupervisorAnalyticsView: React.FC<{
  stats: SupervisorOverviewStats;
  dailyVolume: DailyVisitVolumeItem[];
  typeDistribution: VisitTypeBreakdownItem[];
  workerRows: WorkerMetricsRow[];
  dangerAlerts: DangerAlert[];
}> = ({ stats, dailyVolume, typeDistribution, workerRows, dangerAlerts }) => {
  const { ui } = useTranslation();
  const maxDaily = Math.max(1, ...dailyVolume.map((d) => d.count));

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{ui.analyticsTitle}</Text>
        <Text style={styles.subtitle}>{ui.analyticsSubtitle}</Text>
      </View>

      {/* 7-Day Daily Visit Volume Chart */}
      <GlassCard>
        <View style={styles.cardHeader}>
          <BarChart3 size={16} color={ClinicalColors.primary} />
          <Text style={styles.cardTitle}>{ui.analyticsDailyVolumeTitle}</Text>
        </View>

        <View style={styles.barChartRow}>
          {dailyVolume.map((item) => {
            const barHeightPct = Math.round((item.count / maxDaily) * 100);
            return (
              <View key={item.date} style={styles.barCol}>
                <Text style={styles.barCount}>{item.count}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(item.count > 0 ? 14 : 3, barHeightPct)}%`,
                        backgroundColor:
                          item.dangerCount > 0
                            ? ClinicalColors.danger
                            : ClinicalColors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </GlassCard>

      {/* Visit Type Distribution */}
      <GlassCard>
        <Text style={styles.cardTitle}>{ui.analyticsVisitMixTitle}</Text>
        <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          {typeDistribution.map((row) => (
            <View key={row.label} style={{ gap: 4 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.progressLabel}>{row.label}</Text>
                <Text style={styles.progressVal}>
                  {row.count} ({row.pct}%)
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFillSky, { width: `${row.pct}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </GlassCard>

      {/* Coverage & Follow-Up Gauges */}
      <GlassCard>
        <Text style={styles.cardTitle}>{ui.analyticsCoverageTitle}</Text>
        <View style={{ gap: Spacing.md, marginTop: Spacing.sm }}>
          <View style={{ gap: 4 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.progressLabel}>{ui.analyticsDosesAdministered}</Text>
              <Text style={styles.progressVal}>{stats.immunisationCoveragePct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFillTeal,
                  { width: `${stats.immunisationCoveragePct}%` },
                ]}
              />
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.progressLabel}>{ui.analyticsFollowUpCompletion}</Text>
              <Text style={styles.progressVal}>{stats.followUpCompletionPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFillSky,
                  { width: `${stats.followUpCompletionPct}%` },
                ]}
              />
            </View>
          </View>

          <Text style={styles.metaText}>
            {ui.activeDangerSigns}: {dangerAlerts.length} ({stats.activeDangerAlerts})
          </Text>
        </View>
      </GlassCard>

      {/* Worker Activity Comparison */}
      <GlassCard>
        <Text style={styles.cardTitle}>{ui.analyticsWorkerActivityTitle}</Text>
        <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          {workerRows.map((w) => (
            <View key={w.worker.id} style={styles.workerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.progressLabel}>{w.worker.full_name}</Text>
                <Text style={styles.metaText}>
                  {w.assignedBeneficiaries} {ui.householdsLabel}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.progressVal}>
                  {w.completedVisits} {ui.visitsLoggedLabel}
                </Text>
                <Text style={styles.metaText}>
                  {w.pendingFollowUps} {ui.pendingTasksLabel}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </GlassCard>
    </View>
  );
};

export const SupervisorReportsView: React.FC<{
  visits: VisitDraft[];
  workers: UserProfile[];
  auditLogs: AuditLogEntry[];
}> = ({ visits, auditLogs }) => {
  const { ui } = useTranslation();

  const handleExportCsv = async () => {
    const csv = buildVisitsCsv(visits);
    try {
      await Share.share({
        title: 'PHC Visit Register CSV',
        message: csv,
      });
    } catch {
      // ignore share cancel
    }
  };

  const dangerCount = visits.filter((v) => v.danger_sign_flagged).length;

  return (
    <View style={styles.container}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ui.reportsAuditTitle}</Text>
          <Text style={styles.subtitle}>{ui.reportsAuditSubtitle}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.exportCsv}
          onPress={handleExportCsv}
          style={styles.exportBtn}
        >
          <Download size={15} color={ClinicalColors.white} />
          <Text style={styles.exportBtnText}>{ui.exportCsv}</Text>
        </Pressable>
      </View>

      {/* Report Totals */}
      <GlassCard>
        <View style={styles.cardHeader}>
          <FileSpreadsheet size={16} color={ClinicalColors.primary} />
          <Text style={styles.cardTitle}>{ui.reportTotalsTitle}</Text>
        </View>

        <View style={styles.totalsRow}>
          <View style={styles.totalBox}>
            <Text style={styles.metaText}>{ui.filteredVisitsLabel}</Text>
            <Text style={styles.totalVal}>{visits.length}</Text>
          </View>
          <View style={[styles.totalBox, { backgroundColor: ClinicalColors.dangerSoft }]}>
            <Text style={[styles.metaText, { color: ClinicalColors.dangerDark }]}>
              {ui.dangerSignVisitsLabel}
            </Text>
            <Text style={[styles.totalVal, { color: ClinicalColors.dangerDark }]}>
              {dangerCount}
            </Text>
          </View>
          <View style={[styles.totalBox, { backgroundColor: ClinicalColors.successSoft }]}>
            <Text style={[styles.metaText, { color: ClinicalColors.successDark }]}>
              {ui.routineSafeLabel}
            </Text>
            <Text style={[styles.totalVal, { color: ClinicalColors.successDark }]}>
              {visits.length - dangerCount}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Immutable Audit Trail */}
      <GlassCard>
        <View style={styles.cardHeader}>
          <Shield size={16} color={ClinicalColors.primary} />
          <Text style={styles.cardTitle}>
            {ui.systemAuditTrailTitle} ({auditLogs.length})
          </Text>
        </View>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          {auditLogs.slice(0, 15).map((log) => (
            <View key={log.id} style={styles.auditRow}>
              <Text style={styles.auditAction}>{log.action_type}</Text>
              <Text style={styles.auditSummary}>{log.summary}</Text>
              <Text style={styles.metaText}>
                by {log.actor_name} · {new Date(log.created_at).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    marginTop: Spacing.md,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barCount: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.textSecondary,
  },
  barTrack: {
    width: 24,
    height: 100,
    borderRadius: 6,
    backgroundColor: ClinicalColors.slate100,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    color: ClinicalColors.textSecondary,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  progressLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  progressVal: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: ClinicalColors.slate100,
    overflow: 'hidden',
  },
  progressFillTeal: {
    height: '100%',
    backgroundColor: ClinicalColors.primary,
  },
  progressFillSky: {
    height: '100%',
    backgroundColor: ClinicalColors.secondary,
  },
  metaText: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  workerRow: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exportBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  totalBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.canvas,
    alignItems: 'center',
    gap: 4,
  },
  totalVal: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  auditRow: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
    gap: 2,
  },
  auditAction: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  auditSummary: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
});

