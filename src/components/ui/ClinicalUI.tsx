import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  HelpCircle,
  Inbox,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { syncManager } from '@/lib/sync/sync-manager';
import { getAllLocalDrafts } from '@/lib/offline/offline-store';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { FieldConfirmStatus, LanguageCode } from '@/types';

/**
 * Apple-Inspired Liquid Glass Card with Solid High-Contrast Fallback (>= 4.5:1 text contrast).
 * Uses at most 1 blur layer per card and supports bright-sunlight readability.
 */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'teal' | 'sky' | 'amber' | 'danger' | 'dark';
  padding?: 'sm' | 'md' | 'lg';
  useBlur?: boolean;
}> = ({ children, style, variant = 'default', padding = 'md', useBlur = false }) => {
  const pad =
    padding === 'sm' ? Spacing.md : padding === 'lg' ? Spacing.xl : Spacing.lg;

  const variantBg =
    variant === 'teal'
      ? ClinicalColors.glassTeal
      : variant === 'sky'
      ? ClinicalColors.glassSky
      : variant === 'amber'
      ? ClinicalColors.glassAmber
      : variant === 'danger'
      ? ClinicalColors.glassDanger
      : variant === 'dark'
      ? ClinicalColors.glassDark
      : ClinicalColors.glassWhiteStrong;

  const variantBorder =
    variant === 'teal'
      ? ClinicalColors.primaryContainer
      : variant === 'sky'
      ? ClinicalColors.secondaryContainer
      : variant === 'amber'
      ? ClinicalColors.warningContainer
      : variant === 'danger'
      ? ClinicalColors.dangerDark
      : variant === 'dark'
      ? ClinicalColors.slate800
      : ClinicalColors.glassBorderSubtle;

  return (
    <View
      style={[
        styles.cardOuter,
        {
          backgroundColor: variantBg,
          borderColor: variantBorder,
          padding: pad,
        },
        style,
      ]}
    >
      {useBlur && (
        <BlurView
          intensity={28}
          tint={variant === 'dark' || variant === 'danger' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
};

export const FieldStatusPill: React.FC<{
  status: FieldConfirmStatus;
  compact?: boolean;
}> = ({ status, compact = false }) => {
  const { ui } = useTranslation();

  const config: Record<
    FieldConfirmStatus,
    { label: string; bg: string; border: string; text: string; icon: React.ReactNode }
  > = {
    extracted: {
      label: ui.statusExtracted,
      bg: ClinicalColors.secondarySoft,
      border: ClinicalColors.secondaryContainer,
      text: ClinicalColors.secondaryDark,
      icon: <Sparkles size={12} color={ClinicalColors.secondaryDark} />,
    },
    needs_clarification: {
      label: ui.needsClarification,
      bg: ClinicalColors.warningSoft,
      border: ClinicalColors.warningContainer,
      text: ClinicalColors.warningDark,
      icon: <HelpCircle size={12} color={ClinicalColors.warningDark} />,
    },
    corrected: {
      label: ui.statusCorrected,
      bg: ClinicalColors.indigoSoft,
      border: ClinicalColors.indigoBorder,
      text: ClinicalColors.indigoDark,
      icon: <Edit3 size={12} color={ClinicalColors.indigoDark} />,
    },
    confirmed: {
      label: ui.confirmed,
      bg: ClinicalColors.successSoft,
      border: ClinicalColors.successContainer,
      text: ClinicalColors.successDark,
      icon: <CheckCircle2 size={12} color={ClinicalColors.successDark} />,
    },
    missing: {
      label: ui.notIdentified,
      bg: ClinicalColors.slate100,
      border: ClinicalColors.border,
      text: ClinicalColors.textSecondary,
      icon: <HelpCircle size={12} color={ClinicalColors.textSecondary} />,
    },
  };

  const item = config[status];

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: item.bg,
          borderColor: item.border,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: compact ? 3 : 4,
        },
      ]}
    >
      {item.icon}
      <Text style={[styles.pillText, { color: item.text }]} numberOfLines={1}>
        {item.label}
      </Text>
    </View>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconCircle}>
      {icon || <Inbox size={22} color={ClinicalColors.textSecondary} />}
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyDesc}>{description}</Text>
    {action ? <View style={{ marginTop: Spacing.md }}>{action}</View> : null}
  </View>
);

export const ErrorBanner: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
}> = ({ title = 'Connection Issue', message, onRetry, retryLabel = 'Retry', onDismiss }) => (
  <View accessibilityRole="alert" style={styles.errorBanner}>
    <View style={styles.errorRow}>
      <AlertCircle size={20} color={ClinicalColors.danger} />
      <View style={styles.errorTextWrap}>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorMessage}>{message}</Text>
      </View>
    </View>
    <View style={styles.errorActionRow}>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          onPress={onRetry}
          style={styles.errorRetryBtn}
        >
          <RefreshCw size={14} color={ClinicalColors.dangerDark} />
          <Text style={styles.errorRetryText}>{retryLabel}</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          onPress={onDismiss}
          style={styles.errorDismissBtn}
        >
          <Text style={styles.errorDismissText}>Dismiss</Text>
        </Pressable>
      )}
    </View>
  </View>
);

export const ConfirmModalDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => (
  <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalDesc}>{description}</Text>
        <View style={styles.modalActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={onCancel}
            style={styles.modalCancelBtn}
          >
            <Text style={styles.modalCancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            onPress={onConfirm}
            style={[
              styles.modalConfirmBtn,
              {
                backgroundColor: destructive
                  ? ClinicalColors.danger
                  : ClinicalColors.primary,
              },
            ]}
          >
            <Text style={styles.modalConfirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

export const OfflineSyncBadge: React.FC<{ language?: LanguageCode }> = ({
  language = 'hi-IN',
}) => {
  const { ui } = useTranslation(language);
  const [isOnline, setIsOnline] = useState(syncManager.getIsOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkPending = async () => {
    const drafts = await getAllLocalDrafts();
    const pending = drafts.filter(
      (d) => d.sync_status === 'pending' || d.sync_status === 'failed'
    );
    setPendingCount(pending.length);
  };

  useEffect(() => {
    void checkPending();
    const unsub = syncManager.subscribe(() => {
      setIsOnline(syncManager.getIsOnline());
      setIsSyncing(syncManager.isCurrentlySyncing());
      void checkPending();
    });
    const timer = setInterval(checkPending, 8000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncManager.triggerSync();
    setIsSyncing(false);
    await checkPending();
  };

  return (
    <View style={styles.syncBadgeRow}>
      <View
        style={[
          styles.onlineChip,
          {
            backgroundColor: isOnline
              ? ClinicalColors.successSoft
              : ClinicalColors.warningSoft,
            borderColor: isOnline
              ? ClinicalColors.successContainer
              : ClinicalColors.warningContainer,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isOnline
                ? ClinicalColors.success
                : ClinicalColors.warning,
            },
          ]}
        />
        <Text
          style={[
            styles.onlineChipText,
            {
              color: isOnline
                ? ClinicalColors.successDark
                : ClinicalColors.warningDark,
            },
          ]}
        >
          {isOnline ? ui.online : ui.offline}
        </Text>
      </View>

      {pendingCount > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.syncConfirmedQueue}
          disabled={isSyncing || !isOnline}
          onPress={handleManualSync}
          style={styles.pendingSyncChip}
        >
          <RefreshCw size={12} color={ClinicalColors.warningDark} />
          <Text style={styles.pendingSyncText}>
            {pendingCount} {ui.pendingSync}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.glassCard,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  pillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: ClinicalColors.card,
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ClinicalColors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ClinicalColors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: ClinicalColors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: Typography.sm,
    color: ClinicalColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  errorBanner: {
    backgroundColor: ClinicalColors.dangerSoft,
    borderColor: ClinicalColors.danger,
    borderWidth: 1.5,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  errorMessage: {
    fontSize: Typography.sm,
    color: ClinicalColors.dangerDark,
    marginTop: 2,
    lineHeight: 18,
  },
  errorActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  errorRetryBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.white,
    borderWidth: 1,
    borderColor: ClinicalColors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorRetryText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: ClinicalColors.dangerDark,
  },
  errorDismissBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  errorDismissText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: ClinicalColors.dangerDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: ClinicalColors.backdropOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: ClinicalColors.card,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    ...Shadows.glassCard,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  modalDesc: {
    fontSize: Typography.sm,
    color: ClinicalColors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  modalCancelBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  modalConfirmBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  syncBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineChipText: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  pendingSyncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: ClinicalColors.warningContainer,
    borderWidth: 1,
    borderColor: ClinicalColors.warning,
  },
  pendingSyncText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.warningDark,
  },
});
