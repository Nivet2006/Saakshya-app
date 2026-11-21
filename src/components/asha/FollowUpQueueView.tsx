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
  CalendarClock,
  CheckCircle2,
  Search,
  Square,
  Syringe,
} from 'lucide-react-native';
import { EmptyState, GlassCard } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { FollowUpTask, ImmunisationScheduleItem } from '@/types';

interface FollowUpQueueViewProps {
  followUps: FollowUpTask[];
  immunisations: ImmunisationScheduleItem[];
  onToggleFollowUp: (taskId: string) => void;
}

export const FollowUpQueueView: React.FC<FollowUpQueueViewProps> = ({
  followUps,
  immunisations,
  onToggleFollowUp,
}) => {
  const { ui } = useTranslation();
  const [tab, setTab] = useState<'upcoming' | 'overdue' | 'vaccines' | 'completed'>('upcoming');
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return followUps.filter((task) => {
      const matchSearch =
        !q ||
        task.task_type.toLowerCase().includes(q) ||
        (task.beneficiary_name || '').toLowerCase().includes(q) ||
        task.beneficiary_id.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (tab === 'completed') return task.status === 'COMPLETED';
      if (tab === 'overdue') {
        return (
          task.status !== 'COMPLETED' &&
          (task.status === 'OVERDUE' || task.due_date < today)
        );
      }
      if (tab === 'upcoming') {
        return (
          task.status !== 'COMPLETED' &&
          task.status !== 'OVERDUE' &&
          task.due_date >= today
        );
      }
      return true;
    });
  }, [followUps, tab, search, today]);

  const pendingVaccines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return immunisations.filter((i) => {
      const match =
        !q ||
        i.vaccine_name.toLowerCase().includes(q) ||
        (i.beneficiary_name || '').toLowerCase().includes(q);
      return match && (i.status === 'DUE' || i.status === 'OVERDUE');
    });
  }, [immunisations, search]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{ui.followUpsTitle}</Text>
        <Text style={styles.subtitle}>{ui.followUpsSubtitle}</Text>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color={ClinicalColors.textMuted} />
        <TextInput
          accessibilityLabel={ui.searchFollowUpsPlaceholder}
          value={search}
          onChangeText={setSearch}
          placeholder={ui.searchFollowUpsPlaceholder}
          placeholderTextColor={ClinicalColors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.sm }}
      >
        {[
          { id: 'upcoming', label: ui.upcomingTasks },
          { id: 'overdue', label: ui.overdueTab },
          { id: 'vaccines', label: `${ui.pendingVaccinesTab} (${pendingVaccines.length})` },
          { id: 'completed', label: ui.completedTab },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setTab(item.id as typeof tab)}
              style={[styles.tabPill, active && styles.tabPillActive]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  active && { color: ClinicalColors.white },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'vaccines' ? (
        pendingVaccines.length === 0 ? (
          <EmptyState
            title={ui.noPendingVaccines}
            description={ui.noPendingVaccinesDesc}
            icon={<Syringe size={20} color={ClinicalColors.textSecondary} />}
          />
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {pendingVaccines.map((v) => (
              <GlassCard
                key={v.id}
                variant={v.status === 'OVERDUE' ? 'amber' : 'default'}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {v.vaccine_name} (Dose {v.dose_number})
                    </Text>
                    <Text style={styles.itemSub}>
                      {v.beneficiary_name || v.beneficiary_id} ({v.beneficiary_id})
                    </Text>
                    <Text style={styles.itemMeta}>
                      {ui.dueDateLabel}: {v.due_date}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          v.status === 'OVERDUE'
                            ? ClinicalColors.dangerContainer
                            : ClinicalColors.warningContainer,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            v.status === 'OVERDUE'
                              ? ClinicalColors.dangerDark
                              : ClinicalColors.warningDark,
                        },
                      ]}
                    >
                      {v.status}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title={ui.noTasksInQueue}
          description={ui.noTasksInQueueDesc}
          icon={<CalendarClock size={20} color={ClinicalColors.textSecondary} />}
        />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {filteredTasks.map((task) => (
            <GlassCard key={task.id}>
              <View style={styles.taskRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.status === 'COMPLETED' }}
                  accessibilityLabel={`Toggle ${task.task_type}`}
                  onPress={() => onToggleFollowUp(task.id)}
                  style={styles.checkBtn}
                >
                  {task.status === 'COMPLETED' ? (
                    <CheckCircle2 size={24} color={ClinicalColors.success} />
                  ) : (
                    <Square size={24} color={ClinicalColors.textMuted} />
                  )}
                </Pressable>

                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.rowBetween}>
                    <Text
                      style={[
                        styles.itemTitle,
                        task.status === 'COMPLETED' && {
                          textDecorationLine: 'line-through',
                          color: ClinicalColors.textMuted,
                        },
                      ]}
                    >
                      {task.task_type}
                    </Text>
                    <Text style={styles.priorityText}>{task.priority}</Text>
                  </View>
                  <Text style={styles.itemSub}>
                    {ui.beneficiaryLabel}: {task.beneficiary_name || task.beneficiary_id} ·{' '}
                    {ui.dueLabel} {task.due_date}
                  </Text>
                  {task.notes && <Text style={styles.itemMeta}>{task.notes}</Text>}
                </View>
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
  tabPill: {
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  tabPillText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
    flex: 1,
  },
  itemSub: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: ClinicalColors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '800',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkBtn: {
    minWidth: TouchTargets.min,
    minHeight: TouchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
});

