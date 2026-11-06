import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState } from "react";

import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StudyScaffold } from "../components/StudyScaffold";
import { useStudySession, useStudyElapsed, formatStudyTime } from "./StudySessionProvider";


export default function StudySessionScreen() {
  const { c, styles } = useThemedStyles();
  const { current, busy, error, refresh, pause, resume, end } = useStudySession();
  const seconds = useStudyElapsed();
  const [confirm, setConfirm] = useState(false);
  const insets = useSafeAreaInsets();
  const ended = current?.status === "ENDED";
  const back = () => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/study"); };
  const finish = (complete: boolean) => { void end(complete).then(() => setConfirm(false)).catch(() => setConfirm(false)); };
  return <StudyScaffold><ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
    <Pressable accessibilityRole="button" onPress={back} style={styles.back}><MaterialIcons name="arrow-back" color={c.text} size={24} /><Text style={styles.text}>Học tập</Text></Pressable>
    <Text style={styles.heading}>Phiên học</Text>
    {error ? <View style={styles.card}><Text style={styles.warning}>{error}</Text><Action label="Đồng bộ lại" busy={busy} onPress={() => void refresh().catch(() => undefined)} /></View> : null}
    {!current ? <View style={styles.card}><Text style={styles.title}>{busy ? "Đang khôi phục phiên…" : "Chưa có phiên học đang mở"}</Text><Text style={styles.muted}>Chọn nhiệm vụ trong Hôm nay hoặc Lộ trình tuần để bắt đầu.</Text><Action label="Về Học tập" onPress={() => router.replace("/(tabs)/study")} /></View> : <>
      <View style={styles.card}><Text style={styles.tag}>{ended ? "ĐÃ LƯU PHIÊN" : current.status === "PAUSED" ? "ĐÃ TẠM DỪNG" : "ĐANG HỌC"}</Text><Text style={styles.title}>{current.taskTitle}</Text><Text style={styles.muted}>Dự kiến {current.estimatedMinutes} phút</Text></View>
      <View style={styles.clock}><Text style={styles.digits}>{formatStudyTime(seconds)}</Text><Text style={styles.muted}>Thời gian phiên học</Text><Text style={styles.hint}>{ended ? current.completedTask ? "Nhiệm vụ đã hoàn thành." : "Đã lưu thời gian. Bạn có thể học tiếp trong phiên mới." : current.status === "PAUSED" ? "Thời gian nghỉ không được tính." : "Chuyển màn trong app vẫn tiếp tục tính giờ."}</Text></View>
      {current.autoPaused ? <Text style={styles.warning}>Phiên chạy liên tục quá 4 giờ đã được tạm dừng. Thời gian có thể gồm lúc app bị tắt đột ngột.</Text> : null}
      {ended ? <Action label="Về Hôm nay" onPress={() => router.replace("/(tabs)/study")} /> : <>
        <Action label={current.section === "VOCABULARY" ? "Mở bộ từ của buổi ôn" : "Mở bài luyện tập"} onPress={() => current.section === "VOCABULARY"
          ? router.push({ pathname: "/vocabulary/review/[taskId]", params: { taskId: String(current.taskId) } }) : router.push("/(tabs)/study")} />
        <Text style={styles.muted}>{current.section === "VOCABULARY" ? "Ôn đúng những từ đã chọn khi đặt lịch." : `Chọn Test và ${current.section === "READING" ? `Part ${current.partNumber}` : "Listening Part 1–4"} để luyện đúng nhiệm vụ.`}</Text>
        <View style={styles.row}><View style={styles.flex}><Action secondary busy={busy} label={current.status === "PAUSED" ? "Tiếp tục" : "Tạm dừng"} onPress={() => void (current.status === "PAUSED" ? resume() : pause()).catch(() => undefined)} /></View><View style={styles.flex}><Action secondary busy={busy} label="Kết thúc" onPress={() => setConfirm(true)} /></View></View>
      </>}
    </>}
  </ScrollView>
  <Modal visible={confirm} transparent animationType="slide" onRequestClose={() => { if (!busy) setConfirm(false); }}>
    <View style={styles.overlay}><View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}><Text style={styles.title}>Kết thúc phiên học?</Text><Text style={styles.muted}>Thời gian được lưu khi bạn xác nhận. “Học tiếp sau” giữ nhiệm vụ chưa hoàn thành.</Text><Action label="Đã hoàn thành nhiệm vụ" busy={busy} onPress={() => finish(true)} /><Action secondary label="Học tiếp sau" busy={busy} onPress={() => finish(false)} /><Action secondary label="Quay lại phiên học" busy={busy} onPress={() => setConfirm(false)} /></View></View>
  </Modal></StudyScaffold>;
}
function Action({ label, onPress, secondary = false, busy = false }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean }) {
  const { c, styles } = useThemedStyles();
  return <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[styles.action, secondary && styles.secondaryAction, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={secondary ? c.tabActive : c.onSelection} /> : <Text style={[styles.actionText, secondary && { color: c.text }]}>{label}</Text>}</Pressable>;
}


function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, themeColor } = appTheme;
    const c = homeDesign.colors;
    const styles = StyleSheet.create({
      content: { padding: 20, gap: 18 }, back: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
      text: { color: c.text, fontSize: 14 }, heading: { color: c.text, fontSize: 26, fontWeight: "800" },
      card: { backgroundColor: c.surface, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: c.border, gap: 9 },
      title: { color: c.text, fontSize: 19, fontWeight: "700" }, tag: { color: c.tabActive, fontSize: 12, fontWeight: "700" },
      muted: { color: c.secondary, fontSize: 14, lineHeight: 21 }, hint: { color: c.secondary, fontSize: 12, textAlign: "center", marginTop: 10 },
      clock: { alignItems: "center", paddingVertical: 26 }, digits: { color: c.text, fontSize: 60, fontWeight: "600", fontVariant: ["tabular-nums"] },
      action: { minHeight: 48, borderRadius: 13, backgroundColor: c.tabActive, justifyContent: "center", alignItems: "center", padding: 12 },
      actionText: { color: c.onSelection, fontSize: 14, fontWeight: "700", textAlign: "center" }, secondaryAction: { backgroundColor: c.surfaceRaised },
      row: { flexDirection: "row", gap: 12 }, flex: { flex: 1 }, warning: { color: c.inProgress, fontSize: 13, lineHeight: 20 },
      overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: themeColor("rgba(0,0,0,0.65)", "background") },
      sheet: { backgroundColor: c.surface, padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 14 },
    });
    return { homeDesign, themeColor, c, styles };
  }, [appTheme]);
}
