import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SettingsTheme } from "../../../src/theme/settingsTheme.types";
import { cacheInventoryService, type CacheInventory } from "../services/cacheService";
import { PROTECTED_DATA } from "../services/cacheRegistry";

export function CacheInventoryPanel({ theme, activeStudy, onClose }: {
  theme: SettingsTheme; activeStudy: boolean; onClose: () => void;
}) {
  const [snapshot, setSnapshot] = useState<CacheInventory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  const inspect = async () => {
    const id = ++request.current;
    setBusy(true); setError("");
    try {
      const result = await cacheInventoryService.inventory();
      if (id === request.current) setSnapshot(result);
    } catch {
      if (id === request.current) setError("Chưa kiểm tra được bộ nhớ đệm. Bạn có thể thử lại.");
    } finally {
      if (id === request.current) setBusy(false);
    }
  };
  const close = () => { request.current++; onClose(); };
  return <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Phạm vi bộ nhớ đệm</Text>
    <Text style={{ color: theme.muted }}>Chỉ kiểm tra cache do ứng dụng quản lý. Chức năng xóa chưa được bật; chưa có loại cache nào được xác nhận có thể xóa an toàn.</Text>
    <Text style={{ color: theme.muted }}>Cache ảnh và âm thanh do thư viện quản lý chưa được đo và không nằm trong phạm vi này.</Text>
    {activeStudy ? <Text style={{ color: theme.warning }}>Bạn đang có phiên học hoặc thao tác học đang chạy. Dữ liệu học và audio được giữ nguyên.</Text> : null}
    {snapshot ? <Text accessibilityLiveRegion="polite" style={{ color: theme.text }}>
      {snapshot.bytes === null ? "Dung lượng chưa xác định" : `${snapshot.bytes} B`} · {snapshot.items} mục trong danh sách ứng dụng quản lý.
      {snapshot.status === "partial" ? " Một phần chưa kiểm tra được; hãy thử lại." : snapshot.items === 0 ? " Không có cache đã xác nhận để dọn." : " Đây chỉ là bản kiểm kê; chưa xóa dữ liệu."}
    </Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void inspect(); }} style={styles.button}>
      <Text style={{ color: theme.accent }}>{busy ? "Đang kiểm tra…" : "Kiểm tra dung lượng"}</Text>
    </Pressable>
    <Text style={[styles.title, { color: theme.text }]}>Dữ liệu được giữ lại</Text>
    {PROTECTED_DATA.map(item => <Text key={item.title} style={{ color: theme.muted }}>{item.title}: {item.detail}</Text>)}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.button}>
      <Text style={{ color: theme.muted }}>Xóa bộ nhớ đệm (chưa bật)</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={close} style={styles.button}>
      <Text style={{ color: theme.accent }}>Đóng, giữ nguyên dữ liệu</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 16, gap: 14, borderWidth: 1, borderRadius: 12 },
  title: { fontSize: 16, fontWeight: "600" },
  button: { minHeight: 44, justifyContent: "center", paddingVertical: 10 },
});
