/**
 * Authoritative Design System & Liquid-Glass Theme Tokens
 * Extracted 1:1 from sakshya-web-main/tailwind.config.ts and src/app/globals.css
 * No hard-coded colours outside this theme file.
 */

export const ClinicalColors = {
  // Primary Clinical Teal
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#CCFBF1',
  primaryContainer: '#99F6E4',

  // Secondary Clinical Sky Blue
  secondary: '#0284C7',
  secondaryDark: '#0369A1',
  secondarySoft: '#E0F2FE',
  secondaryContainer: '#BAE6FD',

  // Urgent Danger / Emergency Crimson
  danger: '#DC2626',
  dangerDark: '#991B1B',
  dangerSoft: '#FEF2F2',
  dangerContainer: '#FEE2E2',

  // Warning Amber
  warning: '#D97706',
  warningDark: '#92400E',
  warningSoft: '#FFFBEB',
  warningContainer: '#FEF3C7',

  // Success Emerald
  success: '#0D9488',
  successDark: '#065F46',
  successSoft: '#ECFDF5',
  successContainer: '#A7F3D0',

  // Correction Indigo
  indigo: '#4F46E5',
  indigoDark: '#312E81',
  indigoSoft: '#EEF2FF',
  indigoBorder: '#C7D2FE',

  // Canvas, Cards, Borders & Typography (High-Contrast >= 4.5:1)
  canvas: '#F8FAFC',
  canvasAlt: '#F1F5F9',
  card: '#FFFFFF',
  border: '#CBD5E1',
  borderSubtle: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  white: '#FFFFFF',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate100: '#F1F5F9',

  // Apple-Inspired Liquid Glass Translucent Surfaces (with high-contrast legibility)
  glassWhite: 'rgba(255, 255, 255, 0.88)',
  glassWhiteStrong: 'rgba(255, 255, 255, 0.94)',
  glassTeal: 'rgba(240, 253, 250, 0.90)',
  glassSky: 'rgba(240, 249, 255, 0.90)',
  glassAmber: 'rgba(255, 251, 235, 0.92)',
  glassDanger: 'rgba(220, 38, 38, 0.96)',
  glassDark: 'rgba(15, 23, 42, 0.92)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',
  glassBorderSubtle: 'rgba(203, 213, 225, 0.75)',
  backdropOverlay: 'rgba(15, 23, 42, 0.55)',
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const TouchTargets = {
  min: 48, // >= 48dp mandatory field touch target
  comfortable: 56,
  heroMic: 88,
} as const;

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 28,
} as const;

export const Shadows = {
  glassCard: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
  dangerGlow: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

