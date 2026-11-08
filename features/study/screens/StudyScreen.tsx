import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useCallback, useState } from "react";
import { ContinueExamCard } from "../components/ContinueExamCard";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";

import { HomeDataMessage } from "../../home/components/HomeDataMessage";
import { toeicYears } from "../data/toeicCatalog";
import { useTestsByYear } from "../hooks/useTestsByYear";
import { SectionTitle } from "../components/SectionTitle";
import { StudyScaffold } from "../components/StudyScaffold";
import { TestCard } from "../components/TestCard";
import { YearSelector } from "../components/YearSelector";
import { ExamResultCard } from "../components/ExamResultCard";
import { getExamHistory, type ExamHistoryItem } from "../api/examResultApi";
import { getExamErrorMessage } from "../api/examApi";
import { useSession } from "@/lib/auth/useSession";
import { StartStudyButton } from "../session/StudySessionControls";
import { getTodaySchedule, type StudySchedule } from "../api/studyPlanApi";

export default function StudyScreen() {
  const { homeDesign } = useThemedStyles();
  const session = useSession();
  const isGuest = session.status === "guest";
  const [selectedYear, setSelectedYear] = useState<number>(toeicYears[0]);
  const { state, retry } = useTestsByYear(selectedYear);
  const [recent, setRecent] = useState<ExamHistoryItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState("");
  const [recentRetry, setRecentRetry] = useState(0);
  const [todaySchedule, setTodaySchedule] = useState<StudySchedule | null>(
    null
  );
  const [studyPlanLoading, setStudyPlanLoading] = useState(true);
  const [studyPlanError, setStudyPlanError] = useState("");
  const [studyPlanRetry, setStudyPlanRetry] = useState(0);
  // Tai lai moi khi quay ve trang Hoc tap sau khi nop bai.
  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      let active = true;
      setRecentLoading(true);
      getExamHistory(0, 3).then(
        (data) => {
          if (active) {
            setRecent(data.items);
            setRecentError("");
            setRecentLoading(false);
          }
        },
        (error: unknown) => {
          if (active) {
            setRecentError(getExamErrorMessage(error));
            setRecentLoading(false);
          }
        }
      );
      return () => {
        active = false;
      };
    }, [recentRetry, isGuest])
  );
  useFocusEffect(
    useCallback(() => {
      if (session.status !== "authenticated") {
        setStudyPlanLoading(false);
        setTodaySchedule(null);
        return;
      }
      let active = true;
      setStudyPlanLoading(true);
      getTodaySchedule().then(
        (data) => {
          if (active) {
            setTodaySchedule(data);
            setStudyPlanError("");
            setStudyPlanLoading(false);
          }
        },
        (error: unknown) => {
          if (active) {
            setStudyPlanError(getExamErrorMessage(error));
            setStudyPlanLoading(false);
          }
        }
      );
      return () => {
        active = false;
      };
    }, [session.status, studyPlanRetry])
  );
  const planLoading = !isGuest && (session.status !== "authenticated" || studyPlanLoading);

  // back end ch co cai nay
  const openTest = (testNumber: number) => {
    router.push({
      pathname: "/study/[year]/[testNumber]",
      params: { year: String(selectedYear), testNumber: String(testNumber) },
    });
  };

  return (
    <StudyScaffold>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <YStack gap={6} marginBottom={22}>
          <Text
            role="heading"
            color={homeDesign.colors.text}
            fontSize={25}
            fontWeight="800"
          >
            Học tập
          </Text>
          <Text color={homeDesign.colors.secondary} fontSize={13}>
            Luyện tập theo bộ đề TOEIC ETS
          </Text>
        </YStack>

        <YStack
          backgroundColor={homeDesign.colors.surface}
          borderRadius={18}
          padding={16}
          gap={11}
          marginBottom={20}
        >
          <XStack alignItems="center" justifyContent="space-between" gap={8}>
            <XStack alignItems="center" gap={9} flex={1}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={23}
                color={homeDesign.colors.tabActive}
              />
              <Text
                color={homeDesign.colors.text}
                fontSize={15}
                fontWeight="800"
              >
                Lộ trình học của bạn
              </Text>
            </XStack>
            {todaySchedule?.plan ? (
              <Text color={homeDesign.colors.link} fontSize={12}>
                {todaySchedule.completedTasks}/{todaySchedule.totalTasks} hôm
                nay
              </Text>
            ) : null}
          </XStack>
          {session.status === "guest" ? (
            <>
              <Text color={homeDesign.colors.secondary} fontSize={12}>
                Đăng nhập để lưu mục tiêu và tiến độ học.
              </Text>
              <AppButton
                appearance="text"
                onPress={() => router.push("/auth/login")}
              >
                Đăng nhập
              </AppButton>
            </>
          ) : planLoading ? (
            <SectionState loading message="Đang tải lộ trình…" />
          ) : studyPlanError ? (
            <SectionState message={`Chưa tải được lộ trình. ${studyPlanError}`} onRetry={() => setStudyPlanRetry(value => value + 1)} />
          ) : !todaySchedule?.plan ? (
            <>
              <Text color={homeDesign.colors.secondary} fontSize={12}>
                Đặt mục tiêu TOEIC và thời gian học mỗi ngày để tạo lộ trình 7
                ngày.
              </Text>
              <AppButton onPress={() => router.push("/study-plan/setup")}>
                Thiết lập mục tiêu
              </AppButton>
            </>
          ) : (
            <>
              <Text color={homeDesign.colors.secondary} fontSize={12}>
                Mục tiêu TOEIC {todaySchedule.plan.targetScore} ·{" "}
                Mục tiêu gốc: {todaySchedule.plan.dailyMinutes} phút/ngày
              </Text>
              <Text color={homeDesign.colors.secondary} fontSize={12}>Thời gian phiên học: {Math.floor((todaySchedule.sessionSeconds ?? 0) / 60)} phút</Text>
              {todaySchedule.tasks.length ? (
                todaySchedule.tasks.map((task) => (
                  <YStack key={task.id} gap={3}>
                    <XStack alignItems="center" gap={9}>
                      <MaterialCommunityIcons
                        name={
                          task.status === "COMPLETED"
                            ? "check-circle"
                            : "circle-outline"
                        }
                        size={18}
                        color={
                          task.status === "COMPLETED"
                            ? homeDesign.colors.completed
                            : homeDesign.colors.inProgress
                        }
                      />
                      <YStack flex={1} gap={4}>
                        <Text color={homeDesign.colors.text} fontSize={12}>
                          {task.title}
                        </Text>
                        <Text color={homeDesign.colors.secondary} fontSize={11}>
                          {task.description}
                        </Text>
                      </YStack>
                      <Text color={homeDesign.colors.secondary} fontSize={11}>
                        {task.estimatedMinutes} phút
                      </Text>
                    </XStack>
                    <StartStudyButton task={task} />
                  </YStack>
                ))
              ) : (
                <Text color={homeDesign.colors.secondary} fontSize={12}>
                  Hôm nay không có nhiệm vụ trong lộ trình.
                </Text>
              )}
              <YStack gap={10} marginTop={3}>
                <AppButton
                  onPress={() => router.push("/study-plan/week")}
                >
                  Xem lộ trình tuần
                </AppButton>
                <AppButton
                  appearance="text"
                  color={homeDesign.colors.link}
                  onPress={() => router.push("/study-plan/setup")}
                >
                  Chỉnh mục tiêu
                </AppButton>
              </YStack>
            </>
          )}
        </YStack>

        <ContinueExamCard />

        <YStack gap={12} marginBottom={25}>
          <SectionTitle title="Thi thử TOEIC" hint="Chọn năm ETS" />
          <YearSelector
            years={toeicYears}
            selectedYear={selectedYear}
            onSelect={setSelectedYear}
          />
        </YStack>

        <YStack gap={12} marginBottom={26}>
          <SectionTitle title={`Danh sách đề ETS ${selectedYear}`} />
          {state.status === "loading" ? (
            <SectionState loading message={`Đang tải đề ETS ${selectedYear}…`} />
          ) : state.status === "error" ? (
            <SectionState message={state.message} onRetry={retry} />
          ) : state.testNumbers.length ? (
            state.testNumbers.map((testNumber) => (
              <TestCard
                key={testNumber}
                year={selectedYear}
                testNumber={testNumber}
                onPress={() => openTest(testNumber)}
              />
            ))
          ) : (
            <HomeDataMessage
              message={`Chưa có đề ETS ${selectedYear} trong hệ thống.`}
            />
          )}
        </YStack>

        {isGuest ? (
          <YStack gap={8}>
            <Text color={homeDesign.colors.secondary}>
              Đăng nhập để lưu kết quả và xem lịch sử học tập.
            </Text>
            <AppButton
              appearance="text"
              onPress={() => router.push("/auth/login")}
            >
              Đăng nhập
            </AppButton>
          </YStack>
        ) : (
          <YStack gap={8}>
            <SectionTitle title="Kết quả gần đây" hint="Listening và Reading" />
            {recentLoading ? (
              <SectionState loading message="Đang tải kết quả gần đây…" />
            ) : recentError ? (
              <SectionState message={`Chưa tải được kết quả gần đây. ${recentError}`} onRetry={() => setRecentRetry(value => value + 1)} />
            ) : recent.length ? (
              recent.map((item) => (
                <ExamResultCard key={item.resultId} item={item} />
              ))
            ) : (
              <Text color={homeDesign.colors.secondary} fontSize={12}>
                Bạn chưa nộp bài thi nào.
              </Text>
            )}
            <AppButton
              appearance="text"
              onPress={() => router.push("/study/history")}
            >
              Xem toàn bộ lịch sử ›
            </AppButton>
          </YStack>
        )}
      </ScrollView>
    </StudyScaffold>
  );
}

function SectionState({ message, loading, onRetry }: { message: string; loading?: boolean; onRetry?: () => void }) {
  const { palette } = useAppTheme();
  return <YStack gap={8} paddingVertical={8}>
    {loading ? <ActivityIndicator color={palette.accent} /> : null}
    <Text role={loading ? "status" : "alert"} color={loading ? palette.muted : palette.error} fontSize={14}>{message}</Text>
    {onRetry ? <AppButton appearance="text" color={palette.accent} onPress={onRetry}>Thử lại</AppButton> : null}
  </YStack>;
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
