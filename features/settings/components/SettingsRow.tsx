import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SettingsTheme } from "../../../src/theme/settingsTheme.types";

interface SettingsRowProps {
  title: string;
  description: string;
  theme: SettingsTheme;
  unavailable?: boolean;
  expanded?: boolean;
  onPress?: () => void;
}
export function SettingsRow({ title, description, theme, unavailable = true, expanded, onPress }: SettingsRowProps) {
  const disabled = unavailable || !onPress;
  const content = <>
    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.description, { color: theme.muted }]}>{description}</Text>
    {unavailable ? <Text style={[styles.description, { color: theme.muted }]}>Chưa khả dụng</Text> : null}
  </>;
  const style = [styles.row, { backgroundColor: theme.surface, borderColor: theme.border }];
  // Unavailable contributions have no active press handler or misleading navigation.
  return disabled ? <View style={style} accessibilityState={{ disabled: true }}>{content}</View> :
    <Pressable accessibilityRole="button" accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} style={style}>{content}</Pressable>;
}
const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 20 },
});
