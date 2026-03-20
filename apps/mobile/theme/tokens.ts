import { StyleSheet } from 'react-native';

export const colors = {
  background: '#07090F',
  backgroundRaised: '#0B0E16',
  surface: '#11141D',
  surfaceElevated: '#151A26',
  surfaceMuted: '#0D1018',
  border: '#242B39',
  borderStrong: '#313A4C',
  textPrimary: '#F5F7FC',
  textSecondary: '#A8B1C7',
  textMuted: '#7A8399',
  accent: '#7856FF',
  accentPressed: '#6746F0',
  accentSoft: 'rgba(120, 86, 255, 0.16)',
  success: '#53D7A6',
  successSoft: 'rgba(83, 215, 166, 0.14)',
  info: '#8AA5FF',
  infoSoft: 'rgba(138, 165, 255, 0.15)',
  warning: '#F2B55D',
  warningSoft: 'rgba(242, 181, 93, 0.15)',
  danger: '#FF7C93',
  dangerSoft: 'rgba(255, 124, 147, 0.15)',
  overlay: 'rgba(4, 6, 10, 0.72)',
  white: '#FFFFFF',
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
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  badge: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
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
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700' as const,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700' as const,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
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
