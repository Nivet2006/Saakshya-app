import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ClipboardList,
  FileSpreadsheet,
  Globe,
  HeartPulse,
  History,
  Home,
  LogOut,
  Menu,
  Mic,
  RefreshCw,
  Stethoscope,
  Users,
  X,
} from 'lucide-react-native';
import { OfflineSyncBadge } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { PRISMA_LANGUAGES } from '@/lib/translations';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { LanguageCode, UserProfile } from '@/types';

export type AshaNavSection =
  | 'home'
  | 'voice'
  | 'beneficiaries'
  | 'followups'
  | 'history'
  | 'offline';

export type SupervisorNavSection =
  | 'overview'
  | 'alerts'
  | 'workers'
  | 'register'
  | 'analytics'
  | 'reports';

interface AppShellProps {
  currentProfile: UserProfile;
  portal: 'asha' | 'supervisor';
  onPortalChange: (portal: 'asha' | 'supervisor') => void;
  ashaSection: AshaNavSection;
  onAshaSectionChange: (sec: AshaNavSection) => void;
  supervisorSection: SupervisorNavSection;
  onSupervisorSectionChange: (sec: SupervisorNavSection) => void;
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  backendHealthy: boolean | null;
  unresolvedAlertCount: number;
  offlinePendingCount: number;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentProfile,
  portal,
  onPortalChange,
  ashaSection,
  onAshaSectionChange,
  supervisorSection,
  onSupervisorSectionChange,
  currentLanguage,
  onLanguageChange,
  backendHealthy,
  unresolvedAlertCount,
  offlinePendingCount,
  onSignOut,
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const { ui } = useTranslation(currentLanguage);

  const ashaNavItems: Array<{
    id: AshaNavSection;
    label: string;
    icon: (color: string) => React.ReactNode;
    badge?: number;
  }> = [
    { id: 'home', label: ui.navHome, icon: (c) => <Home size={18} color={c} /> },
    { id: 'voice', label: ui.navVoiceVisit, icon: (c) => <Mic size={18} color={c} /> },
    {
      id: 'beneficiaries',
      label: ui.navBeneficiaries,
      icon: (c) => <Users size={18} color={c} />,
    },
    {
      id: 'followups',
      label: ui.navFollowUps,
      icon: (c) => <CalendarClock size={18} color={c} />,
    },
    {
      id: 'history',
      label: ui.navVisitHistory,
      icon: (c) => <History size={18} color={c} />,
    },
    {
      id: 'offline',
      label: ui.navOfflineDrafts,
      icon: (c) => <RefreshCw size={18} color={c} />,
      badge: offlinePendingCount > 0 ? offlinePendingCount : undefined,
    },
  ];

  const supervisorNavItems: Array<{
    id: SupervisorNavSection;
    label: string;
    icon: (color: string) => React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'overview',
      label: ui.navPhcOverview,
      icon: (c) => <Activity size={18} color={c} />,
    },
    {
      id: 'alerts',
      label: ui.navDangerAlerts,
      icon: (c) => <AlertTriangle size={18} color={c} />,
      badge: unresolvedAlertCount > 0 ? unresolvedAlertCount : undefined,
    },
    {
      id: 'workers',
      label: ui.navAshaWorkers,
      icon: (c) => <Users size={18} color={c} />,
    },
    {
      id: 'register',
      label: ui.navVisitRegister,
      icon: (c) => <ClipboardList size={18} color={c} />,
    },
    {
      id: 'analytics',
      label: ui.navAnalytics,
      icon: (c) => <BarChart3 size={18} color={c} />,
    },
    {
      id: 'reports',
      label: ui.navReportsAudit,
      icon: (c) => <FileSpreadsheet size={18} color={c} />,
    },
  ];

  const activeItems = portal === 'asha' ? ashaNavItems : supervisorNavItems;

  const handleSelectNav = (id: string) => {
    if (portal === 'asha') {
      onAshaSectionChange(id as AshaNavSection);
    } else {
      onSupervisorSectionChange(id as SupervisorNavSection);
    }
    setDrawerOpen(false);
  };

  return (
    <View style={styles.root}>
      {/* Sticky Top Glass Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            onPress={() => setDrawerOpen(true)}
            style={styles.iconBtn}
          >
            <Menu size={20} color={ClinicalColors.text} />
          </Pressable>

          <View style={styles.logoBox}>
            <HeartPulse size={18} color={ClinicalColors.white} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.appTitleRow}>
              <Text style={styles.appTitle} numberOfLines={1}>
                {ui.appName}
              </Text>
              <View
                style={[
                  styles.apiDotBadge,
                  {
                    backgroundColor:
                      backendHealthy === true
                        ? ClinicalColors.successSoft
                        : backendHealthy === false
                        ? ClinicalColors.warningSoft
                        : ClinicalColors.slate100,
                  },
                ]}
              >
                <View
                  style={[
                    styles.apiDot,
                    {
                      backgroundColor:
                        backendHealthy === true
                          ? ClinicalColors.success
                          : backendHealthy === false
                          ? ClinicalColors.warning
                          : ClinicalColors.textMuted,
                    },
                  ]}
                />
                <Text style={styles.apiDotText}>
                  {backendHealthy === true
                    ? 'API'
                    : backendHealthy === false
                    ? 'Offline'
                    : '...'}
                </Text>
              </View>
            </View>
            <Text style={styles.workerSub} numberOfLines={1}>
              {currentProfile.full_name}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <OfflineSyncBadge language={currentLanguage} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select Language"
            onPress={() => setLangModalOpen(true)}
            style={styles.langBtn}
          >
            <Globe size={14} color={ClinicalColors.primary} />
            <Text style={styles.langBtnText}>{currentLanguage}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.signOut}
            onPress={onSignOut}
            style={styles.iconBtn}
          >
            <LogOut size={18} color={ClinicalColors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Main Scrollable Viewport */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {/* Apple-Inspired Floating Glass Bottom Navigation Bar */}
      <View style={styles.bottomBar}>
        {portal === 'asha' ? (
          <View style={styles.tabGrid5}>
            <BottomTabButton
              active={ashaSection === 'home'}
              onPress={() => onAshaSectionChange('home')}
              icon={
                <Home
                  size={20}
                  color={
                    ashaSection === 'home'
                      ? ClinicalColors.primary
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={ui.navHome}
            />
            <BottomTabButton
              active={ashaSection === 'beneficiaries'}
              onPress={() => onAshaSectionChange('beneficiaries')}
              icon={
                <Users
                  size={20}
                  color={
                    ashaSection === 'beneficiaries'
                      ? ClinicalColors.primary
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={ui.navBeneficiaries}
            />

            {/* Prominent Center Voice Visit Orb */}
            <View style={styles.centerFabWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ui.startVoiceVisit}
                onPress={() => onAshaSectionChange('voice')}
                style={[
                  styles.centerFab,
                  ashaSection === 'voice' && styles.centerFabActive,
                ]}
              >
                <Mic size={24} color={ClinicalColors.white} />
              </Pressable>
            </View>

            <BottomTabButton
              active={ashaSection === 'followups'}
              onPress={() => onAshaSectionChange('followups')}
              icon={
                <CalendarClock
                  size={20}
                  color={
                    ashaSection === 'followups'
                      ? ClinicalColors.primary
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={ui.navFollowUps}
            />
            <BottomTabButton
              active={ashaSection === 'history' || ashaSection === 'offline'}
              onPress={() =>
                onAshaSectionChange(offlinePendingCount > 0 ? 'offline' : 'history')
              }
              icon={
                <History
                  size={20}
                  color={
                    ashaSection === 'history' || ashaSection === 'offline'
                      ? ClinicalColors.primary
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={
                offlinePendingCount > 0
                  ? `${ui.pendingSync} (${offlinePendingCount})`
                  : ui.navVisitHistory
              }
            />
          </View>
        ) : (
          <View style={styles.tabGrid4}>
            <BottomTabButton
              active={supervisorSection === 'overview'}
              onPress={() => onSupervisorSectionChange('overview')}
              icon={
                <Activity
                  size={20}
                  color={
                    supervisorSection === 'overview'
                      ? ClinicalColors.primary
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={ui.navPhcOverview}
            />
            <BottomTabButton
              active={supervisorSection === 'alerts'}
              onPress={() => onSupervisorSectionChange('alerts')}
              icon={
                <AlertTriangle
                  size={20}
                  color={
                    supervisorSection === 'alerts'
                      ? ClinicalColors.danger
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={`${ui.navDangerAlerts}${
                unresolvedAlertCount > 0 ? ` (${unresolvedAlertCount})` : ''
              }`}
            />
            <BottomTabButton
              active={supervisorSection === 'register'}
              onPress={() => onSupervisorSectionChange('register')}
              icon={
                <ClipboardList
                  size={20}
                  color={
                    supervisorSection === 'register'
                      ? ClinicalColors.primary
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={ui.navVisitRegister}
            />
            <BottomTabButton
              active={
                supervisorSection === 'analytics' || supervisorSection === 'reports'
              }
              onPress={() => onSupervisorSectionChange('analytics')}
              icon={
                <BarChart3
                  size={20}
                  color={
                    supervisorSection === 'analytics' ||
                    supervisorSection === 'reports'
                      ? ClinicalColors.primary
                      : ClinicalColors.textSecondary
                  }
                />
              }
              label={ui.navAnalytics}
            />
          </View>
        )}
      </View>

      {/* Slide-Over Navigation & Portal Switcher Drawer */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerBackdrop}>
          <View style={styles.drawerCard}>
            <View style={styles.drawerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerWorkerName}>{currentProfile.full_name}</Text>
                <Text style={styles.drawerWorkerMeta}>
                  {currentProfile.worker_code} · {currentProfile.assigned_area}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                onPress={() => setDrawerOpen(false)}
                style={styles.iconBtn}
              >
                <X size={20} color={ClinicalColors.textSecondary} />
              </Pressable>
            </View>

            {/* Portal Switcher: ASHA Portal vs PHC Supervisor */}
            <View style={styles.portalSwitchBox}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onPortalChange('asha')}
                style={[
                  styles.portalSwitchBtn,
                  portal === 'asha' && styles.portalSwitchBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.portalSwitchText,
                    portal === 'asha' && { color: ClinicalColors.primary },
                  ]}
                >
                  {ui.ashaPortal}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => onPortalChange('supervisor')}
                style={[
                  styles.portalSwitchBtn,
                  portal === 'supervisor' && styles.portalSwitchBtnActive,
                ]}
              >
                <Stethoscope
                  size={14}
                  color={
                    portal === 'supervisor'
                      ? ClinicalColors.slate900
                      : ClinicalColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.portalSwitchText,
                    portal === 'supervisor' && { color: ClinicalColors.slate900 },
                  ]}
                >
                  {ui.supervisorPortal}
                </Text>
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
              {activeItems.map((item) => {
                const isActive =
                  portal === 'asha'
                    ? ashaSection === item.id
                    : supervisorSection === item.id;
                const color = isActive
                  ? ClinicalColors.primaryDark
                  : ClinicalColors.text;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => handleSelectNav(item.id)}
                    style={[
                      styles.drawerItem,
                      isActive && styles.drawerItemActive,
                    ]}
                  >
                    <View style={styles.drawerItemLeft}>
                      {item.icon(color)}
                      <Text style={[styles.drawerItemLabel, { color }]}>
                        {item.label}
                      </Text>
                    </View>
                    {item.badge !== undefined && (
                      <View style={styles.drawerBadge}>
                        <Text style={styles.drawerBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              onPress={onSignOut}
              style={styles.drawerSignOutBtn}
            >
              <LogOut size={16} color={ClinicalColors.text} />
              <Text style={styles.drawerSignOutText}>{ui.signOut}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Quick Language Picker Sheet */}
      <Modal
        visible={langModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalOpen(false)}
      >
        <View style={styles.langModalBackdrop}>
          <View style={styles.langModalCard}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerWorkerName}>{ui.selectAppLanguage}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setLangModalOpen(false)}
                style={styles.iconBtn}
              >
                <X size={20} color={ClinicalColors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: Spacing.xs }}>
              {[
                ...PRISMA_LANGUAGES,
                {
                  code: 'indic-auto',
                  name: 'Auto-Detect',
                  nativeName: ui.autoDetectIndic,
                  isPrismaVoiceSupported: true,
                },
              ].map((l) => {
                const active = currentLanguage === l.code;
                return (
                  <Pressable
                    key={l.code}
                    accessibilityRole="button"
                    onPress={() => {
                      onLanguageChange(l.code);
                      setLangModalOpen(false);
                    }}
                    style={[
                      styles.langOptionRow,
                      active && styles.langOptionRowActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        active && { color: ClinicalColors.white },
                      ]}
                    >
                      {l.nativeName} ({l.name})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const BottomTabButton: React.FC<{
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onPress, icon, label }) => (
  <Pressable
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    accessibilityLabel={label}
    onPress={onPress}
    style={styles.bottomTabBtn}
  >
    {icon}
    <Text
      style={[
        styles.bottomTabLabel,
        {
          color: active ? ClinicalColors.primary : ClinicalColors.textSecondary,
        },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ClinicalColors.canvas,
  },
  header: {
    backgroundColor: ClinicalColors.glassWhiteStrong,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBtn: {
    minWidth: TouchTargets.min,
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    backgroundColor: ClinicalColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  apiDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  apiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  apiDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  workerSub: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBtn: {
    minHeight: TouchTargets.min,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    backgroundColor: ClinicalColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  bottomBar: {
    backgroundColor: ClinicalColors.glassWhiteStrong,
    borderTopWidth: 1,
    borderTopColor: ClinicalColors.border,
    paddingHorizontal: Spacing.sm,
    paddingTop: 6,
    paddingBottom: Spacing.sm,
    ...Shadows.glassCard,
  },
  tabGrid5: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabGrid4: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomTabBtn: {
    flex: 1,
    minHeight: TouchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  centerFabWrap: {
    width: 64,
    alignItems: 'center',
    marginTop: -22,
  },
  centerFab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ClinicalColors.primary,
    borderWidth: 3,
    borderColor: ClinicalColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  centerFabActive: {
    backgroundColor: ClinicalColors.primaryDark,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: ClinicalColors.backdropOverlay,
    flexDirection: 'row',
  },
  drawerCard: {
    width: '82%',
    maxWidth: 320,
    backgroundColor: ClinicalColors.card,
    padding: Spacing.lg,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ClinicalColors.borderSubtle,
  },
  drawerWorkerName: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  drawerWorkerMeta: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  portalSwitchBox: {
    flexDirection: 'row',
    backgroundColor: ClinicalColors.slate100,
    padding: 4,
    borderRadius: Radii.lg,
    gap: 4,
  },
  portalSwitchBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  portalSwitchBtnActive: {
    backgroundColor: ClinicalColors.white,
  },
  portalSwitchText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.textSecondary,
  },
  drawerItem: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerItemActive: {
    backgroundColor: ClinicalColors.primarySoft,
  },
  drawerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  drawerItemLabel: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  drawerBadge: {
    backgroundColor: ClinicalColors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  drawerBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  drawerSignOutBtn: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  drawerSignOutText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  langModalBackdrop: {
    flex: 1,
    backgroundColor: ClinicalColors.backdropOverlay,
    justifyContent: 'flex-end',
  },
  langModalCard: {
    backgroundColor: ClinicalColors.card,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    padding: Spacing.xl,
    maxHeight: '75%',
    gap: Spacing.md,
  },
  langOptionRow: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
  },
  langOptionRowActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  langOptionText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
});
