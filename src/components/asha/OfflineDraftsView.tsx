import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Info,
  RefreshCw,
  Trash2,
  WifiOff,
} from 'lucide-react-native';
import { EmptyState, GlassCard } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  deleteLocalDraft,
  getAllLocalDrafts,
  saveDraftLocally,
} from '@/lib/offline/offline-store';
import { syncManager } from '@/lib/sync/sync-manager';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { VisitDraft } from '@/types';

interface OfflineDraftsViewProps {
  onSynced?: () => void;
}

export const OfflineDraftsView: React.FC<OfflineDraftsViewProps> = ({ onSynced }) => {
  const { ui } = useTranslation();
  const [drafts, setDrafts] = useState<VisitDraft[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const load = async () => {
    const items = await getAllLocalDrafts();
    setDrafts(items);
  };

  useEffect(() => {
    void load();
    const unsub = syncManager.subscribe(() => {
      setIsSyncing(syncManager.isCurrentlySyncing());
      void load();
    });
    return () => unsub();
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncManager.triggerSync();
    setIsSyncing(false);
    await load();
    onSynced?.();
  };

  const handleResolveConflictKeepLocal = async (draft: VisitDraft) => {
    await saveDraftLocally({
      ...draft,
      sync_status: 'pending',
      last_sync_error: undefined,
      updated_at: new Date().toISOString(),
    });
    await handleSyncNow();
  };

  const handleDelete = async (draftId: string) => {
    await deleteLocalDraft(draftId);
    await load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ui.offlineDraftsTitle}</Text>
          <Text style={styles.subtitle}>{ui.offlineDraftsSubtitle}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.syncConfirmedQueue}
          disabled={isSyncing}
          onPress={handleSyncNow}
          style={[styles.syncBtn, isSyncing && { opacity: 0.6 }]}
        >
          <RefreshCw size={15} color={ClinicalColors.white} />
          <Text style={styles.syncBtnText}>
            {isSyncing ? ui.syncingConfirmedVisits : ui.syncConfirmedQueue}
          </Text>
        </Pressable>
      </View>

      {/* Truthful Offline Scope Notice */}
      <View style={styles.policyBanner}>
        <Info size={16} color={ClinicalColors.secondaryDark} />
        <View style={{ flex: 1 }}>
          <Text style={styles.policyTitle}>{ui.offlinePolicyTitle}</Text>
          <Text style={styles.policyDesc}>{ui.offlinePolicyDesc}</Text>
        </View>
      </View>

      {drafts.length === 0 ? (
        <EmptyState
          title={ui.noLocalDrafts}
          description={ui.noLocalDraftsDesc}
          icon={<Database size={20} color={ClinicalColors.textSecondary} />}
        />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {drafts.map((d) => (
            <GlassCard key={d.draft_id}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benName}>
                    {d.beneficiary_name || d.beneficiary_id || 'Unresolved Beneficiary'}
                  </Text>
                  <Text style={styles.visitIdText}>{d.visit_id}</Text>
                </View>

                <View style={styles.badgesRow}>
                  <View style={styles.recordTag}>
                    <Text style={styles.recordTagText}>
                      {ui.recordStatus}: {d.status}
                    </Text>
                  </View>
                  <SyncPill status={d.sync_status} syncedLabel={ui.syncedStatus} />
                </View>
              </View>

              {d.last_sync_error && (
                <View style={styles.errorBox}>
                  <AlertTriangle size={15} color={ClinicalColors.danger} />
                  <Text style={styles.errorText}>{d.last_sync_error}</Text>
                </View>
              )}

              <View style={styles.footerRow}>
                <Text style={styles.updatedText}>
                  {ui.updatedLabel} {new Date(d.updated_at).toLocaleTimeString()}
                </Text>

                <View style={styles.actionsRow}>
                  {d.sync_status === 'conflict' && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleResolveConflictKeepLocal(d)}
                      style={styles.retryConflictBtn}
                    >
                      <Text style={styles.retryConflictText}>{ui.retryOverwrite}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={ui.removeLocal}
                    onPress={() => handleDelete(d.draft_id)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={14} color={ClinicalColors.danger} />
                    <Text style={styles.deleteBtnText}>{ui.removeLocal}</Text>
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </View>
  );
};

const SyncPill: React.FC<{ status: VisitDraft['sync_status']; syncedLabel: string }> = ({
  status,
  syncedLabel,
}) => {
  if (status === 'synced') {
    return (
      <View style={[styles.syncPill, { backgroundColor: ClinicalColors.successSoft }]}>
        <CheckCircle2 size={12} color={ClinicalColors.successDark} />
        <Text style={[styles.syncPillText, { color: ClinicalColors.successDark }]}>
          {syncedLabel}
        </Text>
      </View>
    );
  }
  if (status === 'conflict' || status === 'failed') {
    return (
      <View style={[styles.syncPill, { backgroundColor: ClinicalColors.dangerContainer }]}>
        <AlertTriangle size={12} color={ClinicalColors.dangerDark} />
        <Text style={[styles.syncPillText, { color: ClinicalColors.dangerDark }]}>
          {status}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.syncPill, { backgroundColor: ClinicalColors.warningContainer }]}>
      <WifiOff size={12} color={ClinicalColors.warningDark} />
      <Text style={[styles.syncPillText, { color: ClinicalColors.warningDark }]}>
        {status}
      </Text>
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
    flexWrap: 'wrap',
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
  syncBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  policyBanner: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.secondarySoft,
    borderWidth: 1,
    borderColor: ClinicalColors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  policyTitle: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.secondaryDark,
  },
  policyDesc: {
    fontSize: Typography.xs,
    color: ClinicalColors.secondaryDark,
    marginTop: 2,
    lineHeight: 17,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  benName: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  visitIdText: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordTag: {
    backgroundColor: ClinicalColors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  recordTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  syncPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  errorBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.dangerSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: Typography.xs,
    color: ClinicalColors.dangerDark,
    flex: 1,
  },
  footerRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  updatedText: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  retryConflictBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.warning,
    justifyContent: 'center',
  },
  retryConflictText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  deleteBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.danger,
  },
});

