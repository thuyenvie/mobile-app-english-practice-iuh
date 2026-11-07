import { useColorScheme, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import type { PropsWithChildren } from "react";
import { config } from "../../tamagui.config";
import { useSettings } from "@/providers/SettingsProvider";
import { getAppTheme, resolveTheme } from "./palettes";
import { AppThemeContext, useAppTheme } from "./useAppTheme";

export function ThemeProvider({ children }: PropsWithChildren) {
  const settings = useSettings();
  const system = useColorScheme();
  const mode = settings.hydration === "ready" ? settings.preferences.themeMode : "system";
  const theme = getAppTheme(resolveTheme(mode, system));
  return <AppThemeContext.Provider value={theme}>
    <TamaguiProvider config={config} defaultTheme={theme.tamaguiTheme}>
      <Theme name={theme.tamaguiTheme}>
        <View style={{ flex: 1, backgroundColor: theme.palette.background }}>
          <StatusBar style={theme.statusBarStyle} />
          {children}
        </View>
      </Theme>
    </TamaguiProvider>
  </AppThemeContext.Provider>;
}
export function ThemeStack() {
  const theme = useAppTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.palette.background },
    headerStyle: { backgroundColor: theme.palette.surface }, headerTintColor: theme.palette.text }} />;
}
