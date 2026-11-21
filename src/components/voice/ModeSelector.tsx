import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Layers, Mic } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ClinicalColors,
  Radii,
  Shadows,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { AshaExperienceMode } from '@/types';

interface ModeSelectorProps {
  mode: AshaExperienceMode;
  onChange: (mode: AshaExperienceMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onChange }) => {
  const { ui } = useTranslation();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Experience Mode Selection"
      style={styles.container}
    >
      {/* Basic Mode — Voice-First Default */}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: mode === 'basic' }}
        accessibilityLabel={`${ui.basicModeTitle}: ${ui.basicModeDesc}`}
        onPress={() => onChange('basic')}
        style={[
          styles.modeCard,
          mode === 'basic' ? styles.basicActive : styles.inactiveCard,
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor:
                mode === 'basic' ? ClinicalColors.primary : ClinicalColors.slate100,
            },
          ]}
        >
          <Mic
            size={20}
            color={mode === 'basic' ? ClinicalColors.white : ClinicalColors.textSecondary}
          />
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.modeTitle}>{ui.basicModeTitle}</Text>
            <View style={styles.basicBadge}>
              <Text style={styles.basicBadgeText}>{ui.basicModeBadge}</Text>
            </View>
          </View>
          <Text style={styles.modeDesc} numberOfLines={2}>
            {ui.basicModeDesc}
          </Text>
        </View>
      </Pressable>

      {/* Advanced Mode — Detailed Clinical View */}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: mode === 'advanced' }}
        accessibilityLabel={`${ui.advancedModeTitle}: ${ui.advancedModeDesc}`}
        onPress={() => onChange('advanced')}
        style={[
          styles.modeCard,
          mode === 'advanced' ? styles.advancedActive : styles.inactiveCard,
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor:
                mode === 'advanced' ? ClinicalColors.secondary : ClinicalColors.slate100,
            },
          ]}
        >
          <Layers
            size={20}
            color={mode === 'advanced' ? ClinicalColors.white : ClinicalColors.textSecondary}
          />
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.modeTitle}>{ui.advancedModeTitle}</Text>
            <View style={styles.advancedBadge}>
              <Text style={styles.advancedBadgeText}>{ui.advancedModeBadge}</Text>
            </View>
          </View>
          <Text style={styles.modeDesc} numberOfLines={2}>
            {ui.advancedModeDesc}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  modeCard: {
    minHeight: TouchTargets.comfortable,
    borderRadius: Radii.xl,
    borderWidth: 2,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    ...Shadows.glassCard,
  },
  basicActive: {
    backgroundColor: ClinicalColors.glassTeal,
    borderColor: ClinicalColors.primary,
  },
  advancedActive: {
    backgroundColor: ClinicalColors.glassSky,
    borderColor: ClinicalColors.secondary,
  },
  inactiveCard: {
    backgroundColor: ClinicalColors.glassWhiteStrong,
    borderColor: ClinicalColors.borderSubtle,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  modeTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  basicBadge: {
    backgroundColor: ClinicalColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  basicBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: ClinicalColors.white,
    textTransform: 'uppercase',
  },
  advancedBadge: {
    backgroundColor: ClinicalColors.slate100,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  advancedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  modeDesc: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    lineHeight: 17,
  },
});

