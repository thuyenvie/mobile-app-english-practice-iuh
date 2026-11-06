import { authDesign, loginDesign, homeDesign, aiDesign } from "./tokens";
import type { ThemeMode } from "../../features/settings/types";

const light = {
  background: "#f5f7fb", surface: "#ffffff", surfaceRaised: "#eaf0f7", text: "#17243a",
  muted: "#4e6077", border: "#c4cfdd", accent: "#125db2", accentPressed: "#084587",
  onAccent: "#ffffff", success: "#17723a", warning: "#875200", error: "#b32635",
  selection: "#426300", selectionBackground: "#e5f0cd", onSelection: "#ffffff",
  disabled: "#65758a", overlay: "rgba(12, 20, 34, 0.6)",
} as const;
const dark = {
  background: "#10151d", surface: "#1b2431", surfaceRaised: "#263346", text: "#f0f4fa",
  muted: "#b5c2d3", border: "#53647a", accent: "#86bdff", accentPressed: "#b4d6ff",
  onAccent: "#102640", success: "#75dda0", warning: "#ffca75", error: "#ff9ba5",
  selection: "#c2ef50", selectionBackground: "#33451e", onSelection: "#142300",
  disabled: "#9caac0", overlay: "rgba(0, 0, 0, 0.72)",
} as const;
export type ResolvedTheme = "light" | "dark";
export function resolveTheme(mode: ThemeMode, system: string | null | undefined): ResolvedTheme {
  return mode === "system" ? system === "dark" ? "dark" : "light" : mode;
}
function buildTheme(mode: ResolvedTheme) {
  const p = mode === "dark" ? dark : light;
  const auth = { ...authDesign, colors: { ...authDesign.colors, ...p,
    header: p.accent, logo: p.surfaceRaised, logoLine: p.border, secondary: p.muted,
    primary: p.accent, primaryPressed: p.accentPressed, placeholder: p.muted } };
  const home = { ...homeDesign, colors: { ...homeDesign.colors, ...p,
    secondary: p.muted, link: p.accent, card: p.surface, cardText: p.text, cardTrack: p.border,
    tab: p.accent, tabActive: p.selection, completed: p.success, inProgress: p.warning, notStarted: p.disabled } };
  const login = { ...loginDesign, colors: { ...auth.colors, link: p.accent }, input: {
    ...loginDesign.input, backgroundColor: p.surface, borderColor: p.border, color: p.text,
    focusStyle: { borderColor: p.accent },
  } };
  const ai = { ...aiDesign, colors: { ...aiDesign.colors, background: p.background, text: p.text,
    surface: p.surface, secondary: p.muted, accent: p.accent, avatar: p.surfaceRaised,
    robot: p.selection, camera: p.selection, send: p.accent } };
  const authForm = {
    input: { minHeight: 44, borderRadius: 11, backgroundColor: p.surface, borderColor: p.border,
      color: p.text, placeholderTextColor: "$placeholderColor", focusStyle: { borderColor: p.accent } },
    label: { color: p.text, fontWeight: "600" },
    button: { minHeight: 44, borderRadius: 12, backgroundColor: p.accent, color: p.onAccent,
      pressStyle: { backgroundColor: p.accentPressed } },
    link: p.accent, muted: p.muted, error: p.error,
  } as const;
  const themeColor = (raw: string, role = "text") => {
    if (/rgba/i.test(raw) || (raw.length === 5 || raw.length === 9)) {
      return /^(#0|rgba?\(\s*(0|12|15)[,\s])/i.test(raw) ? p.overlay : p.selectionBackground;
    }
    if (role === "border") return p.border;
    if (role === "onAccent") return p.onAccent;
    if (role === "onSelection") return p.onSelection;
    let hex = raw.replace("#", "");
    if (hex.length === 3) hex = [...hex].map(c => c + c).join("");
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    if (role === "background") return g > r * 1.15 && g > b * 1.15 ? p.selectionBackground : p.surfaceRaised;
    if (r > g * 1.3 && r > b * 1.2) return p.error;
    if (r > b * 1.8 && g > b * 1.4) return p.warning;
    if (g > r * 1.2 && g > b * 1.2) return p.success;
    if (b > r * 1.15) return p.accent;
    return r > 70 && r < 210 ? p.muted : p.text;
  };
  return Object.freeze({ resolvedMode: mode, palette: p, authDesign: auth, homeDesign: home,
    loginDesign: login, aiDesign: ai, authFormDesign: authForm,
    settingsTheme: Object.freeze({ background: p.background, surface: p.surface, text: p.text, muted: p.muted,
      border: p.border, accent: p.accent, success: p.success, warning: p.warning, error: p.error, selection: p.selection }),
    statusBarStyle: mode === "dark" ? "light" as const : "dark" as const,
    tamaguiTheme: mode === "dark" ? "dark_app" as const : "light_app" as const, themeColor });
}
const themes = { light: buildTheme("light"), dark: buildTheme("dark") };
export const getAppTheme = (mode: ResolvedTheme) => themes[mode];
export type AppTheme = ReturnType<typeof getAppTheme>;
