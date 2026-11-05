import { useCallback, useState, type PropsWithChildren } from "react";
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
const timeLabel = (value: string, timezone?: string) =>
  new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: timezone });

export function TodayStudySessionCard({ children }: PropsWithChildren) {
  const account = useSession();
  const { refresh, current } = useStudySession();
  const activeSession = current && current.status !== "ENDED" ? current : null;
  const [schedule, setSchedule] = useState<StudySchedule | null>(null);
  const [vocabularyTasks, setVocabularyTasks] = useState<StudyTask[]>([]);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [pushStatus, setPushStatus] = useState<StudyPushStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [showMore, setShowMore] = useState(false);
  useFocusEffect(useCallback(() => {
    if (account.status !== "authenticated") { setSchedule(null); setVocabularyTasks([]); return; }
    let active = true;
    setLoading(true);
    void refresh().catch(() => undefined);
    void getVocabularyTasks().then(value => {
      if (active) setVocabularyTasks(value);
    }).catch(() => undefined);
    void getStudyPushStatus().then(value => {
      if (active) setPushStatus(value);
    }).catch(() => undefined);
    void getTodaySchedule().then(value => {
      if (active) { setSchedule(value); setError(""); }
    })
      .catch((cause: unknown) => { if (active) setError(getExamErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // A retry reruns the requests even when the screen stays focused.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status, refresh, retry]));
  const todayTasks = (schedule?.tasks ?? []).filter(task => task.status !== "SKIPPED");
  const pending = todayTasks.filter(task => task.status === "PENDING");
  // Explicit bookings have a time commitment. Show them before flexible tasks.
  const booked = pending.flatMap(task => task.scheduledAt ? [{ task, time: Date.parse(task.scheduledAt) }] : [])
    .sort((a, b) => a.time - b.time);
  const next = booked[0]?.task ?? pending[0];
  const featured = activeSession ? todayTasks.find(task => task.id === activeSession.taskId) : next;
  const suggestion = pending.find(task => task.id !== featured?.id && task.source === "SYSTEM");
  const otherTasks = todayTasks.filter(task => task.id !== featured?.id && task.id !== suggestion?.id);
  const upcoming = schedule ? vocabularyTasks.filter(task => task.dueDate > schedule.toDate && task.status === "PENDING") : [];
  const plan = schedule?.plan;
  const minutes = Math.floor((schedule?.sessionSeconds ?? 0) / 60);
  const target = schedule?.targetMinutes ?? 0;
  const percent = target > 0 ? Math.min(100, Math.round(minutes / target * 100)) : 0;
  const goToWeek = () => router.push("/study-plan/week");
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
      {!future && !activeSession && task.status === "PENDING" ? <StartStudyButton task={task} /> : null}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/vocabulary/review/[taskId]", params: { taskId: String(task.id) } })}><Text style={styles.link}>Xem bộ từ</Text></Pressable>
        {task.status === "PENDING" ? <>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/vocabulary/schedule", params: { taskId: String(task.id) } })}><Text style={styles.link}>Sửa lịch</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={cancelling === task.id} onPress={() => cancel(task)}><Text style={styles.link}>{cancelling === task.id ? "Đang hủy…" : "Hủy lịch"}</Text></Pressable>
        </> : null}
      </View>
    </> : !activeSession ? <StartStudyButton task={task} /> : null}
  </View>;
  if (account.status !== "authenticated") return <>{children}</>;
  return <>
    <View style={[styles.card, styles.hero]}>
      <View style={styles.row}>
        <MaterialIcons name="calendar-today" size={21} color={c.tabActive} />
        <Text accessibilityRole="header" style={styles.heading}>Học hôm nay</Text>
        {plan ? <Pressable accessibilityRole="button" onPress={goToWeek}><Text style={styles.link}>Lịch tuần ›</Text></Pressable> : null}
      </View>
      <StudySessionBanner embedded />
      {loading && !schedule ? <ActivityIndicator color={c.tabActive} /> : null}
      {error ? <View style={styles.row}>
        <Text style={styles.muted}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>Thử lại</Text></Pressable>
      </View> : null}
      {!activeSession && featured ? <>
        <Text style={styles.eyebrow}>
          {featured.scheduledAt ? `LỊCH ÔN · ${timeLabel(featured.scheduledAt, plan?.timezone)}` : "NHIỆM VỤ TIẾP THEO"}
        </Text>
        <Text style={styles.title}>{featured.title}</Text>
        <Text style={styles.muted}>
          {featured.vocabularyCount ? `${featured.vocabularyCount} từ đã lưu · ` : ""}{featured.estimatedMinutes} phút dự kiến
        </Text>
        {featured.description ? <Text style={styles.muted}>{featured.description}</Text> : null}
        <StartStudyButton task={featured} />
        {featured.section === "VOCABULARY" ? <View style={styles.row}>
          <Text style={styles.muted}>{featured.reminderAt ? `Nhắc lúc ${timeLabel(featured.reminderAt, plan?.timezone)}` : "Chưa bật nhắc"}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/vocabulary/schedule", params: { taskId: String(featured.id) } })}>
            <Text style={styles.link}>Chỉnh lịch ›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/vocabulary/review/[taskId]", params: { taskId: String(featured.id) } })}>
            <Text style={styles.link}>Xem bộ từ</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={cancelling === featured.id} onPress={() => cancel(featured)}>
            <Text style={styles.link}>{cancelling === featured.id ? "Đang hủy…" : "Hủy lịch"}</Text>
          </Pressable>
        </View> : plan?.reminderEnabled && plan.reminderTime ? <Text style={styles.muted}>Giờ nhắc theo kế hoạch: {plan.reminderTime.slice(0, 5)}</Text> : null}
        {featured.reminderAt && pushStatus && pushStatus !== "ready" ? <Text style={styles.muted}>
          {pushStatus === "permission-denied" ? "Thiết bị chưa cấp quyền thông báo." : pushStatus === "unsupported" ? "Bản web không nhận thông báo đẩy." : "Thiết bị chưa đăng ký nhận nhắc."}
        </Text> : null}
      </> : null}
      {!activeSession && !featured && schedule && !loading && !error ? (
        plan ? <Text style={styles.title}>{schedule.totalTasks > 0 && schedule.completedTasks === schedule.totalTasks
          ? "Bạn đã hoàn thành lịch học hôm nay." : "Hôm nay chưa có nhiệm vụ."}</Text>
          : <Pressable accessibilityRole="button" onPress={() => router.push("/study-plan/setup")}>
            <Text style={styles.link}>Thiết lập mục tiêu học ›</Text>
          </Pressable>
      ) : null}
      {plan ? <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/vocabulary")}>
        <Text style={styles.link}>+ Lên lịch ôn từ</Text>
      </Pressable> : null}
      {otherTasks.length || upcoming.length ? <>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showMore }} onPress={() => setShowMore(value => !value)}>
          <Text style={styles.link}>{showMore ? "Thu gọn lịch" : `Xem thêm lịch (${otherTasks.length + upcoming.length}) ›`}</Text>
        </Pressable>
        {showMore ? <>
          {otherTasks.map(task => taskRow(task))}
          {upcoming.length ? <Text style={styles.heading}>Sắp tới</Text> : null}
          {upcoming.map(task => taskRow(task, true))}
        </> : null}
      </> : null}
    </View>
    {children}
    {suggestion ? <View style={styles.card}>
      <Text style={styles.eyebrow}>GỢI Ý CHO BẠN</Text>
      <Text style={styles.title}>{suggestion.title}</Text>
      {suggestion.description ? <Text style={styles.muted}>{suggestion.description}</Text> : null}
      {activeSession ? <Pressable accessibilityRole="button" onPress={goToWeek}><Text style={styles.link}>Xem trong lịch tuần ›</Text></Pressable>
        : <StartStudyButton task={suggestion} />}
    </View> : null}
    {plan && schedule ? <View style={styles.card}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.heading}>Tiến độ hôm nay</Text>
        <Text style={styles.muted}>Mục tiêu TOEIC {plan.targetScore}</Text>
      </View>
      {target > 0 ? <View accessibilityRole="progressbar" accessibilityLabel="Tiến độ thời gian học"
        accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View> : null}
      <Text style={styles.muted}>{schedule.completedTasks}/{schedule.totalTasks} nhiệm vụ · {minutes}{target > 0 ? `/${target}` : ""} phút đã học</Text>
    </View> : null}
  </>;
}
const styles = StyleSheet.create({
  card: { marginHorizontal: homeDesign.pagePadding, marginBottom: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, padding: 16, borderRadius: 18, gap: 8 },
  hero: { backgroundColor: c.surfaceRaised },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  heading: { color: c.text, fontSize: 17, fontWeight: "700", flex: 1 },
  task: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, gap: 7 },
  title: { color: c.text, fontSize: 16, fontWeight: "700" },
  muted: { color: c.secondary, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  link: { color: c.link, fontSize: 13, fontWeight: "600", minHeight: 44, textAlignVertical: "center", paddingVertical: 12 },
  eyebrow: { color: c.tabActive, fontSize: 12, fontWeight: "700" },
  track: { height: 6, borderRadius: 6, overflow: "hidden", backgroundColor: c.border },
  fill: { height: "100%", backgroundColor: c.tabActive },
});
