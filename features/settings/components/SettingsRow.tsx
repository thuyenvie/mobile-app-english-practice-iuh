import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { getInteractionColors } from "./interactionColors";
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
  const selected = !disabled && expanded === true;
  const feedback = getInteractionColors(theme);
  const foreground = disabled ? feedback.disabledText : selected ? theme.selection : theme.text;
  const content = <>
    <View style={styles.heading}>
      <Text style={[styles.title, { color: foreground, flex: 1, fontWeight: selected ? "700" : "600" }]}>{title}</Text>
      <MaterialCommunityIcons name={disabled ? "lock-outline" : expanded === undefined ? "chevron-right" : expanded ? "chevron-up" : "chevron-down"}
        size={22} color={foreground} accessible={false} />
    </View>
    <Text style={[styles.description, { color: disabled ? feedback.disabledText : theme.muted }]}>{description}</Text>
    {unavailable ? <Text style={[styles.badge, { color: feedback.disabledText, borderColor: feedback.disabledBorder }]}>Chưa khả dụng</Text> : null}
  </>;
  const style = [styles.row, {
    backgroundColor: disabled ? feedback.disabledBackground : selected ? feedback.selectedBackground : theme.surface,
    borderColor: disabled ? feedback.disabledBorder : selected ? theme.selection : theme.border,
  }];
  // Unavailable contributions have no active press handler or misleading navigation.
  return disabled ? <View style={style} accessibilityState={{ disabled: true }}>{content}</View> :
    <Pressable accessibilityRole="button" accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: feedback.pressedBackground }]}>{content}</Pressable>;
}
const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, fontWeight: "600" },
  title: { fontSize: 16, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 20 },
});
