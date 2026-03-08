/**
 * QuietNight — Migraine Buddy–style design system (March 2026).
 * Purple CTA gradient (#6566C3 → #6E4BB1), dark backgrounds, 8px grid, Poppins.
 */

import { Platform } from "react-native";

// ============ Colors (screenshot / Migraine Buddy reference) ============

export const colors = {
  bg: {
    screen: "#1F2233",
    card: "#2D3246",
  },
  ctaGradient: ["#6566C3", "#6E4BB1"] as const,
  illustration: {
    star: "#F6C288",
    hair: "#7775D0",
    skin: "#F9DEE2",
  },
} as const;

// ============ Color Palette (theme tokens) ============

/** Primary CTA — first color of button gradient */
export const accentCTA = colors.ctaGradient[0];

/** Backgrounds (screen/card from colors.bg, rest aligned) */
export const background = {
  primary: colors.bg.screen,
  secondary: colors.bg.card,
  tertiary: "#35355A",
  card: colors.bg.card,
  cardElevated: "#35355A",
  input: "#252545",
  sheet: "#1A1A35",
} as const;

/** Accent tokens — purple gradient colors */
export const accent = {
  primary: colors.ctaGradient[0],
  hover: colors.ctaGradient[1],
  secondary: "#6C5CE7",
  link: "#A29BFE",
  premium: "#FFD700",
  /** Aliases for backward compatibility */
  teal: colors.ctaGradient[0],
  tealDark: colors.ctaGradient[1],
  tealLight: "#A29BFE",
  tealGlow: "rgba(101, 102, 195, 0.35)",
  tealSoft: "rgba(101, 102, 195, 0.15)",
  tealSoftBg: "rgba(101, 102, 195, 0.22)",
} as const;

/** Premium / gold */
export const gold = "#FFD700";

/** Gradient color arrays for LinearGradient */
export const gradient = {
  background: ["#1F2233", "#15152D"] as const,
  card: [colors.bg.card, "#232348"] as const,
  button: [...colors.ctaGradient] as const,
  cta: [...colors.ctaGradient] as const,
  premium: ["#FFD700", "#FFA500"] as const,
} as const;

/** 10-level severity gradient (Excellent → Unbearable) */
export const severityGradient = [
  "#4CAF50", // 1 Excellent
  "#66BB6A", // 2 Very good
  "#8BC34A", // 3 Good
  "#CDDC39", // 4 Decent
  "#FFEB3B", // 5 Average
  "#FFC107", // 6 Below average
  "#FF9800", // 7 Poor
  "#FF5722", // 8 Very poor
  "#F44336", // 9 Terrible
  "#D32F2F", // 10 Unbearable
] as const;

/** Text */
export const text = {
  primary: "#FFFFFF",
  secondary: "#B0B3C5",
  muted: "#6C6F80",
  onAccent: "#FFFFFF",
  onCard: "#E8E8F0",
  dark: "#5a6478",
} as const;

/** Semantic / status */
export const semantic = {
  success: "#2ECC71",
  warning: "#F39C12",
  error: "#E74C3C",
  danger: "#E74C3C",
  info: "#3498DB",
  successLight: "#4FB06D",
  tealLight: accent.tealLight,
} as const;

/** Surfaces (alias for background where used as surface) */
export const surface = {
  elevated: background.secondary,
  input: background.input,
} as const;

/** Night mode */
export const nightMode = {
  background: "#000000",
} as const;

/** Partner / secondary (kept for compatibility) */
export const partner = {
  indigo: "#6C5CE7",
  indigoLight: "#A29BFE",
  indigoSoft: "rgba(108, 92, 231, 0.2)",
  indigoBorder: "rgba(108, 92, 231, 0.4)",
  indigoSoftBg: "rgba(108, 92, 231, 0.22)",
  partnerQuote: "#E8E8F0",
} as const;

// ============ Typography (Poppins, full scale) ============

export const fonts = {
  heading: "Poppins_700Bold",
  headingSemi: "Poppins_600SemiBold",
  body: "Poppins_400Regular",
  bodyMedium: "Poppins_500Medium",
} as const;

/** Full type scale per revised spec */
export const type = {
  displayLg: { fontSize: 32, fontFamily: fonts.heading, lineHeight: 40, letterSpacing: -0.5 },
  displayMd: { fontSize: 28, fontFamily: fonts.headingSemi, lineHeight: 36, letterSpacing: -0.3 },
  headingLg: { fontSize: 24, fontFamily: fonts.headingSemi, lineHeight: 32, letterSpacing: 0 },
  headingMd: { fontSize: 20, fontFamily: fonts.bodyMedium, lineHeight: 28, letterSpacing: 0 },
  headingSm: { fontSize: 18, fontFamily: fonts.bodyMedium, lineHeight: 24, letterSpacing: 0.1 },
  bodyLg: { fontSize: 16, fontFamily: fonts.body, lineHeight: 24, letterSpacing: 0.2 },
  bodyMd: { fontSize: 14, fontFamily: fonts.body, lineHeight: 20, letterSpacing: 0.2 },
  bodySm: { fontSize: 12, fontFamily: fonts.body, lineHeight: 16, letterSpacing: 0.3 },
  label: { fontSize: 14, fontFamily: fonts.bodyMedium, lineHeight: 20, letterSpacing: 0.4 },
  labelSm: { fontSize: 12, fontFamily: fonts.bodyMedium, lineHeight: 16, letterSpacing: 0.4 },
  micro: { fontSize: 10, fontFamily: fonts.bodyMedium, lineHeight: 14, letterSpacing: 0.5 },
  /** Legacy aliases */
  display: { fontSize: 32, fontFamily: fonts.heading, lineHeight: 40, letterSpacing: -0.5 },
  hero: { fontSize: 26, fontFamily: fonts.heading, lineHeight: 32, letterSpacing: 0 },
  title: { fontSize: 22, fontFamily: fonts.headingSemi, lineHeight: 28, letterSpacing: 0 },
  titleCard: { fontSize: 17, fontFamily: fonts.headingSemi, lineHeight: 22, letterSpacing: 0 },
  body: { fontSize: 15, fontFamily: fonts.body, lineHeight: 22, letterSpacing: 0 },
  bodySmall: { fontSize: 13, fontFamily: fonts.body, lineHeight: 18, letterSpacing: 0 },
  caption: { fontSize: 11, fontFamily: fonts.body, lineHeight: 14, letterSpacing: 0.3 },
  button: { fontSize: 14, fontFamily: fonts.bodyMedium, lineHeight: 20, letterSpacing: 0.3 },
  stat: { fontSize: 20, fontFamily: fonts.heading, lineHeight: 24, letterSpacing: 0 },
} as const;

// ============ 8px spacing grid (strict) ============

export const spacing = {
  "2xs": 4,
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  "2xl": 48,
  "3xl": 56,
  "4xl": 64,
  /** Aliases */
  xxs: 8,
  xxl: 56,
  xxxl: 64,
  screenPadding: 24,
  screenTop: 80,
  cardPadding: 16,
  cardPaddingLarge: 24,
  sectionGap: 24,
  sectionGapLarge: 40,
  stackXs: 8,
  stackSm: 8,
  stackMd: 16,
  stackLg: 24,
  stackXl: 32,
} as const;

// ============ Border radius ============

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  full: 9999,
  /** Aliases */
  button: 24,
  card: 16,
  pill: 32,
  avatar: 28,
  toggle: 24,
  input: 12,
} as const;

// ============ Elevation / shadows ============

export const elevation = {
  none: { shadowOpacity: 0, elevation: 0 },
  low: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  mid: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  high: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
    shadowOpacity: 0.4,
    elevation: 12,
  },
  ctaGlow: {
    shadowColor: colors.ctaGradient[0],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

/** Shadows alias for components that use shadows. */
export const shadows = elevation;

// ============ Component presets ============

export const presets = {
  screen: {
    flex: 1,
    backgroundColor: background.primary,
    padding: spacing.screenPadding,
    paddingTop: spacing.screenTop,
  },
  screenSecondary: {
    flex: 1,
    backgroundColor: background.secondary,
    padding: spacing.screenPadding,
    paddingTop: 56,
  },
  cardPartner: {
    backgroundColor: accent.tealSoftBg,
    padding: spacing.cardPadding,
    borderRadius: radius.lg,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: accent.tealGlow,
  },
  cardExperiment: {
    backgroundColor: accent.tealSoftBg,
    padding: spacing.cardPaddingLarge,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: accent.tealGlow,
  },
  buttonPrimary: {
    height: 56,
    borderRadius: radius.xl,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: accent.primary,
  },
  buttonPrimaryText: {
    color: text.onAccent,
    ...type.button,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 3,
    borderColor: background.primary,
  },
  nightScreen: {
    flex: 1,
    backgroundColor: nightMode.background,
    padding: spacing.screenPadding,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
} as const;

// ============ Tab bar ============

export const tabBar = {
  backgroundColor: background.secondary,
  borderTopWidth: 1,
  borderTopColor: "rgba(255,255,255,0.06)",
  activeTintColor: accent.primary,
  inactiveTintColor: text.muted,
} as const;

// ============ Legacy ============

export const gradientButtonStart = accent.primary;
export const gradientButtonEnd = accent.hover;

const tintColorLight = accent.primary;
const tintColorDark = accent.tealLight;

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: text.primary,
    background: background.primary,
    tint: accent.primary,
    icon: text.secondary,
    tabIconDefault: text.muted,
    tabIconSelected: accent.primary,
  },
};

export const Fonts = Platform.select({
  ios: { sans: "System", serif: "Georgia", heading: "System", body: "System" },
  default: { sans: "normal", serif: "serif", heading: "sans-serif", body: "sans-serif" },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, serif",
    heading: "'Poppins', system-ui, sans-serif",
    body: "'Poppins', system-ui, sans-serif",
  },
});
