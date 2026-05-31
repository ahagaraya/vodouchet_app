import { StyleSheet, Platform } from "react-native";
import { colors, layout, radius, shadow, space } from "../theme";

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    minHeight: 0
  },
  screenWhite: {
    flex: 1,
    backgroundColor: colors.surface,
    minHeight: 0
  },
  content: {
    flexGrow: 1,
    padding: space.lg,
    paddingBottom: space.xl,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center"
  },
  formContent: {
    flexGrow: 1,
    padding: space.lg,
    paddingBottom: space.xl,
    width: "100%",
    maxWidth: layout.maxFormWidth,
    alignSelf: "center",
    gap: space.md
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === "web" ? { overflow: "scroll" } : {})
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.sm,
    ...shadow.card
  },
  listCardPressed: {
    opacity: 0.92
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: space.md
  },
  sectionGap: {
    marginBottom: space.lg
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    marginBottom: space.sm,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6
  }
});
