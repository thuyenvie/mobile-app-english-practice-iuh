import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";


export function ReadingExamHeader({
  partNumber,
  year,
  testNumber,
  busy,
  timerLabel,
  timerExpired,
  onBack,
  onOpenQuestionSheet,
}: {
  partNumber: number;
  year: number;
  testNumber: number;
  busy: boolean;
  timerLabel: string;
  timerExpired: boolean;
  onBack: () => void;
  onOpenQuestionSheet: () => void;
}) {
  const { homeDesign, themeColor } = useThemedStyles();
  return (
    <XStack
      padding={8}
      alignItems="center"
      gap={8}
      backgroundColor={homeDesign.colors.background}
    >
      <AppButton
        appearance="text"
        padding={10}
        color={homeDesign.colors.link}
        fontSize={14}
        fontWeight="600"
        disabled={busy}
        opacity={busy ? 0.4 : 1}
        aria-label="Quay lại"
        onPress={onBack}
      >
        ‹
      </AppButton>

      <YStack flex={1}>
        <Text color={homeDesign.colors.text} fontSize={18} fontWeight="700">
          Reading · Part {partNumber}
        </Text>
        <Text color={homeDesign.colors.secondary} fontSize={13} lineHeight={20}>
          ETS {year} · Test {testNumber} · Luyện tập
        </Text>
      </YStack>

      <XStack alignItems="center" gap={5}>
        <MaterialCommunityIcons
          name="timer-outline"
          size={20}
          color={timerExpired ? themeColor("#ff4d4f", "text") : homeDesign.colors.inProgress}
        />
        <Text
          minWidth={48}
          color={timerExpired ? themeColor("#ff4d4f", "text") : homeDesign.colors.inProgress}
          fontSize={14}
          fontWeight="700"
        >
          {timerLabel}
        </Text>
      </XStack>

      <AppButton
        appearance="text"
        padding={10}
        color={homeDesign.colors.link}
        fontSize={14}
        fontWeight="600"
        disabled={busy}
        opacity={busy ? 0.4 : 1}
        aria-label="Mở bảng câu hỏi"
        onPress={onOpenQuestionSheet}
      >
        ☰
      </AppButton>
    </XStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, themeColor } = appTheme;

    return { homeDesign, themeColor };
  }, [appTheme]);
}
