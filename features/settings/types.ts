import type { SettingsTheme } from "../../src/theme/settingsTheme.types";

export type ThemeMode = "system" | "light" | "dark";
export interface DeviceSettings {
  readonly schemaVersion: 1;
  readonly themeMode: ThemeMode;
  readonly listeningAutoplay: boolean;
}
export type SettingsUpdate = Partial<Pick<DeviceSettings, "themeMode" | "listeningAutoplay">>;
export const DEFAULT_SETTINGS: DeviceSettings = Object.freeze({
  schemaVersion: 1, themeMode: "system", listeningAutoplay: true,
});
export type SettingsErrorCode = "read-failed" | "malformed" | "unsupported-version" | "invalid-update" | "write-failed";
export interface SettingsIssue { readonly code: SettingsErrorCode; readonly message: string }
export interface SettingsSnapshot {
  readonly preferences: DeviceSettings;
  readonly hydration: "pending" | "loading" | "ready" | "error";
  readonly persistence: "idle" | "saving" | "saved" | "error";
  readonly hydrationError: SettingsIssue | null;
  readonly persistenceError: SettingsIssue | null;
  readonly recoveredFields: readonly ("themeMode" | "listeningAutoplay")[];
}
export interface SettingsContextValue extends SettingsSnapshot {
  updateSettings(patch: SettingsUpdate): Promise<void>;
  retryHydration(): Promise<void>;
}
/** Proposed contribution interface, pending Coordinator review. No account/profile data. */
export interface SettingsEntryProps {
  settings: SettingsContextValue;
  authenticated: boolean;
  theme: SettingsTheme;
}
