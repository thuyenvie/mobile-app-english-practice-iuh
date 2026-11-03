import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
import { PartCard } from "../components/PartCard";
import { SectionTitle } from "../components/SectionTitle";
import { StudyScaffold } from "../components/StudyScaffold";
import { toeicParts } from "../data/toeicCatalog";

export default function TestOverviewScreen() {
  const params = useLocalSearchParams<{ year?: string; testNumber?: string }>();
  const year = Number(params.year);
  const testNumber = Number(params.testNumber);
  const [notice, setNotice] = useState("");
  const validParams = Number.isInteger(year) && Number.isInteger(testNumber);

  const openPart = (partNumber: number) => {
    router.push({
      pathname: "/study/[year]/[testNumber]/parts/[partNumber]",
      params: {
        year: String(year),
        testNumber: String(testNumber),
        partNumber: String(partNumber),
      },
    });
  };

  const startFullTest = () => {
    router.push({
      pathname: "/study/[year]/[testNumber]/full",
      params: { year: String(year), testNumber: String(testNumber) },
    });
  };

  return (
    <StudyScaffold>
      <XStack
        alignItems="center"
        paddingHorizontal={12}
        paddingVertical={10}
        gap={8}
      >
        <AppButton
          appearance="text"
          width={44}
          height={44}
          aria-label="Quay lại"
          onPress={() => router.back()}
          icon={
            <MaterialIcons
              name="arrow-back"
              size={26}
              color={homeDesign.colors.text}
            />
          }
        />
        <YStack flex={1}>
          <Text color={homeDesign.colors.text} fontSize={18} fontWeight="700">
            Tổng quan đề thi
          </Text>
          {validParams ? (
            <Text color={homeDesign.colors.secondary} fontSize={11}>
              ETS {year} · Test {String(testNumber).padStart(2, "0")}
            </Text>
          ) : null}
        </YStack>
      </XStack>

      {!validParams ? (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding={24}
          gap={16}
        >
          <Text color={homeDesign.colors.text}>
            Thông tin đề thi không hợp lệ.
          </Text>
          <AppButton onPress={() => router.replace("/(tabs)/study")}>
            Về trang Học tập
          </AppButton>
        </YStack>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
        >
          <YStack
            backgroundColor={homeDesign.colors.surfaceRaised}
            borderRadius={18}
            padding={18}
            gap={10}
            marginBottom={22}
          >
            <Text color={homeDesign.colors.text} fontSize={21} fontWeight="800">
              ETS {year} · Test {String(testNumber).padStart(2, "0")}
            </Text>
            <Text
              color={homeDesign.colors.secondary}
              fontSize={12}
              lineHeight={18}
            >
              Listening 45 phút · Reading 75 phút · Tổng cộng 200 câu
            </Text>
            <AppButton
              marginTop={6}
              onPress={startFullTest}
            >
              Bắt đầu Full Test
            </AppButton>
          </YStack>

          {notice ? (
            <Text
              role="status"
              color={homeDesign.colors.inProgress}
              backgroundColor={homeDesign.colors.surface}
              borderRadius={12}
              padding={12}
              marginBottom={18}
            >
              {notice}
            </Text>
          ) : null}

          <YStack gap={12} marginBottom={24}>
            <SectionTitle title="Listening · 45 phút" hint="Part 1–4" />
            {toeicParts
              .filter((part) => part.section === "LISTENING")
              .map((part) => (
                <PartCard
                  key={part.number}
                  part={part}
                  onStart={() => openPart(part.number)}
                />
              ))}
          </YStack>

          <YStack gap={12}>
            <SectionTitle title="Reading · 75 phút" hint="Part 5–7" />
            {toeicParts
              .filter((part) => part.section === "READING")
              .map((part) => (
                <PartCard
                  key={part.number}
                  part={part}
                  onStart={() => openPart(part.number)}
                />
              ))}
          </YStack>
        </ScrollView>
      )}
    </StudyScaffold>
  );
}
