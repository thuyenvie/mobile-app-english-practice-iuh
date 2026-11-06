import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { settingsTheme } from "../../../src/theme/settingsTheme";

export function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <View style={styles.entries}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 12 },
  title: { color: settingsTheme.text, fontSize: 18, fontWeight: "700" },
  entries: { gap: 10 },
});
