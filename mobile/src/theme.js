import { Platform } from "react-native";

export const colors = {
  bg: "#eef2f6",
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  primary: "#0284c7",
  primaryDark: "#0369a1",
  primarySoft: "#e0f2fe",
  success: "#16a34a",
  successSoft: "#ecfdf5",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  danger: "#dc2626",
  dangerSoft: "#fef2f2"
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999
};

export const layout = {
  maxContentWidth: 720,
  maxFormWidth: 560,
  bottomBarMaxWidth: 520
};

export const shadow = {
  card: Platform.select({
    web: { boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)" },
    ios: { shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 2 },
    default: {}
  }),
  bar: Platform.select({
    web: { boxShadow: "0 -4px 24px rgba(15, 23, 42, 0.06)" },
    ios: { shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
    android: { elevation: 12 },
    default: {}
  })
};

export const typography = {
  h1: { fontSize: 24, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "700", color: colors.text },
  h3: { fontSize: 16, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  caption: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary }
};
