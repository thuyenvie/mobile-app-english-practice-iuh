import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useCallback, useState } from "react";
import { BrandedPageState } from "@/components/ui/BrandedPageState";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSession } from "@/lib/auth/useSession";

import { getExamErrorMessage } from "../api/examApi";
import {
  getWeekSchedule,
  type StudySchedule,
  type StudyTask,
} from "../api/studyPlanApi";
import { StartStudyButton } from "../session/StudySessionControls";
import { StudyScaffold } from "../components/StudyScaffold";



export default function StudyPlanWeekScreen() {
  const { c, styles } = useThemedStyles();
  const session = useSession();
  const [schedule, setSchedule] = useState<StudySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (session.status !== "authenticated") {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getWeekSchedule()
      .then((data) => {
        if (active) {
          setSchedule(data);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(getExamErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.status]);

  useFocusEffect(useCallback(() => load(), [load]));

  return (
    <StudyScaffold>
      <View style={styles.screen}>
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={23} color={c.text} />
          <Text style={styles.backText}>Học tập</Text>
        </Pressable>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Lộ trình 7 ngày</Text>
          <Text style={styles.subtitle}>
            Nhiệm vụ được cập nhật khi bạn nộp bài luyện tập.
          </Text>

          {session.status === "guest" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Đăng nhập để lưu lộ trình</Text>
              <Text style={styles.muted}>
                Chế độ khách vẫn luyện đề được, nhưng kế hoạch học cần gắn với
                tài khoản.
              </Text>
              <Action
                label="Đăng nhập"
                onPress={() => router.push("/auth/login")}
              />
            </View>
          ) : loading ? (
            <BrandedPageState compact loading message="Đang tải lịch học..." />
          ) : error ? (
            <BrandedPageState compact message={error} onRetry={() => void load()} />
          ) : !schedule?.plan ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bạn chưa đặt mục tiêu học</Text>
              <Text style={styles.muted}>
                Tạo mục tiêu để lập lịch luyện Listening và Reading trong tuần.
              </Text>
              <Action
                label="Thiết lập mục tiêu"
                onPress={() => router.push("/study-plan/setup")}
              />
            </View>
          ) : (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryTitleRow}>
                  <MaterialIcons
                    name="flag-circle"
                    size={25}
                    color={c.tabActive}
                  />
                  <Text style={styles.cardTitle}>
                    Mục tiêu TOEIC {schedule.plan.targetScore}
                  </Text>
                </View>
                <Text style={styles.muted}>
                  Mục tiêu gốc: {schedule.plan.dailyMinutes} phút/ngày ·{" "}
                  {schedule.completedTasks}/{schedule.totalTasks} nhiệm vụ hoàn
                  thành
                </Text>
                <Text style={styles.muted}>Thời gian phiên học: {Math.floor((schedule.sessionSeconds ?? 0) / 60)} phút · Hoàn thành dự kiến: {schedule.completedMinutes} phút</Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${
                          schedule.totalTasks
                            ? Math.round(
                                (schedule.completedTasks /
                                  schedule.totalTasks) *
                                  100
                              )
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Pressable onPress={() => router.push("/study-plan/setup")}>
                  <Text style={styles.link}>
                    Chỉnh sửa mục tiêu và giờ nhắc
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.dateRange}>
                {formatDate(schedule.fromDate)} – {formatDate(schedule.toDate)}
              </Text>
              {schedule.tasks.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.muted}>
                    Chưa có nhiệm vụ cho khoảng ngày này. Hãy lưu lại mục tiêu
                    để tạo lịch mới.
                  </Text>
                  <Action
                    label="Cập nhật mục tiêu"
                    onPress={() => router.push("/study-plan/setup")}
                  />
                </View>
              ) : (
                schedule.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>
    </StudyScaffold>
  );
}

function TaskCard({ task }: { task: StudyTask }) {
  const { c, styles } = useThemedStyles();
  const done = task.status === "COMPLETED";
  return (
    <View style={[styles.task, done && styles.taskDone]}>
      <View style={styles.taskTop}>
        <View style={[styles.taskIcon, done && styles.taskIconDone]}>
          <MaterialIcons
            name={
              done
                ? "check"
                : task.section === "LISTENING"
                ? "headphones"
                : "menu-book"
            }
            size={20}
            color={done ? c.onSelection : c.link}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.muted}>
            {formatDate(task.dueDate)} · {task.estimatedMinutes} phút
            {task.scheduledAt ? ` · ${new Date(task.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </Text>
        </View>
        <Text style={[styles.status, done && styles.statusDone]}>
          {done ? "XONG" : task.status === "SKIPPED" ? "BỎ QUA" : "CHỜ HỌC"}
        </Text>
      </View>
      {task.description ? (
        <Text style={styles.taskDescription}>{task.description}</Text>
      ) : null}
      {!done ? (
        <StartStudyButton task={task} />
      ) : task.completedResultId != null ? (
        <Text style={styles.completedNote}>
          Đã gắn với kết quả bài làm #{task.completedResultId}
        </Text>
      ) : null}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const { styles } = useThemedStyles();
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}



function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, themeColor } = appTheme;
    const c = homeDesign.colors;
    const styles = StyleSheet.create({
      screen: { flex: 1 },
      content: { padding: 17, paddingBottom: 36 },
      flex: { flex: 1 },
      back: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 17,
        paddingVertical: 12,
      },
      backText: { color: c.text, fontWeight: "600", fontSize: 15 },
      title: { color: c.text, fontWeight: "800", fontSize: 26 },
      subtitle: {
        color: c.secondary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
        marginBottom: 20,
      },
      loader: { marginTop: 42 },
      card: {
        backgroundColor: c.surface,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: c.border,
        padding: 17,
        gap: 10,
      },
      cardTitle: { color: c.text, fontSize: 17, fontWeight: "800", flexShrink: 1 },
      muted: { color: c.secondary, fontSize: 13, lineHeight: 19 },
      error: { color: themeColor("#ff8585", "text"), fontSize: 14 },
      summary: {
        backgroundColor: c.surface,
        borderRadius: 18,
        padding: 17,
        gap: 10,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: 20,
      },
      summaryTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
      track: {
        height: 9,
        borderRadius: 6,
        backgroundColor: c.surfaceRaised,
        overflow: "hidden",
      },
      fill: { height: "100%", backgroundColor: c.tabActive, borderRadius: 6 },
      link: { color: c.link, fontSize: 13, fontWeight: "700", marginTop: 4 },
      dateRange: {
        color: c.secondary,
        fontWeight: "700",
        fontSize: 13,
        marginBottom: 12,
      },
      task: {
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: 12,
        gap: 10,
      },
      taskDone: { borderColor: themeColor("#31543c", "border") },
      taskTop: { flexDirection: "row", alignItems: "center", gap: 11 },
      taskIcon: {
        height: 42,
        width: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.surfaceRaised,
      },
      taskIconDone: { backgroundColor: c.tabActive },
      taskTitle: {
        color: c.text,
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 4,
      },
      status: { color: c.inProgress, fontSize: 10, fontWeight: "800" },
      statusDone: { color: c.completed },
      taskDescription: { color: c.secondary, fontSize: 12, lineHeight: 18 },
      action: {
        minHeight: 42,
        borderRadius: 12,
        backgroundColor: c.tabActive,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 12,
        marginTop: 4,
      },
      actionText: { color: c.onSelection, fontWeight: "800", fontSize: 13 },
      completedNote: { color: c.completed, fontSize: 12 },
    });
    return { homeDesign, themeColor, c, styles };
  }, [appTheme]);
}
