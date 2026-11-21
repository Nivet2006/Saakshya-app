import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/ClinicalUI';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { PRISMA_LANGUAGES } from '@/lib/translations';
import {
  ClinicalColors,
  Radii,
  Spacing,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import type { LanguageCode } from '@/types';

interface LanguageSelectorProps {
  selectedLanguage: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onChange,
  disabled = false,
}) => {
  const { ui } = useTranslation(selectedLanguage);

  const allOptions = [
    ...PRISMA_LANGUAGES.map((l) => ({
      code: l.code,
      nativeName: l.nativeName,
      englishName: l.name,
    })),
    {
      code: 'indic-auto',
      nativeName: ui.autoDetectIndic,
      englishName: 'Auto-Mix',
    },
  ];

  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Globe size={20} color={ClinicalColors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ui.step2Title}</Text>
          <Text style={styles.subtitle}>{ui.step2Subtitle}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {allOptions.map((item) => {
          const active = selectedLanguage === item.code;
          return (
            <Pressable
              key={item.code}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={`${item.nativeName} (${item.englishName})`}
              disabled={disabled}
              onPress={() => onChange(item.code)}
              style={[
                styles.langPill,
                active ? styles.langPillActive : styles.langPillInactive,
                disabled && { opacity: 0.55 },
              ]}
            >
              <Text
                style={[
                  styles.langNative,
                  active ? styles.langTextActive : styles.langTextInactive,
                ]}
              >
                {item.nativeName}
              </Text>
              <Text
                style={[
                  styles.langSub,
                  active ? styles.langSubActive : styles.langSubInactive,
                ]}
              >
                {item.englishName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: ClinicalColors.textSecondary,
    marginTop: 2,
  },
  pillsRow: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  langPill: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langPillActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  langPillInactive: {
    backgroundColor: ClinicalColors.white,
    borderColor: ClinicalColors.border,
  },
  langNative: {
    fontSize: Typography.sm,
    fontWeight: '800',
  },
  langSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  langTextActive: {
    color: ClinicalColors.white,
  },
  langTextInactive: {
    color: ClinicalColors.text,
  },
  langSubActive: {
    color: ClinicalColors.primarySoft,
  },
  langSubInactive: {
    color: ClinicalColors.textSecondary,
  },
});

