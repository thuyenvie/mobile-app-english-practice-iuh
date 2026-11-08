import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import type { SettingsEntryProps } from "../types";

export function SET02Entry({ theme, settings }: SettingsEntryProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const change = async (value: boolean) => {
    setSaving(true);
    setError("");
    try { await settings.updateSettings({ listeningAutoplay: value }); }
    catch { setError("Chưa lưu được lựa chọn. Hãy thử lại."); }
    finally { setSaving(false); }
  };
  return <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Text style={[styles.title, { color: theme.text }]}>Tự phát âm thanh Listening</Text>
    <Text style={{ color: theme.muted }}>Tự phát khi bắt đầu Full Test hoặc vào đoạn nghe mới trong Luyện tập. Bạn luôn có thể phát thủ công.</Text>
    <Switch accessibilityLabel="Tự phát âm thanh Listening" value={settings.preferences.listeningAutoplay}
      trackColor={{ false: theme.border, true: theme.selection }} thumbColor={theme.surface}
      disabled={saving || settings.persistence === "saving" || settings.hydration !== "ready"}
      onValueChange={value => { void change(value); }} />
    <Text style={{ color: settings.preferences.listeningAutoplay ? theme.selection : theme.muted }}>
      {settings.preferences.listeningAutoplay ? "Đang bật" : "Đang tắt"}
    </Text>
    {saving ? <Text style={{ color: theme.muted }}>Đang lưu…</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  title: { fontSize: 16, fontWeight: "600" },
});
