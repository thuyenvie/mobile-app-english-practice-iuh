import { useCallback } from "react";
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { homeDesign } from "@/theme/tokens";
import { getExamErrorMessage } from "../api/examApi";
import type { StudyTask } from "../api/studyPlanApi";
import { useStudySession, useStudyElapsed, formatStudyTime } from "./StudySessionProvider";

const c = homeDesign.colors;
export function StartStudyButton({ task }: { task: StudyTask }) {
  const { busy, start } = useStudySession();
  if (task.status !== "PENDING") return null;
  return <Pressable accessibilityRole="button" disabled={busy} style={[styles.button, busy && styles.disabled]}
    onPress={() => void start(task.id).then(() => task.section === "VOCABULARY"
      ? router.push({ pathname: "/vocabulary/review/[taskId]", params: { taskId: String(task.id) } })
      : router.push("/study-session")).catch((cause: unknown) => Alert.alert("Chưa thể bắt đầu phiên học", getExamErrorMessage(cause)))}>
    {busy ? <ActivityIndicator color={c.cardText} /> : <Text style={styles.buttonText}>{task.section === "VOCABULARY" ? "Bắt đầu ôn" : "Bắt đầu học"}</Text>}
  </Pressable>;
}

export function StudySessionBanner() {
  const { current, busy, error, refresh } = useStudySession();
  const elapsed = useStudyElapsed();
  if (!current || current.status === "ENDED") {
    return error ? <View style={styles.banner}><Text style={styles.secondary}>{error}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void refresh().catch(() => undefined)}><Text style={styles.link}>Đồng bộ lại</Text></Pressable></View> : null;
  }
  return <Pressable accessibilityRole="button" style={styles.banner} onPress={() => router.push("/study-session")}>
    <MaterialIcons name="timer" size={20} color={c.tabActive} />
    <View style={{ flex: 1 }}><Text style={styles.text}>{current.status === "RUNNING" ? "Đang học" : "Tạm dừng"} · {formatStudyTime(elapsed)}</Text>
    <Text style={styles.secondary} numberOfLines={1}>{current.taskTitle}</Text>
    {error ? <Text style={styles.secondary}>Chưa đồng bộ — mở phiên để thử lại</Text> : null}</View>
    <Text style={styles.link}>Xem phiên</Text>
  </Pressable>;
}

export function RefreshStudySessionOnFocus() {
  const { refresh } = useStudySession();
  useFocusEffect(useCallback(() => { void refresh().catch(() => undefined); }, [refresh]));
  return null;
}
const styles = StyleSheet.create({
  button: { backgroundColor: c.tabActive, borderRadius: 12, minHeight: 44, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginTop: 9 },
  buttonText: { color: c.cardText, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  banner: { backgroundColor: c.surfaceRaised, padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  text: { color: c.text, fontSize: 13, fontWeight: "700" },
  secondary: { color: c.secondary, fontSize: 12, flexShrink: 1 },
  link: { color: c.link, fontSize: 12, fontWeight: "700" },
});
