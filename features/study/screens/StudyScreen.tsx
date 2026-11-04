import { useCallback, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useFocusEffect } from "expo-router";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
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
import { getTodaySchedule, type StudySchedule } from "../api/studyPlanApi";

export default function StudyScreen() {
  const session = useSession();
  const isGuest = session.status === "guest";
  const [selectedYear, setSelectedYear] = useState<number>(toeicYears[0]);
  const [notice, setNotice] = useState("");
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
          ) : session.status !== "authenticated" ? (
            <HomeDataMessage loading message="Đang kiểm tra tài khoản..." />
          ) : studyPlanLoading ? (
            <HomeDataMessage loading message="Đang tải kế hoạch học..." />
          ) : studyPlanError ? (
            <HomeDataMessage
              message={studyPlanError}
              onRetry={() => setStudyPlanRetry((value) => value + 1)}
            />
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
                {todaySchedule.plan.dailyMinutes} phút/ngày
              </Text>
              {todaySchedule.tasks.length ? (
                todaySchedule.tasks.map((task) => (
                  <XStack key={task.id} alignItems="center" gap={9}>
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
                    <Text flex={1} color={homeDesign.colors.text} fontSize={12}>
                      {task.title}
                    </Text>
                    <Text color={homeDesign.colors.secondary} fontSize={11}>
                      {task.estimatedMinutes} phút
                    </Text>
                  </XStack>
                ))
              ) : (
                <Text color={homeDesign.colors.secondary} fontSize={12}>
                  Hôm nay không có nhiệm vụ trong lộ trình.
                </Text>
              )}
              <XStack gap={10} marginTop={3}>
                <AppButton
                  flex={1}
                  onPress={() => router.push("/study-plan/week")}
                >
                  Xem lộ trình tuần
                </AppButton>
                <AppButton
                  flex={1}
                  appearance="text"
                  color={homeDesign.colors.link}
                  onPress={() => router.push("/study-plan/setup")}
                >
                  Chỉnh mục tiêu
                </AppButton>
              </XStack>
            </>
          )}
        </YStack>

        <YStack
          backgroundColor={homeDesign.colors.surface}
          borderRadius={18}
          padding={16}
          gap={8}
          marginBottom={24}
        >
          <XStack alignItems="center" gap={10}>
            <MaterialCommunityIcons
              name="progress-clock"
              size={25}
              color={homeDesign.colors.inProgress}
            />
            <Text color={homeDesign.colors.text} fontSize={15} fontWeight="700">
              Tiếp tục bài đang làm
            </Text>
          </XStack>
          <Text color={homeDesign.colors.secondary} fontSize={12}>
            {isGuest
              ? "Bạn đang học thử. Bài làm chỉ được giữ khi đang mở bài."
              : "Chưa có bài thi được lưu nháp."}
          </Text>
        </YStack>

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
            <HomeDataMessage loading message="Đang tải danh sách đề..." />
          ) : state.status === "error" ? (
            <HomeDataMessage message={state.message} onRetry={retry} />
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

        <YStack gap={12} marginBottom={24}>
          <SectionTitle title="Luyện theo kỹ năng" />
          <XStack gap={12}>
            <AppButton
              flex={1}
              minHeight={82}
              backgroundColor={homeDesign.colors.tab}
              color={homeDesign.colors.cardText}
              onPress={() =>
                setNotice("Hãy chọn một đề để luyện Listening Part 1–4.")
              }
            >
              Listening · Part 1–4
            </AppButton>
            <AppButton
              flex={1}
              minHeight={82}
              backgroundColor={homeDesign.colors.tabActive}
              color={homeDesign.colors.cardText}
              onPress={() =>
                setNotice("Hãy chọn một đề để luyện Reading Part 5–7.")
              }
            >
              Reading · Part 5–7
            </AppButton>
          </XStack>
          {notice ? (
            <Text color={homeDesign.colors.secondary} fontSize={12}>
              {notice}
            </Text>
          ) : null}
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
              <HomeDataMessage loading message="Đang tải kết quả..." />
            ) : recentError ? (
              <HomeDataMessage
                message={recentError}
                onRetry={() => setRecentRetry((value) => value + 1)}
              />
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
