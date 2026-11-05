import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSession } from "@/lib/auth/useSession";
import { homeDesign } from "@/theme/tokens";
import { getTodaySchedule, type StudySchedule, type StudyTask } from "../../study/api/studyPlanApi";
import { cancelVocabularyTask, getVocabularyTasks } from "../../vocabulary/api/vocabularyTaskApi";
import { getStudyPushStatus, type StudyPushStatus } from "../../notifications/api/pushNotificationApi";
import { getExamErrorMessage } from "../../study/api/examApi";
import { StartStudyButton, StudySessionBanner } from "../../study/session/StudySessionControls";
import { useStudySession } from "../../study/session/StudySessionProvider";

const c = homeDesign.colors;
export function TodayStudySessionCard() {
  const account = useSession();
  const { refresh } = useStudySession();
  const [schedule, setSchedule] = useState<StudySchedule | null>(null);
  const [vocabularyTasks, setVocabularyTasks] = useState<StudyTask[]>([]);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [pushStatus, setPushStatus] = useState<StudyPushStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    if (account.status !== "authenticated") { setSchedule(null); setVocabularyTasks([]); return; }
    let active = true;
    setLoading(true);
    void refresh().catch(() => undefined);
    Promise.all([getTodaySchedule(), getVocabularyTasks(), getStudyPushStatus().catch(() => null)]).then(([value, vocabulary, push]) => { if (active) { setSchedule(value); setVocabularyTasks(vocabulary); setPushStatus(push); setError(""); } })
      .catch((cause: unknown) => { if (active) setError(getExamErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account.status, account.generation, refresh, retry]));
  const todayTasks = [...(schedule?.tasks ?? [])].sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  const upcoming = vocabularyTasks.filter(task => task.dueDate > (schedule?.toDate ?? "") && task.status === "PENDING");
  const cancel = (task: StudyTask) => Alert.alert("Hủy lịch ôn?", "Lịch sẽ ngừng nhắc. Các phiên học đã lưu vẫn được giữ.", [
    { text: "Quay lại", style: "cancel" }, { text: "Hủy lịch", style: "destructive", onPress: () => {
      setCancelling(task.id);
      void cancelVocabularyTask(task.id).then(() => setRetry(value => value + 1))
        .catch((cause: unknown) => Alert.alert("Chưa hủy được lịch", getExamErrorMessage(cause)))
        .finally(() => setCancelling(null));
    } },
  ]);
  const taskRow = (task: StudyTask, future = false) => <View key={task.id} style={styles.task}>
    {task.scheduledAt ? <Text style={styles.link}>{new Date(task.scheduledAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {task.estimatedMinutes} phút</Text> : null}
    <Text style={styles.title}>{task.title}{task.status === "COMPLETED" ? " · Đã hoàn thành" : ""}</Text>
    <Text style={styles.muted}>{task.description}</Text>
    {task.section === "VOCABULARY" ? <>
      <Text style={styles.muted}>{task.status === "COMPLETED" ? "Đã hoàn thành · Không nhắc thêm" : task.reminderAt ? task.reminderMinutesBefore ? `Nhắc trước ${task.reminderMinutesBefore} phút` : "Nhắc đúng giờ" : "Không bật nhắc"}</Text>
      {task.status === "PENDING" && task.reminderAt && pushStatus && pushStatus !== "ready" ? <Text style={styles.muted}>{pushStatus === "permission-denied" ? "Thiết bị chưa cấp quyền thông báo. Bật quyền trong Cài đặt của ứng dụng." : pushStatus === "unsupported" ? "Lịch đã lưu; bản web không nhận push." : "Thiết bị chưa đăng ký nhận nhắc. Mở Sửa lịch và lưu lại để thử đăng ký."}</Text> : null}
      {!future && task.status === "PENDING" ? <StartStudyButton task={task} /> : null}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/vocabulary/review/[taskId]", params: { taskId: String(task.id) } })}><Text style={styles.link}>Xem bộ từ</Text></Pressable>
        {task.status === "PENDING" ? <>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/vocabulary/schedule", params: { taskId: String(task.id) } })}><Text style={styles.link}>Sửa lịch</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={cancelling === task.id} onPress={() => cancel(task)}><Text style={styles.link}>{cancelling === task.id ? "Đang hủy…" : "Hủy lịch"}</Text></Pressable>
        </> : null}
      </View>
    </> : <StartStudyButton task={task} />}
  </View>;
  if (account.status !== "authenticated") return null;
  return <View style={styles.container}>
    <StudySessionBanner />
    <View style={styles.card}>
      <View style={styles.row}><MaterialIcons name="calendar-today" size={23} color={c.tabActive} /><Text style={styles.heading}>Lịch học của bạn</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/vocabulary")}><Text style={styles.link}>+ Ôn từ</Text></Pressable></View>
      {loading ? <ActivityIndicator color={c.tabActive} /> : error ? <><Text style={styles.muted}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>Thử lại</Text></Pressable></> : !schedule?.plan ? <><Text style={styles.muted}>Đặt mục tiêu để có nhiệm vụ và ghi nhận phiên học.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/study-plan/setup")}><Text style={styles.link}>Thiết lập mục tiêu</Text></Pressable></> : <>
        <Text style={styles.muted}>{schedule.completedTasks}/{schedule.totalTasks} nhiệm vụ hoàn thành · Phiên học {Math.floor((schedule.sessionSeconds ?? 0) / 60)} phút</Text>
        {todayTasks.length ? todayTasks.map(task => taskRow(task)) : <Text style={styles.title}>Hôm nay chưa có nhiệm vụ.</Text>}
        {upcoming.length ? <><Text style={styles.heading}>Sắp tới</Text>{upcoming.map(task => taskRow(task, true))}</> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push("/study-plan/week")}><Text style={styles.link}>Xem lộ trình tuần →</Text></Pressable>
      </>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { marginBottom: 18 }, card: { marginHorizontal: 16, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, padding: 17, borderRadius: 18, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }, heading: { color: c.text, fontSize: 17, fontWeight: "700", flexShrink: 1 },
  task: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, paddingBottom: 6, gap: 7 },
  title: { color: c.text, fontSize: 15, fontWeight: "600" }, muted: { color: c.secondary, fontSize: 13, lineHeight: 20 },
  link: { color: c.link, fontSize: 13, fontWeight: "600", paddingVertical: 10 },
});
