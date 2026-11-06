import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, type PropsWithChildren } from "react";

import { StyleSheet, Text, View } from "react-native";


export function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  const { styles } = useThemedStyles();
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <View style={styles.entries}>{children}</View>
  </View>;
}


function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { settingsTheme } = appTheme;
    const styles = StyleSheet.create({
      section: { gap: 12 },
      title: { color: settingsTheme.text, fontSize: 18, fontWeight: "700" },
      entries: { gap: 10 },
    });
    return { settingsTheme, styles };
  }, [appTheme]);
}
