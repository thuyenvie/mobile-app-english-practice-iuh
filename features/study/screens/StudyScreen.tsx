import { useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
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

export default function StudyScreen() {
  const [selectedYear, setSelectedYear] = useState<number>(toeicYears[0]);
  const [notice, setNotice] = useState("");
  const { state, retry } = useTestsByYear(selectedYear);
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
            Chưa có bài thi được lưu nháp.
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

        <YStack gap={8}>
          <SectionTitle title="Kết quả gần đây" />
          <Text color={homeDesign.colors.secondary} fontSize={12}>
            Backend chưa có API lấy lịch sử kết quả nên mục này chưa có dữ liệu.
          </Text>
        </YStack>
      </ScrollView>
    </StudyScaffold>
  );
}
