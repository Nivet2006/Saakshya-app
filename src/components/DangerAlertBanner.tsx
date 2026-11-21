import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { DangerAlert, LanguageCode } from '@/types';

interface DangerAlertBannerProps {
  alert: DangerAlert;
  onAcknowledge?: (alertId: string) => void;
  onUpdateStatus?: (alertId: string, nextStatus: DangerAlert['status']) => void;
  isSupervisorView?: boolean;
  language?: LanguageCode;
}

export const DangerAlertBanner: React.FC<DangerAlertBannerProps> = ({
  alert,
  onAcknowledge,
  onUpdateStatus,
  isSupervisorView = false,
  language,
}) => {
  const { ui } = useTranslation(language);
  const isAcked = alert.status !== 'active';

  const handleCall108 = () => {
    void Linking.openURL('tel:108').catch(() => {});
  };

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.bannerContainer}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerBadges}>
          <View style={styles.urgentBadge}>
            <AlertTriangle size={13} color={ClinicalColors.dangerDark} />
            <Text style={styles.urgentBadgeText}>{ui.urgentDangerSign}</Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {alert.category} · {alert.subject}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                alert.status === 'active'
                  ? ClinicalColors.white
                  : alert.status === 'resolved'
                  ? ClinicalColors.successSoft
                  : ClinicalColors.warningSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color:
                  alert.status === 'active'
                    ? ClinicalColors.dangerDark
                    : alert.status === 'resolved'
                    ? ClinicalColors.successDark
                    : ClinicalColors.warningDark,
              },
            ]}
          >
            {alert.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Canonical Danger Sign Title & Patient */}
      <Text style={styles.canonicalTitle}>
        {alert.beneficiary_name
          ? `${alert.beneficiary_name} (${alert.beneficiary_id || 'Unlinked'}) — `
          : ''}
        {alert.canonical_name}
      </Text>

      {/* Matched Evidence */}
      <Text style={styles.evidenceText}>
        <Text style={{ fontWeight: '800' }}>{ui.matchedPhrase}: </Text>
        &ldquo;{alert.supporting_evidence}&rdquo;
      </Text>

      {/* Urgent PHC Referral Box */}
      <View style={styles.referralBox}>
        <View style={styles.referralHeader}>
          <Building2 size={15} color={ClinicalColors.dangerSoft} />
          <Text style={styles.referralHeaderLabel}>{ui.urgentPhcReferral}</Text>
        </View>
        <Text style={styles.referralMessage}>{alert.referral_message}</Text>
      </View>

      {/* Official NHM Guideline Source Citation */}
      <View style={styles.guidelineRow}>
        <BookOpen size={13} color={ClinicalColors.dangerContainer} />
        <Text style={styles.guidelineText}>
          {ui.guidelineReference}: {alert.source_guideline_ref} · {ui.detectedAt}{' '}
          {new Date(alert.detected_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Action Buttons (>= 48dp touch targets) */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.call108Emergency}
          onPress={handleCall108}
          style={styles.call108Btn}
        >
          <PhoneCall size={15} color={ClinicalColors.dangerDark} />
          <Text style={styles.call108Text}>{ui.call108Emergency}</Text>
        </Pressable>

        {!isAcked && onAcknowledge && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSupervisorView ? ui.acknowledgeAlert : ui.acknowledgeAndRefer}
            onPress={() => onAcknowledge(alert.alert_id)}
            style={styles.ackBtn}
          >
            <ShieldAlert size={15} color={ClinicalColors.white} />
            <Text style={styles.ackBtnText}>
              {isSupervisorView ? ui.acknowledgeAlert : ui.acknowledgeAndRefer}
            </Text>
          </Pressable>
        )}

        {isSupervisorView && onUpdateStatus && alert.status !== 'resolved' && (
          <>
            {alert.status === 'acknowledged' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ui.markReferred}
                onPress={() => onUpdateStatus(alert.alert_id, 'referred')}
                style={styles.referredBtn}
              >
                <Text style={styles.ackBtnText}>{ui.markReferred}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ui.markResolved}
              onPress={() => onUpdateStatus(alert.alert_id, 'resolved')}
              style={styles.resolvedBtn}
            >
              <Text style={styles.ackBtnText}>{ui.markResolved}</Text>
            </Pressable>
          </>
        )}
      </View>

      {alert.acknowledged_by && (
        <View style={styles.ackedByRow}>
          <CheckCircle2 size={14} color={ClinicalColors.successContainer} />
          <Text style={styles.ackedByText}>
            {alert.status.toUpperCase()} by {alert.acknowledged_by}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    backgroundColor: ClinicalColors.danger,
    borderRadius: Radii.xl,
    borderWidth: 2,
    borderColor: ClinicalColors.dangerDark,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.dangerGlow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ClinicalColors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  urgentBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '900',
    color: ClinicalColors.dangerDark,
    letterSpacing: 0.4,
  },
  categoryBadge: {
    backgroundColor: ClinicalColors.dangerDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  categoryBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.white,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusPillText: {
    fontSize: Typography.xs,
    fontWeight: '800',
  },
  canonicalTitle: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: ClinicalColors.white,
    lineHeight: 23,
  },
  evidenceText: {
    fontSize: Typography.sm,
    color: ClinicalColors.dangerSoft,
    lineHeight: 19,
  },
  referralBox: {
    backgroundColor: ClinicalColors.dangerDark,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    padding: Spacing.md,
    gap: 4,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referralHeaderLabel: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.dangerContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referralMessage: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: ClinicalColors.white,
    lineHeight: 21,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guidelineText: {
    fontSize: Typography.xs,
    color: ClinicalColors.dangerContainer,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 4,
  },
  call108Btn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  call108Text: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.dangerDark,
  },
  ackBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.slate900,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  referredBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resolvedBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.successDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ackBtnText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  ackedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ackedByText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.successSoft,
  },
});

