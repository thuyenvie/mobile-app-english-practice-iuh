import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { ScrollView } from "react-native";
import { Text, YStack } from "tamagui";
import type { GuestExamResult } from "../api/practiceApi";


// Review stays inside the current practice modal, never an account-history route.
export function GuestResultDetails({ result }: { result: GuestExamResult }) {
  const { homeDesign } = useThemedStyles();
  return <YStack gap={8}>
    <Text color={homeDesign.colors.secondary} fontSize={12}>Kết quả tạm thời, sẽ mất khi rời bài.</Text>
    <ScrollView style={{ maxHeight: 220 }}>
      {result.answers.map(answer => <YStack key={answer.questionNumber} gap={3} paddingVertical={6}>
        <Text color={answer.correct ? homeDesign.colors.completed : homeDesign.colors.inProgress} fontSize={13}>
          Câu {answer.questionNumber}: chọn {answer.selectedOption} · {answer.correct ? "Đúng" : "Sai"} · Đáp án {answer.correctOption || "—"}
        </Text>
        {answer.questionContent ? <Text color={homeDesign.colors.text} fontSize={12}>{answer.questionContent}</Text> : null}
      </YStack>)}
    </ScrollView>
  </YStack>;
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
