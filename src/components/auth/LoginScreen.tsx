import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  ArrowRight,
  Globe,
  HeartPulse,
  Lock,
  Server,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react-native';
import { GlassCard } from '@/components/ui/ClinicalUI';
import {
  fastApiClient,
  getVoiceApiBaseUrl,
  setCustomBackendUrl,
} from '@/lib/api/fastapi-client';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { SYNTHETIC_PROFILES } from '@/lib/mock-data';
import { isRealSupabaseConfigured, supabase } from '@/lib/supabase/client';
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

interface LoginScreenProps {
  selectedLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onAuthenticated: (profile: UserProfile) => void;
  onBackendUrlChanged?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  selectedLanguage,
  onLanguageChange,
  onAuthenticated,
  onBackendUrlChanged,
}) => {
  const { ui } = useTranslation(selectedLanguage);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showServerConfig, setShowServerConfig] = useState(false);
  const [backendUrlDraft, setBackendUrlDraft] = useState(getVoiceApiBaseUrl());
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const handleSupabaseLogin = async () => {
    setAuthError(null);
    if (!email.trim() || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }

    if (!supabase || !isRealSupabaseConfigured) {
      setAuthError(
        'Supabase Auth environment variables are not configured. Tap one of the synthetic role profiles above for instant field walkthroughs.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid credentials.');
      }

      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      const resolved: UserProfile = dbProfile
        ? {
            id: dbProfile.id,
            auth_user_id: data.user.id,
            worker_code: dbProfile.role === 'PHC_SUPERVISOR' ? 'SUP-PHC-01' : 'ASHA-DEMO-01',
            role: dbProfile.role,
            full_name: dbProfile.full_name,
            phone_number: dbProfile.phone_number,
            phc_id: dbProfile.phc_id,
            assigned_area: dbProfile.assigned_area,
            preferred_language: dbProfile.preferred_language || selectedLanguage,
            is_active: dbProfile.is_active,
          }
        : {
            ...SYNTHETIC_PROFILES[0],
            auth_user_id: data.user.id,
            full_name: data.user.email || 'Authenticated User',
            preferred_language: selectedLanguage,
          };

      onAuthenticated(resolved);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoRoleLogin = (profile: UserProfile) => {
    setAuthError(null);
    onAuthenticated({
      ...profile,
      preferred_language: profile.preferred_language || selectedLanguage,
    });
  };

  const handleSaveBackendUrl = async () => {
    setPingStatus('Testing connection...');
    await setCustomBackendUrl(backendUrlDraft.trim() || null);
    try {
      const health = await fastApiClient.getHealth();
      setPingStatus(
        `Connected: ${health.service} (${health.stt_model} + ${health.tts_model})`
      );
      onBackendUrlChanged?.();
    } catch {
      setPingStatus(
        `Saved URL (${getVoiceApiBaseUrl()}), but backend did not respond yet.`
      );
      onBackendUrlChanged?.();
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero Brand & Synthetic Role Sign-In Card */}
      <View style={styles.heroCard}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconBox}>
            <HeartPulse size={24} color={ClinicalColors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>{ui.appName}</Text>
            <Text style={styles.brandSubtitle}>ASHA Voice Field Register · NHM Platform</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>{ui.loginHeroTitle}</Text>
        <Text style={styles.heroDesc}>{ui.loginHeroDesc}</Text>

        <View style={styles.rolesSection}>
          <View style={styles.rolesHeadingRow}>
            <ShieldCheck size={15} color={ClinicalColors.primaryContainer} />
            <Text style={styles.rolesHeadingText}>{ui.syntheticRolesHeading}</Text>
          </View>

          {SYNTHETIC_PROFILES.map((profile) => {
            const isSupervisor = profile.role === 'PHC_SUPERVISOR';
            return (
              <Pressable
                key={profile.id}
                accessibilityRole="button"
                accessibilityLabel={`Sign in as ${profile.full_name}`}
                onPress={() => handleDemoRoleLogin(profile)}
                style={styles.roleBtn}
              >
                <View style={styles.roleBtnLeft}>
                  <View style={styles.roleIconBox}>
                    {isSupervisor ? (
                      <Stethoscope size={18} color={ClinicalColors.primary} />
                    ) : (
                      <UserCheck size={18} color={ClinicalColors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleName}>{profile.full_name}</Text>
                    <Text style={styles.roleArea}>
                      {isSupervisor ? ui.supervisorPortal : ui.ashaPortal} ·{' '}
                      {profile.assigned_area}
                    </Text>
                  </View>
                </View>
                <ArrowRight size={18} color={ClinicalColors.primarySoft} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.zeroPiiText}>{ui.zeroPiiNote}</Text>
      </View>

      {/* Language Picker + Staff Sign-In + Backend URL Settings */}
      <GlassCard padding="lg">
        <View style={{ gap: Spacing.md }}>
          <View style={{ gap: 6 }}>
            <View style={styles.sectionHeaderRow}>
              <Globe size={15} color={ClinicalColors.primary} />
              <Text style={styles.sectionHeaderLabel}>{ui.selectAppLanguage}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 4 }}
            >
              {[
                ...PRISMA_LANGUAGES,
                {
                  code: 'indic-auto',
                  name: 'Auto',
                  nativeName: ui.autoDetectIndic,
                  isPrismaVoiceSupported: true,
                },
              ].map((l) => {
                const active = selectedLanguage === l.code;
                return (
                  <Pressable
                    key={l.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onLanguageChange(l.code)}
                    style={[
                      styles.langChip,
                      active && styles.langChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langChipText,
                        active && { color: ClinicalColors.white },
                      ]}
                    >
                      {l.nativeName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Staff Credentials Login */}
          <View style={styles.divider} />

          <View style={styles.signInTitleRow}>
            <View style={styles.sectionHeaderRow}>
              <Lock size={15} color={ClinicalColors.primary} />
              <Text style={styles.signInTitle}>{ui.staffSignInTitle}</Text>
            </View>
            <View style={styles.modeTag}>
              <Text style={styles.modeTagText}>
                {isRealSupabaseConfigured ? ui.authConnected : 'Demo Ready'}
              </Text>
            </View>
          </View>

          {authError && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={ClinicalColors.danger} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>{ui.emailLabel}</Text>
            <TextInput
              accessibilityLabel={ui.emailLabel}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholder="asha.worker@phc-demo.local"
              placeholderTextColor={ClinicalColors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>{ui.passwordLabel}</Text>
            <TextInput
              accessibilityLabel={ui.passwordLabel}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={ClinicalColors.textMuted}
              style={styles.input}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ui.signInButton}
            disabled={isLoading}
            onPress={handleSupabaseLogin}
            style={[styles.signInBtn, isLoading && { opacity: 0.6 }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={ClinicalColors.white} />
            ) : null}
            <Text style={styles.signInBtnText}>
              {isLoading ? ui.signingInButton : ui.signInButton}
            </Text>
          </Pressable>

          {/* Production / LAN Backend Endpoint Configuration */}
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowServerConfig(!showServerConfig)}
            style={styles.serverToggleBtn}
          >
            <Server size={14} color={ClinicalColors.secondary} />
            <Text style={styles.serverToggleText}>
              Voice Backend URL: {getVoiceApiBaseUrl()} (Tap to Configure)
            </Text>
          </Pressable>

          {showServerConfig && (
            <View style={styles.serverConfigBox}>
              <Text style={styles.serverConfigHelp}>
                Set the FastAPI Voice Backend URL (e.g. http://10.178.123.170:8000 for LAN or your
                deployed HTTPS backend URL). API keys stay strictly on the backend.
              </Text>
              <TextInput
                accessibilityLabel="FastAPI Voice Backend Base URL"
                autoCapitalize="none"
                value={backendUrlDraft}
                onChangeText={setBackendUrlDraft}
                placeholder="http://10.178.123.170:8000"
                placeholderTextColor={ClinicalColors.textMuted}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveBackendUrl}
                style={styles.saveServerBtn}
              >
                <Text style={styles.saveServerBtnText}>Save &amp; Test Backend Connection</Text>
              </Pressable>
              {pingStatus && <Text style={styles.pingStatusText}>{pingStatus}</Text>}
            </View>
          )}
        </View>
      </GlassCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ClinicalColors.canvas,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  heroCard: {
    backgroundColor: ClinicalColors.primary,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.elevated,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandIconBox: {
    width: 46,
    height: 46,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  brandSubtitle: {
    fontSize: Typography.xs,
    color: ClinicalColors.primarySoft,
  },
  heroTitle: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: ClinicalColors.white,
    lineHeight: 30,
  },
  heroDesc: {
    fontSize: Typography.sm,
    color: ClinicalColors.primarySoft,
    lineHeight: 20,
  },
  rolesSection: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  rolesHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolesHeadingText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.primaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  roleBtn: {
    minHeight: TouchTargets.comfortable,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  roleBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleName: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  roleArea: {
    fontSize: Typography.xs,
    color: ClinicalColors.primarySoft,
    marginTop: 2,
  },
  zeroPiiText: {
    fontSize: 11,
    color: ClinicalColors.primarySoft,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderLabel: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.textSecondary,
    textTransform: 'uppercase',
  },
  langChip: {
    minHeight: TouchTargets.min,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    justifyContent: 'center',
  },
  langChipActive: {
    backgroundColor: ClinicalColors.primary,
    borderColor: ClinicalColors.primary,
  },
  langChipText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  divider: {
    height: 1,
    backgroundColor: ClinicalColors.borderSubtle,
  },
  signInTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signInTitle: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: ClinicalColors.text,
  },
  modeTag: {
    backgroundColor: ClinicalColors.slate100,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  modeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: ClinicalColors.textSecondary,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.dangerSoft,
    borderWidth: 1,
    borderColor: ClinicalColors.danger,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.xs,
    color: ClinicalColors.dangerDark,
    flex: 1,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.text,
  },
  input: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: ClinicalColors.border,
    backgroundColor: ClinicalColors.white,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sm,
    color: ClinicalColors.text,
  },
  signInBtn: {
    minHeight: TouchTargets.min,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.slate900,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  signInBtnText: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  serverToggleBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serverToggleText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.secondary,
    flex: 1,
  },
  serverConfigBox: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: ClinicalColors.canvas,
    borderWidth: 1,
    borderColor: ClinicalColors.borderSubtle,
    gap: Spacing.sm,
  },
  serverConfigHelp: {
    fontSize: 11,
    color: ClinicalColors.textSecondary,
    lineHeight: 16,
  },
  saveServerBtn: {
    minHeight: 42,
    borderRadius: Radii.md,
    backgroundColor: ClinicalColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveServerBtnText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: ClinicalColors.white,
  },
  pingStatusText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: ClinicalColors.primaryDark,
  },
});

