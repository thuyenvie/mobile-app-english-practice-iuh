import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState } from "react";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text as NativeText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";

import { PartCard } from "../components/PartCard";
import { SectionTitle } from "../components/SectionTitle";
import { StudyScaffold } from "../components/StudyScaffold";
import { toeicParts } from "../data/toeicCatalog";

export default function TestOverviewScreen() {
  const { homeDesign, styles } = useThemedStyles();
  const params = useLocalSearchParams<{ year?: string; testNumber?: string }>();
  const year = Number(params.year);
  const testNumber = Number(params.testNumber);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const insets = useSafeAreaInsets();
  const validParams = Number.isInteger(year) && year > 0 && Number.isInteger(testNumber) && testNumber > 0;
  const selectedQuestionCount = toeicParts.filter((part) => selectedParts.includes(part.number))
    .reduce((total, part) => total + part.questionCount, 0);

  const togglePart = (partNumber: number) => {
    setSelectedParts((current) => current.includes(partNumber)
      ? current.filter((part) => part !== partNumber)
      : [...current, partNumber].sort((a, b) => a - b));
  };

  const startPractice = () => {
    if (!selectedParts.length) return;
    if (selectedParts.length === 1) {
      router.push({
        pathname: "/study/[year]/[testNumber]/parts/[partNumber]",
        params: { year: String(year), testNumber: String(testNumber), partNumber: String(selectedParts[0]) },
      });
      return;
    }
    router.push({
      pathname: "/study/[year]/[testNumber]/practice",
      params: {
        year: String(year),
        testNumber: String(testNumber),
        parts: selectedParts.join(","),
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
        <>
        <ScrollView
          style={styles.scroll}
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
            <AppButton marginTop={6} onPress={startFullTest}>
              Bắt đầu Full Test
            </AppButton>
          </YStack>

          <YStack gap={10} marginBottom={20}>
            <Text color={homeDesign.colors.text} fontSize={17} fontWeight="700">Chọn Part để luyện tập</Text>
            <Text color={homeDesign.colors.secondary} fontSize={12}>
              Chọn một hoặc nhiều Part Listening và Reading để làm trong cùng lượt.
            </Text>
          </YStack>

          <YStack gap={12} marginBottom={24}>
            <SectionTitle title="Listening · 45 phút" hint="Part 1–4" />
            {toeicParts
              .filter((part) => part.section === "LISTENING")
              .map((part) => (
                <PartCard
                  key={part.number}
                  part={part}
                  selected={selectedParts.includes(part.number)}
                  onStart={() => togglePart(part.number)}
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
                  selected={selectedParts.includes(part.number)}
                  onStart={() => togglePart(part.number)}
                />
              ))}
          </YStack>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <NativeText style={styles.selectionSummary}>
            {selectedParts.length ? `Part ${selectedParts.join(", ")} · ${selectedQuestionCount} câu` : "Chưa chọn Part nào"}
          </NativeText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bắt đầu luyện tập, đã chọn ${selectedParts.length} Part`}
            accessibilityState={{ disabled: !selectedParts.length }}
            disabled={!selectedParts.length}
            onPress={startPractice}
            style={[styles.startButton, !selectedParts.length && styles.disabled]}
          >
            <NativeText style={styles.startLabel}>
              {selectedParts.length ? `Bắt đầu luyện tập (${selectedParts.length} Part)` : "Chọn ít nhất một Part"}
            </NativeText>
          </Pressable>
        </View>
        </>
      )}
    </StudyScaffold>
  );
}



function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;
    const styles = StyleSheet.create({
      scroll: { flex: 1 },
      footer: {
        paddingHorizontal: 16, paddingTop: 10, gap: 8,
        backgroundColor: homeDesign.colors.background,
        borderTopWidth: 1, borderTopColor: homeDesign.colors.border,
      },
      selectionSummary: { color: homeDesign.colors.secondary, fontSize: 13, textAlign: "center" },
      startButton: { minHeight: 52, padding: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: homeDesign.colors.link },
      startLabel: { color: homeDesign.colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
      disabled: { opacity: 0.45 },
    });
    return { homeDesign, styles };
  }, [appTheme]);
}
