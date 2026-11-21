import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AshaHomeView } from '@/components/asha/AshaHomeView';
import { BeneficiaryDirectoryView } from '@/components/asha/BeneficiaryDirectoryView';
import { FollowUpQueueView } from '@/components/asha/FollowUpQueueView';
import { OfflineDraftsView } from '@/components/asha/OfflineDraftsView';
import { VisitHistoryView } from '@/components/asha/VisitHistoryView';
import { LoginScreen } from '@/components/auth/LoginScreen';
import {
  AppShell,
  type AshaNavSection,
  type SupervisorNavSection,
} from '@/components/layout/AppShell';
import {
  SupervisorAnalyticsView,
  SupervisorReportsView,
} from '@/components/supervisor/SupervisorAnalyticsAndReports';
import {
  DangerCommandCenterView,
  SupervisorOverviewView,
} from '@/components/supervisor/SupervisorOverviewAndAlerts';
import {
  AshaWorkerManagementView,
  SupervisorVisitRegisterView,
} from '@/components/supervisor/SupervisorWorkersAndRegister';
import { VoiceVisitWorkspace } from '@/components/voice/VoiceVisitWorkspace';
import {
  computeDailyVisitVolume,
  computeSupervisorOverview,
  computeVisitTypeDistribution,
  computeWorkerMetrics,
} from '@/lib/analytics/supervisor-metrics';
import { fastApiClient, loadSavedBackendUrl } from '@/lib/api/fastapi-client';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { getAllLocalDrafts } from '@/lib/offline/offline-store';
import { isRealSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { dataService } from '@/services/data-service';
import { ClinicalColors } from '@/theme/tokens';
import type {
  AuditLogEntry,
  Beneficiary,
  DangerAlert,
  FollowUpTask,
  ImmunisationScheduleItem,
  LanguageCode,
  UserProfile,
  VisitDraft,
} from '@/types';

const SESSION_PROFILE_KEY = 'sakshya_active_profile';
const LANGUAGE_STORAGE_KEY = 'asha_selected_language';

export default function App() {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [portal, setPortal] = useState<'asha' | 'supervisor'>('asha');
  const [ashaSection, setAshaSection] = useState<AshaNavSection>('home');
  const [supervisorSection, setSupervisorSection] =
    useState<SupervisorNavSection>('overview');
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('hi-IN');

  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [visits, setVisits] = useState<VisitDraft[]>([]);
  const [localDrafts, setLocalDrafts] = useState<VisitDraft[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [immunisations, setImmunisations] = useState<ImmunisationScheduleItem[]>([]);
  const [dangerAlerts, setDangerAlerts] = useState<DangerAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [selectedBeneficiaryForVoice, setSelectedBeneficiaryForVoice] =
    useState<Beneficiary | null>(null);

  const checkBackendHealth = useCallback(async () => {
    try {
      const h = await fastApiClient.getHealth();
      setBackendHealthy(h.status === 'ok');
    } catch {
      setBackendHealthy(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await dataService.hydrateFromStorage();
    setBeneficiaries(dataService.getBeneficiaries());
    setWorkers(dataService.getProfiles());
    setVisits(dataService.getVisits());
    setFollowUps(dataService.getFollowUps());
    setImmunisations(dataService.getImmunisations());
    setDangerAlerts(dataService.getDangerAlerts());
    setAuditLogs(dataService.getAuditLogs());
    const drafts = await getAllLocalDrafts();
    setLocalDrafts(drafts);
  }, []);

  useEffect(() => {
    void (async () => {
      await loadSavedBackendUrl();
      const [savedLang, savedProfileRaw] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
        AsyncStorage.getItem(SESSION_PROFILE_KEY),
      ]);
      if (savedLang) setCurrentLanguage(savedLang);
      if (savedProfileRaw) {
        try {
          const parsed = JSON.parse(savedProfileRaw) as UserProfile;
          setCurrentProfile(parsed);
          setPortal(
            parsed.role === 'PHC_SUPERVISOR' || parsed.role === 'ADMIN'
              ? 'supervisor'
              : 'asha'
          );
        } catch {
          // ignore
        }
      }

      await refreshAllData();
      void dataService.refreshBeneficiaries().then((list) => setBeneficiaries(list));
      void checkBackendHealth();
    })();

    const unsubRealtime = dataService.subscribeToRealtimeAlerts(() => {
      void refreshAllData();
    });
    return () => {
      unsubRealtime();
    };
  }, [refreshAllData, checkBackendHealth]);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang).catch(() => {});
  };

  const handleAuthenticated = (profile: UserProfile) => {
    setCurrentProfile(profile);
    setPortal(
      profile.role === 'PHC_SUPERVISOR' || profile.role === 'ADMIN'
        ? 'supervisor'
        : 'asha'
    );
    setAshaSection('home');
    setSupervisorSection('overview');
    void AsyncStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile)).catch(
      () => {}
    );
    void refreshAllData();
  };

  const handleSignOut = async () => {
    if (supabase && isRealSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    await AsyncStorage.removeItem(SESSION_PROFILE_KEY).catch(() => {});
    setCurrentProfile(null);
  };

  const handleStartVoiceVisit = (ben?: Beneficiary) => {
    setSelectedBeneficiaryForVoice(ben || null);
    setPortal('asha');
    setAshaSection('voice');
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    if (!currentProfile) return;
    dataService.updateDangerAlertStatus(alertId, 'acknowledged', currentProfile);
    void refreshAllData();
  };

  const handleUpdateAlertStatus = (
    alertId: string,
    nextStatus: DangerAlert['status']
  ) => {
    if (!currentProfile) return;
    dataService.updateDangerAlertStatus(alertId, nextStatus, currentProfile);
    void refreshAllData();
  };

  const handleToggleFollowUp = (taskId: string) => {
    dataService.toggleFollowUpStatus(taskId);
    void refreshAllData();
  };

  const handleAddBeneficiary = async (input: {
    full_name: string;
    category: Beneficiary['category'];
    age_years: number;
    village: string;
    household_head?: string;
    phone_number?: string;
    edd_date?: string;
    high_risk_status: boolean;
    preferred_language: LanguageCode;
  }): Promise<Beneficiary> => {
    const created = await dataService.addBeneficiary({
      ...input,
      assigned_asha_id: currentProfile?.id,
      phc_id: currentProfile?.phc_id,
    });
    await refreshAllData();
    return created;
  };

  const handleClearVisits = async () => {
    await dataService.clearAllVisits();
    await refreshAllData();
  };

  const handleClearAlerts = () => {
    dataService.clearAllDangerAlerts();
    void refreshAllData();
  };

  const supervisorStats = useMemo(
    () =>
      computeSupervisorOverview({
        beneficiaries,
        workers,
        visits,
        allLocalDrafts: localDrafts,
        followUps,
        immunisations,
        dangerAlerts,
      }),
    [
      beneficiaries,
      workers,
      visits,
      localDrafts,
      followUps,
      immunisations,
      dangerAlerts,
    ]
  );

  const workerMetrics = useMemo(
    () =>
      computeWorkerMetrics({
        workers,
        beneficiaries,
        visits,
        followUps,
        dangerAlerts,
      }),
    [workers, beneficiaries, visits, followUps, dangerAlerts]
  );

  const dailyVolume = useMemo(() => computeDailyVisitVolume(visits, 7), [visits]);
  const typeDistribution = useMemo(
    () => computeVisitTypeDistribution(visits),
    [visits]
  );

  const unresolvedAlertCount = dangerAlerts.filter((a) => a.status === 'active').length;
  const offlinePendingCount = localDrafts.filter(
    (d) =>
      d.sync_status === 'pending' ||
      d.sync_status === 'failed' ||
      d.sync_status === 'conflict'
  ).length;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: ClinicalColors.canvas }}
        edges={['top', 'left', 'right']}
      >
        <StatusBar style="dark" />
        <LanguageProvider
          language={currentLanguage}
          onLanguageChange={handleLanguageChange}
        >
          {!currentProfile ? (
            <LoginScreen
              selectedLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
              onAuthenticated={handleAuthenticated}
              onBackendUrlChanged={() => {
                void checkBackendHealth();
                void dataService
                  .refreshBeneficiaries()
                  .then((list) => setBeneficiaries(list));
              }}
            />
          ) : (
            <AppShell
              currentProfile={currentProfile}
              portal={portal}
              onPortalChange={setPortal}
              ashaSection={ashaSection}
              onAshaSectionChange={setAshaSection}
              supervisorSection={supervisorSection}
              onSupervisorSectionChange={setSupervisorSection}
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
              backendHealthy={backendHealthy}
              unresolvedAlertCount={unresolvedAlertCount}
              offlinePendingCount={offlinePendingCount}
              onSignOut={handleSignOut}
            >
              {portal === 'asha' ? (
                <>
                  {ashaSection === 'home' && (
                    <AshaHomeView
                      profile={currentProfile}
                      language={currentLanguage}
                      beneficiaries={beneficiaries}
                      visits={visits}
                      followUps={followUps}
                      immunisations={immunisations}
                      dangerAlerts={dangerAlerts}
                      onStartVoiceVisit={handleStartVoiceVisit}
                      onNavigateSection={setAshaSection}
                      onAcknowledgeAlert={handleAcknowledgeAlert}
                      onClearVisits={handleClearVisits}
                      onClearAlerts={handleClearAlerts}
                    />
                  )}

                  {ashaSection === 'voice' && (
                    <VoiceVisitWorkspace
                      worker={currentProfile}
                      beneficiaries={beneficiaries}
                      recentVisits={visits}
                      selectedBeneficiary={selectedBeneficiaryForVoice}
                      onSelectBeneficiary={setSelectedBeneficiaryForVoice}
                      onAddBeneficiary={handleAddBeneficiary}
                      language={currentLanguage}
                      onChangeLanguage={handleLanguageChange}
                      onVisitCommitted={() => {
                        void refreshAllData();
                      }}
                      onGoHome={() => setAshaSection('home')}
                    />
                  )}

                  {ashaSection === 'beneficiaries' && (
                    <BeneficiaryDirectoryView
                      beneficiaries={beneficiaries}
                      visits={visits}
                      followUps={followUps}
                      immunisations={immunisations}
                      onStartVoiceVisit={handleStartVoiceVisit}
                      onAddBeneficiary={handleAddBeneficiary}
                      currentLanguage={currentLanguage}
                    />
                  )}

                  {ashaSection === 'followups' && (
                    <FollowUpQueueView
                      followUps={followUps}
                      immunisations={immunisations}
                      onToggleFollowUp={handleToggleFollowUp}
                    />
                  )}

                  {ashaSection === 'history' && (
                    <VisitHistoryView
                      visits={visits}
                      onClearVisits={handleClearVisits}
                    />
                  )}

                  {ashaSection === 'offline' && (
                    <OfflineDraftsView onSynced={refreshAllData} />
                  )}
                </>
              ) : (
                <>
                  {supervisorSection === 'overview' && (
                    <SupervisorOverviewView
                      profile={currentProfile}
                      stats={supervisorStats}
                      dangerAlerts={dangerAlerts}
                      recentVisits={visits}
                      language={currentLanguage}
                      realtimeConnected={isRealSupabaseConfigured}
                      onAcknowledgeAlert={handleAcknowledgeAlert}
                      onUpdateAlertStatus={handleUpdateAlertStatus}
                      onNavigateSection={setSupervisorSection}
                    />
                  )}

                  {supervisorSection === 'alerts' && (
                    <DangerCommandCenterView
                      dangerAlerts={dangerAlerts}
                      language={currentLanguage}
                      onAcknowledgeAlert={handleAcknowledgeAlert}
                      onUpdateAlertStatus={handleUpdateAlertStatus}
                    />
                  )}

                  {supervisorSection === 'workers' && (
                    <AshaWorkerManagementView
                      workerRows={workerMetrics}
                      visits={visits}
                    />
                  )}

                  {supervisorSection === 'register' && (
                    <SupervisorVisitRegisterView
                      visits={visits}
                      workers={workerMetrics}
                    />
                  )}

                  {supervisorSection === 'analytics' && (
                    <SupervisorAnalyticsView
                      stats={supervisorStats}
                      dailyVolume={dailyVolume}
                      typeDistribution={typeDistribution}
                      workerRows={workerMetrics}
                      dangerAlerts={dangerAlerts}
                    />
                  )}

                  {supervisorSection === 'reports' && (
                    <SupervisorReportsView
                      visits={visits}
                      workers={workers}
                      auditLogs={auditLogs}
                    />
                  )}
                </>
              )}
            </AppShell>
          )}
        </LanguageProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
