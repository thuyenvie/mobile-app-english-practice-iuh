/** Semantic contract for Settings contributions; runtime palettes belong to SET-01. */
export interface SettingsTheme {
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly muted: string;
  readonly border: string;
  readonly accent: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly selection: string;
}
