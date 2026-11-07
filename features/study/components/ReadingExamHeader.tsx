import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text, XStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";


export function ReadingExamHeader({
  questionLabel,
  timerLabel,
  timerExpired,
  onBack,
  onOpenQuestionSheet,
}: {
  questionLabel: string;
  timerLabel: string;
  timerExpired: boolean;
  onBack: () => void;
  onOpenQuestionSheet: () => void;
}) {
  const { homeDesign, themeColor } = useThemedStyles();
  return (
    <XStack
      minHeight={62}
      paddingHorizontal={10}
      alignItems="center"
      gap={8}
      backgroundColor={homeDesign.colors.surface}
      borderBottomWidth={1}
      borderBottomColor={homeDesign.colors.border}
    >
      <AppButton
        appearance="text"
        width={40}
        height={40}
        aria-label="Quay lại"
        onPress={onBack}
        icon={
          <MaterialIcons
            name="arrow-back"
            size={25}
            color={homeDesign.colors.text}
          />
        }
      />

      <Text
        flex={1}
        color={homeDesign.colors.text}
        fontSize={15}
        fontWeight="700"
        numberOfLines={1}
      >
        {questionLabel}
      </Text>

      <XStack alignItems="center" gap={5}>
        <MaterialCommunityIcons
          name="timer-outline"
          size={22}
          color={timerExpired ? themeColor("#ff4d4f", "text") : homeDesign.colors.inProgress}
        />
        <Text
          minWidth={48}
          color={timerExpired ? themeColor("#ff4d4f", "text") : homeDesign.colors.inProgress}
          fontSize={14}
          fontWeight="800"
        >
          {timerLabel}
        </Text>
      </XStack>

      <AppButton
        appearance="text"
        width={38}
        height={40}
        disabled
        opacity={0.55}
        aria-label="Cài đặt - sẽ phát triển sau"
        icon={
          <MaterialIcons
            name="settings"
            size={24}
            color={homeDesign.colors.text}
          />
        }
      />

      <AppButton
        appearance="text"
        width={38}
        height={40}
        aria-label="Mở bảng câu hỏi"
        onPress={onOpenQuestionSheet}
        icon={
          <MaterialIcons
            name="format-list-numbered"
            size={27}
            color={homeDesign.colors.text}
          />
        }
      />
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
