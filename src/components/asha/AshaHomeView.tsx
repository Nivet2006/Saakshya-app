import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Mic,
  Syringe,
  Users,
} from 'lucide-react-native';
import { DangerAlertBanner } from '@/components/DangerAlertBanner';
import type { AshaNavSection } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type {
  Beneficiary,
  DangerAlert,
  FollowUpTask,
  ImmunisationScheduleItem,
  LanguageCode,
  UserProfile,
  VisitDraft,
} from '@/types';

interface AshaHomeViewProps {
  profile: UserProfile;
  language: LanguageCode;
  beneficiaries: Beneficiary[];
  visits: VisitDraft[];
  followUps: FollowUpTask[];
  immunisations: ImmunisationScheduleItem[];
  dangerAlerts: DangerAlert[];
  onStartVoiceVisit: (beneficiary?: Beneficiary) => void;
  onNavigateSection: (section: AshaNavSection) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onClearVisits?: () => void;
  onClearAlerts?: () => void;
}

export const AshaHomeView: React.FC<AshaHomeViewProps> = ({
  profile,
  language,
  beneficiaries,
  visits,
  followUps,
  immunisations,
  dangerAlerts,
  onStartVoiceVisit,
  onNavigateSection,
  onAcknowledgeAlert,
  onClearVisits,
  onClearAlerts,
}) => {
  const { ui } = useTranslation(language);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayVisits = visits.filter((v) => v.visit_date.startsWith(todayStr));
  const pendingFollowUps = followUps.filter(
    (f) => f.status !== 'COMPLETED' && f.status !== 'CANCELLED'
  );
  const dueVaccines = immunisations.filter(
    (i) => i.status === 'DUE' || i.status === 'OVERDUE'
  );
  const activeAlerts = dangerAlerts.filter((a) => a.status === 'active');

  return (
    <View style={styles.container}>
      {/* Welcome & Immediate Primary Voice Visit CTA */}
      <View style={styles.heroCard}>
        <View style={{ gap: 4 }}>
          <Text style={styles.areaCaps}>
            {profile.assigned_area} · {profile.phc_name}
          </Text>
          <Text style={styles.greetingTitle}>
            {ui.namasteGreeting}, {profile.full_name}
          </Text>
          <Text style={styles.greetingSubtitle}>{ui.homeVoicePrompt}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.startVoiceVisit}
          onPress={() => onStartVoiceVisit()}
          style={styles.startVoiceBtn}
        >
          <View style={styles.micCircle}>
            <Mic size={20} color={ClinicalColors.white} />
          </View>
          <Text style={styles.startVoiceBtnText}>{ui.startVoiceVisit}</Text>
        </Pressable>
      </View>

      {/* Active Critical Alerts */}
      {activeAlerts.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.alertHeading}>
              {ui.activeDangerAlertsLabel} ({activeAlerts.length})
            </Text>
            {onClearAlerts && (
              <Pressable
                accessibilityRole="button"
                onPress={onClearAlerts}
                style={styles.clearAlertsBtn}
              >
                <Text style={styles.clearAlertsText}>{ui.clearAllAlerts}</Text>
              </Pressable>
            )}
          </View>
          {activeAlerts.map((alert) => (
            <DangerAlertBanner
              key={alert.alert_id}
              alert={alert}
              language={language}
              onAcknowledge={onAcknowledgeAlert}
            />
          ))}
        </View>
      )}

      {/* 4 Operational Field Counters */}
      <View style={styles.metricsGrid}>
        <MetricButton
          icon={<Users size={20} color={ClinicalColors.primary} />}
          label={ui.assignedHouseholds}
          value={beneficiaries.length}
          hint={ui.viewDirectory}
          onPress={() => onNavigateSection('beneficiaries')}
        />
        <MetricButton
          icon={<CheckCircle2 size={20} color={ClinicalColors.success} />}
          label={ui.visitsToday}
          value={todayVisits.length}
          hint={`${visits.length} ${ui.totalLogged}`}
          onPress={() => onNavigateSection('history')}
        />
        <MetricButton
          icon={<CalendarClock size={20} color={ClinicalColors.warning} />}
          label={ui.pendingFollowUps}
          value={pendingFollowUps.length}
          hint={ui.openTaskQueue}
          onPress={() => onNavigateSection('followups')}
        />
        <MetricButton
          icon={<Syringe size={20} color={ClinicalColors.secondary} />}
          label={ui.vaccinesDue}
          value={dueVaccines.length}
          hint={ui.dueOverdueDoses}
          onPress={() => onNavigateSection('followups')}
        />
      </View>

      {/* Pending Follow-ups Preview */}
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <CalendarClock size={16} color={ClinicalColors.primary} />
            <Text style={styles.cardTitle}>{ui.pendingFollowUps}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigateSection('followups')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>{ui.allTasks}</Text>
            <ArrowRight size={14} color={ClinicalColors.primary} />
          </Pressable>
        </View>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          {pendingFollowUps.slice(0, 4).map((task) => (
            <View
              key={task.id}
              style={[
                styles.taskItem,
                task.priority === 'URGENT'
                  ? styles.taskUrgent
                  : task.status === 'OVERDUE'
                  ? styles.taskOverdue
                  : styles.taskNormal,
              ]}
            >
              <View style={styles.taskTopRow}>
                <Text style={styles.taskTitle}>{task.task_type}</Text>
                <Text style={styles.taskPriority}>{task.priority}</Text>
              </View>
              <Text style={styles.taskSub}>
                {task.beneficiary_name || task.beneficiary_id} · {ui.dueLabel}{' '}
                {task.due_date}
              </Text>
            </View>
          ))}
          {pendingFollowUps.length === 0 && (
            <Text style={styles.emptyText}>{ui.noPendingTasks}</Text>
          )}
        </View>
      </GlassCard>

      {/* Recent Confirmed Visits Preview */}
      <GlassCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{ui.recentSavedVisits}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {visits.length > 0 && onClearVisits && (
              <Pressable accessibilityRole="button" onPress={onClearVisits}>
                <Text style={styles.clearLinkText}>{ui.clearAll}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => onNavigateSection('history')}
              style={styles.linkBtn}
            >
              <Text style={styles.linkBtnText}>{ui.fullHistory}</Text>
              <ArrowRight size={14} color={ClinicalColors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          {visits.slice(0, 4).map((v) => (
            <View key={v.visit_id || v.draft_id} style={styles.visitRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.visitTopRow}>
                  <Text style={styles.visitBenName}>
                    {v.beneficiary_name || v.beneficiary_id}
                  </Text>
                  <View style={styles.visitTypePill}>
                    <Text style={styles.visitTypeText}>
                      {v.visit_type || 'Visit'}
                    </Text>
                  </View>
                  {v.danger_sign_flagged && (
                    <View style={styles.dangerBadge}>
                      <AlertTriangle size={11} color={ClinicalColors.dangerDark} />
                      <Text style={styles.dangerBadgeText}>{ui.dangerFlagged}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.visitMeta}>
                  {v.weight_kg !== null ? `${ui.weightLabel}: ${v.weight_kg} kg · ` : ''}
                  {v.next_visit_date
                    ? `${ui.nextVisitLabel}: ${v.next_visit_date}`
                    : ui.confirmed}
                </Text>
              </View>
              <View style={styles.statusTag}>
                <Text style={styles.statusTagText}>{v.status}</Text>
              </View>
            </View>
          ))}
          {visits.length === 0 && (
            <Text style={styles.emptyText}>{ui.noVisitsRecorded}</Text>
          )}
        </View>
      </GlassCard>
    </View>
  );
};

const MetricButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  onPress: () => void;
}> = ({ icon, label, value, hint, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${label}: ${value}`}
    onPress={onPress}
    style={styles.metricCard}
  >
    <View style={styles.metricTop}>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
      {icon}
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricHint} numberOfLines={1}>
      {hint}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  heroCard: {
    backgroundColor: ClinicalColors.primary,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.elevated,
  },
  areaCaps: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.primarySoft,
    textTransform: 'uppercase',
  },
  greetingTitle: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  greetingSubtitle: {
    fontSize: Typography.sm,
    color: ClinicalColors.primarySoft,
    lineHeight: 20,
  },
  startVoiceBtn: {
    minHeight: 60,
    borderRadius: Radii.xl,
    backgroundColor: ClinicalColors.white,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  micCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ClinicalColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startVoiceBtnText: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.primaryDark,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertHeading: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
    textTransform: 'uppercase',
  },
  clearAlertsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    backgroundColor: ClinicalColors.dangerContainer,
  },
  clearAlertsText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.dangerDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: ClinicalColors.glassWhiteStrong,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    padding: Spacing.md,
    gap: 4,
    ...Shadows.glassCard,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  metricLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
    flex: 1,
  },
  metricValue: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: ClinicalColors.text,
    marginTop: 2,
  },
  metricHint: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: Typography.sm,
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
  clearLinkText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.danger,
  },
  taskItem: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: 4,
  },
  taskUrgent: {
    backgroundColor: ClinicalColors.dangerSoft,
    borderColor: ClinicalColors.dangerContainer,
  },
  taskOverdue: {
    backgroundColor: ClinicalColors.warningSoft,
    borderColor: ClinicalColors.warningContainer,
  },
  taskNormal: {
    backgroundColor: ClinicalColors.canvas,
    borderColor: ClinicalColors.borderSubtle,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
    flex: 1,
  },
  taskPriority: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.textSecondary,
  },
  taskSub: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
  },
  visitRow: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  visitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  visitBenName: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  visitTypePill: {
    backgroundColor: ClinicalColors.white,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  visitTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  dangerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: ClinicalColors.dangerContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  dangerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  visitMeta: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
    marginTop: 3,
  },
  statusTag: {
    backgroundColor: ClinicalColors.successSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.successContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: ClinicalColors.successDark,
  },
  emptyText: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
