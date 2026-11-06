import { createContext, useContext } from "react";
import type { AppTheme } from "./palettes";
export const AppThemeContext = createContext<AppTheme | null>(null);
export function useAppTheme(): AppTheme {
  const theme = useContext(AppThemeContext);
  if (!theme) throw new Error("useAppTheme must be used inside ThemeProvider");
  return theme;
}
