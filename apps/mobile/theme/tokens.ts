import { StyleSheet } from 'react-native';

export const colors = {
  background: '#030508',
  backgroundRaised: '#060A12',
  surface: '#0C1020',
  surfaceElevated: '#101627',
  surfaceMuted: '#090D18',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.13)',
  textPrimary: '#F0F4FF',
  textSecondary: '#8A9BB8',
  textMuted: '#4E5D72',
  accent: '#8B5CF6',
  accentPressed: '#7C3AED',
  accentSoft: 'rgba(139, 92, 246, 0.16)',
  accentGlow: 'rgba(139, 92, 246, 0.38)',
  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.14)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  overlay: 'rgba(3, 5, 8, 0.80)',
  white: '#FFFFFF',
  glassHighlight: 'rgba(255, 255, 255, 0.07)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  badge: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500' as const,
  },
  bodyLg: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700' as const,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700' as const,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
    letterSpacing: 0.1,
  },
} as const;

export const borderWidth = {
  subtle: StyleSheet.hairlineWidth,
  regular: 1,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  borderWidth,
} as const;
