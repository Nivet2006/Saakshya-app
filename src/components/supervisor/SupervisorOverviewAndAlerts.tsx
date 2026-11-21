import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Radio,
  ShieldCheck,
  Syringe,
  Users,
} from 'lucide-react-native';
import { DangerAlertBanner } from '@/components/DangerAlertBanner';
import type { SupervisorNavSection } from '@/components/layout/AppShell';
import { EmptyState, GlassCard } from '@/components/ui/ClinicalUI';
import type { SupervisorOverviewStats } from '@/lib/analytics/supervisor-metrics';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { DangerAlert, LanguageCode, UserProfile, VisitDraft } from '@/types';

interface SupervisorOverviewViewProps {
  profile: UserProfile;
  stats: SupervisorOverviewStats;
  dangerAlerts: DangerAlert[];
  recentVisits: VisitDraft[];
  language: LanguageCode;
  realtimeConnected: boolean;
  onAcknowledgeAlert: (alertId: string) => void;
  onUpdateAlertStatus: (alertId: string, nextStatus: DangerAlert['status']) => void;
  onNavigateSection: (sec: SupervisorNavSection) => void;
}

export const SupervisorOverviewView: React.FC<SupervisorOverviewViewProps> = ({
  profile,
  stats,
  dangerAlerts,
  recentVisits,
  language,
  realtimeConnected,
  onAcknowledgeAlert,
  onUpdateAlertStatus,
  onNavigateSection,
}) => {
  const { ui } = useTranslation(language);
  const activeAlerts = dangerAlerts.filter((a) => a.status === 'active');

  return (
    <View style={styles.container}>
      {/* Operational Command Header */}
      <View style={styles.commandHeader}>
        <View style={{ gap: 6 }}>
          <View style={styles.headerBadgesRow}>
            <View style={styles.phcPill}>
              <Building2 size={13} color={ClinicalColors.primaryContainer} />
              <Text style={styles.phcPillText}>{profile.phc_name}</Text>
            </View>
            <View style={styles.livePill}>
              <Radio size={12} color={ClinicalColors.successContainer} />
              <Text style={styles.livePillText}>
                {realtimeConnected ? 'Supabase Realtime' : 'Local Live Sync'}
              </Text>
            </View>
          </View>
          <Text style={styles.commandTitle}>{ui.commandCenterTitle}</Text>
          <Text style={styles.commandSub}>{ui.commandCenterSubtitle}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateSection('alerts')}
          style={styles.alertCmdBtn}
        >
          <AlertTriangle size={16} color={ClinicalColors.white} />
          <Text style={styles.alertCmdBtnText}>
            {ui.alertCommandButton} ({stats.activeDangerAlerts})
          </Text>
        </Pressable>
      </View>

      {/* 8 Real Operational Metrics */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label={ui.registeredBeneficiaries}
          value={stats.totalBeneficiaries}
          sub="Active PHC directory"
          icon={<Users size={16} color={ClinicalColors.primary} />}
        />
        <KpiCard
          label={ui.activeWorkers}
          value={`${stats.onlineAshaWorkers}/${stats.activeAshaWorkers}`}
          sub="Online / Assigned"
          icon={<CheckCircle2 size={16} color={ClinicalColors.success} />}
        />
        <KpiCard
          label={ui.totalVisits}
          value={stats.visitsCompletedToday}
          sub={`${stats.totalCommittedVisits} ${ui.totalLogged}`}
          icon={<ClipboardList size={16} color={ClinicalColors.secondary} />}
        />
        <KpiCard
          label={ui.navOfflineDrafts}
          value={stats.pendingDraftVisits}
          sub={ui.unsubmittedDraft}
          icon={<CalendarClock size={16} color={ClinicalColors.textSecondary} />}
        />
        <KpiCard
          label={ui.overdueTab}
          value={stats.overdueFollowUps}
          sub={`${stats.followUpCompletionPct}%`}
          icon={<CalendarClock size={16} color={ClinicalColors.warning} />}
          highlight={stats.overdueFollowUps > 0 ? 'warning' : undefined}
        />
        <KpiCard
          label={ui.pendingVaccinesTab}
          value={stats.upcomingImmunisations}
          sub={`${stats.immunisationCoveragePct}%`}
          icon={<Syringe size={16} color={ClinicalColors.secondary} />}
        />
        <KpiCard
          label={ui.activeDangerSigns}
          value={stats.activeDangerAlerts}
          sub={ui.urgentDangerSign}
          icon={<AlertTriangle size={16} color={ClinicalColors.danger} />}
          highlight={stats.activeDangerAlerts > 0 ? 'danger' : undefined}
        />
        <KpiCard
          label={ui.urgentPhcReferral}
          value={stats.referredOrAcknowledgedAlerts}
          sub={ui.acknowledgedBy}
          icon={<ShieldCheck size={16} color={ClinicalColors.primary} />}
        />
      </View>

      {/* Immediate Active Danger Alerts Queue */}
      <View style={{ gap: Spacing.sm }}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <AlertTriangle size={18} color={ClinicalColors.danger} />
            <Text style={styles.sectionTitleText}>{ui.unacknowledgedAlertsTitle}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigateSection('alerts')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>{ui.openAlertCommand}</Text>
            <ArrowRight size={14} color={ClinicalColors.primary} />
          </Pressable>
        </View>

        {activeAlerts.length > 0 ? (
          activeAlerts.map((alert) => (
            <DangerAlertBanner
              key={alert.alert_id}
              alert={alert}
              language={language}
              isSupervisorView
              onAcknowledge={onAcknowledgeAlert}
              onUpdateStatus={onUpdateAlertStatus}
            />
          ))
        ) : (
          <GlassCard>
            <View style={styles.noAlertsRow}>
              <CheckCircle2 size={18} color={ClinicalColors.success} />
              <Text style={styles.noAlertsText}>{ui.noActiveAlerts}</Text>
            </View>
          </GlassCard>
        )}
      </View>

      {/* Recent Register Preview */}
      <GlassCard>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>{ui.recentLiveVisitActivity}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigateSection('register')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>{ui.fullRegister}</Text>
            <ArrowRight size={14} color={ClinicalColors.primary} />
          </Pressable>
        </View>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          {recentVisits.slice(0, 5).map((v) => (
            <View key={v.visit_id || v.draft_id} style={styles.recentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentBenName}>
                  {v.beneficiary_name || v.beneficiary_id}
                </Text>
                <Text style={styles.recentMeta}>
                  by {v.worker_name || v.asha_worker_id} · {v.visit_type || 'Visit'}
                </Text>
              </View>
              <Text style={styles.recentDate}>
                {new Date(v.visit_date).toLocaleDateString()}
              </Text>
            </View>
          ))}
          {recentVisits.length === 0 && (
            <Text style={styles.noAlertsText}>{ui.noVisitsRecorded}</Text>
          )}
        </View>
      </GlassCard>
    </View>
  );
};

export const DangerCommandCenterView: React.FC<{
  dangerAlerts: DangerAlert[];
  language: LanguageCode;
  onAcknowledgeAlert: (alertId: string) => void;
  onUpdateAlertStatus: (alertId: string, nextStatus: DangerAlert['status']) => void;
}> = ({ dangerAlerts, language, onAcknowledgeAlert, onUpdateAlertStatus }) => {
  const { ui } = useTranslation(language);
  const [statusFilter, setStatusFilter] = useState<'all' | DangerAlert['status']>('all');

  const filtered = dangerAlerts.filter(
    (a) => statusFilter === 'all' || a.status === statusFilter
  );

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.pageTitle}>{ui.dangerAlertQueue}</Text>
        <Text style={styles.pageSub}>{ui.commandCenterSubtitle}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.sm }}
      >
        {(['all', 'active', 'acknowledged', 'referred', 'resolved'] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              onPress={() => setStatusFilter(s)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  active && { color: ClinicalColors.white },
                ]}
              >
                {s.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          title="No alerts match this status filter"
          description="Danger sign alerts appear here immediately when detected during ASHA voice visits."
          icon={<AlertTriangle size={20} color={ClinicalColors.textSecondary} />}
        />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {filtered.map((alert) => (
            <DangerAlertBanner
              key={alert.alert_id}
              alert={alert}
              language={language}
              isSupervisorView
              onAcknowledge={onAcknowledgeAlert}
              onUpdateStatus={onUpdateAlertStatus}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  highlight?: 'danger' | 'warning';
}> = ({ label, value, sub, icon, highlight }) => (
  <View
    style={[
      styles.kpiCard,
      highlight === 'danger'
        ? styles.kpiDanger
        : highlight === 'warning'
        ? styles.kpiWarning
        : styles.kpiDefault,
    ]}
  >
    <View style={styles.kpiTop}>
      <Text style={styles.kpiLabel} numberOfLines={1}>
        {label}
      </Text>
      {icon}
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiSub} numberOfLines={1}>
      {sub}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  commandHeader: {
    backgroundColor: ClinicalColors.slate900,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.glassCard,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  phcPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ClinicalColors.slate800,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  phcPillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.primaryContainer,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ClinicalColors.slate800,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  livePillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.white,
  },
  commandTitle: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  commandSub: {
    fontSize: Typography.xs,
    color: ClinicalColors.border,
    lineHeight: 18,
  },
  alertCmdBtn: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.danger,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  alertCmdBtnText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 3,
    ...Shadows.glassCard,
  },
  kpiDefault: {
    backgroundColor: ClinicalColors.glassWhiteStrong,
    borderColor: ClinicalColors.borderSubtle,
  },
  kpiDanger: {
    backgroundColor: ClinicalColors.dangerSoft,
    borderColor: ClinicalColors.danger,
  },
  kpiWarning: {
    backgroundColor: ClinicalColors.warningSoft,
    borderColor: ClinicalColors.warning,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  kpiLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
    flex: 1,
  },
  kpiValue: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: ClinicalColors.text,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sectionTitleText: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  linkBtn: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primary,
  },
  noAlertsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noAlertsText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
  },
  recentRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentBenName: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  recentMeta: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  recentDate: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  pageTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  pageSub: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  filterPill: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: ClinicalColors.slate900,
    borderColor: ClinicalColors.slate900,
  },
  filterPillText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
});

