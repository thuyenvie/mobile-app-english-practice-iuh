import { homeDesign } from "./tokens";
import type { SettingsTheme } from "./settingsTheme.types";

/** Preserve the existing palette. This adapter deliberately does not resolve themeMode. */
export const settingsTheme: SettingsTheme = Object.freeze({
  background: homeDesign.colors.background,
  surface: homeDesign.colors.surface,
  text: homeDesign.colors.text,
  muted: homeDesign.colors.secondary,
  border: homeDesign.colors.border,
  accent: homeDesign.colors.link,
  success: homeDesign.colors.completed,
  warning: homeDesign.colors.inProgress,
  // Existing Settings reports errors using inProgress; SET-01 will supply palettes.
  error: homeDesign.colors.inProgress,
  selection: homeDesign.colors.tabActive,
});
