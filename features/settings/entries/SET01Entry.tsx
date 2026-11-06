import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SettingsEntryProps } from "../types";

export function SET01Entry({ theme, settings }: SettingsEntryProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const select = async (themeMode: "system" | "light" | "dark") => {
    setSaving(true); setError("");
    try { await settings.updateSettings({ themeMode }); }
    catch { setError("Chưa lưu được giao diện. Hãy thử lại."); }
    finally { setSaving(false); }
  };
  return <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Text style={[styles.title, { color: theme.text }]}>Giao diện</Text>
    <Text style={{ color: theme.muted }}>Chọn Sáng, Tối hoặc tự đổi theo Hệ thống.</Text>
    <View accessibilityRole="radiogroup" style={styles.options}>
      {([ ["light", "Sáng"], ["dark", "Tối"], ["system", "Hệ thống"] ] as const).map(([mode, label]) => {
        const selected = settings.preferences.themeMode === mode;
        const disabled = saving || settings.hydration !== "ready" || settings.persistence === "saving";
        return <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }}
          disabled={disabled} onPress={() => { void select(mode); }}
          style={[styles.option, { borderColor: selected ? theme.accent : theme.border, opacity: disabled ? 0.6 : 1 }]}>
          <Text style={{ color: selected ? theme.accent : theme.text }}>{selected ? "● " : "○ "}{label}</Text>
        </Pressable>;
      })}
    </View>
    {saving ? <Text style={{ color: theme.muted }}>Đang lưu…</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  title: { fontSize: 16, fontWeight: "600" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 44, borderWidth: 2, borderRadius: 10, paddingHorizontal: 12, justifyContent: "center" },
});
