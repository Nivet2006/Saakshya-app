import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DangerAlertBanner } from '@/components/DangerAlertBanner';
import type { NewPatientInput } from '@/components/asha/AddPatientModal';
import { ErrorBanner } from '@/components/ui/ClinicalUI';
import { AdvancedVisitView } from '@/components/voice/AdvancedVisitView';
import { BasicVisitView } from '@/components/voice/BasicVisitView';
import { ModeSelector } from '@/components/voice/ModeSelector';
import { useVoiceVisitSession } from '@/hooks/useVoiceVisitSession';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { ClinicalColors, Spacing, Typography } from '@/theme/tokens';
import type {
  AshaExperienceMode,
  Beneficiary,
  LanguageCode,
  UserProfile,
  VisitDraft,
} from '@/types';

interface VoiceVisitWorkspaceProps {
  worker: UserProfile;
  beneficiaries: Beneficiary[];
  recentVisits: VisitDraft[];
  selectedBeneficiary: Beneficiary | null;
  onSelectBeneficiary: (ben: Beneficiary | null) => void;
  onAddBeneficiary?: (input: NewPatientInput) => Promise<Beneficiary>;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  onVisitCommitted: (visit: VisitDraft) => void;
  onGoHome: () => void;
}

const MODE_STORAGE_KEY = 'sakshya_asha_experience_mode';

export const VoiceVisitWorkspace: React.FC<VoiceVisitWorkspaceProps> = ({
  worker,
  beneficiaries,
  recentVisits,
  selectedBeneficiary,
  onSelectBeneficiary,
  onAddBeneficiary,
  language,
  onChangeLanguage,
  onVisitCommitted,
  onGoHome,
}) => {
  const { ui } = useTranslation(language);
  const [mode, setMode] = useState<AshaExperienceMode>('basic');

  useEffect(() => {
    AsyncStorage.getItem(MODE_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'advanced' || saved === 'basic') {
          setMode(saved);
        }
      })
      .catch(() => {});
  }, []);

  const handleModeChange = (next: AshaExperienceMode) => {
    setMode(next);
    void AsyncStorage.setItem(MODE_STORAGE_KEY, next).catch(() => {});
  };

  const voice = useVoiceVisitSession({
    worker,
    language,
    selectedBeneficiary,
    beneficiaries,
    onSelectBeneficiary,
    onDataCommitted: onVisitCommitted,
  });

  const recentIds = Array.from(
    new Set(
      recentVisits
        .map((v) => v.beneficiary_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{ui.recordHouseholdVisitTitle}</Text>
        <Text style={styles.subtitle}>{ui.recordHouseholdVisitSubtitle}</Text>
      </View>

      {/* Two Distinct Modes: Basic (Default Voice-First) vs Advanced (Clinical Sections) */}
      <ModeSelector mode={mode} onChange={handleModeChange} />

      {/* Urgent Danger Sign Alerts ALWAYS Override Normal Flow & Persist Until Acknowledged */}
      {voice.dangerAlerts.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          {voice.dangerAlerts.map((alert) => (
            <DangerAlertBanner
              key={alert.alert_id}
              alert={alert}
              language={language}
              onAcknowledge={(id) => voice.acknowledgeDangerAlert(id)}
            />
          ))}
        </View>
      )}

      {/* Session Error Recovery Banner */}
      {voice.error && (
        <ErrorBanner
          title={`Voice Session Issue (${voice.error.code})`}
          message={voice.error.message}
          onRetry={voice.error.retryable ? voice.startVoiceSession : undefined}
          retryLabel="Reconnect Session"
          onDismiss={() => voice.setError(null)}
        />
      )}

      {/* Basic Mode vs Advanced Mode sharing the exact same VisitDraft & VoiceSession */}
      {mode === 'basic' ? (
        <BasicVisitView
          beneficiaries={beneficiaries}
          recentBeneficiaryIds={recentIds}
          selectedBeneficiary={selectedBeneficiary}
          onSelectBeneficiary={onSelectBeneficiary}
          onAddBeneficiary={onAddBeneficiary}
          language={language}
          onChangeLanguage={onChangeLanguage}
          voice={voice}
          onGoHome={onGoHome}
        />
      ) : (
        <AdvancedVisitView
          beneficiaries={beneficiaries}
          recentBeneficiaryIds={recentIds}
          selectedBeneficiary={selectedBeneficiary}
          onSelectBeneficiary={onSelectBeneficiary}
          onAddBeneficiary={onAddBeneficiary}
          language={language}
          onChangeLanguage={onChangeLanguage}
          voice={voice}
          onSwitchToBasic={() => handleModeChange('basic')}
          onGoHome={onGoHome}
        />
      )}
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
    lineHeight: 18,
  },
});
