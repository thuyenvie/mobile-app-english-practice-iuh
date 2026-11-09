import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";

export function ReadingExamFooter({
  canGoPrevious,
  canGoNext,
  canSubmit,
  onPrevious,
  onNext,
  onSubmit,
}: {
  canGoPrevious: boolean;
  canGoNext: boolean;
  canSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const { homeDesign } = useThemedStyles();
  const insets = useSafeAreaInsets();
  return (
    <XStack
      minHeight={48 + insets.bottom}
      paddingBottom={insets.bottom}
      alignItems="center"
      justifyContent="space-between"
      backgroundColor={homeDesign.colors.surface}
    >
      <AppButton
        appearance="text"
        flex={1}
        minWidth={0}
        paddingHorizontal={10}
        paddingVertical={10}
        justifyContent="flex-start"
        fontSize={14}
        fontWeight="600"
        color={homeDesign.colors.link}
        disabled={!canGoPrevious}
        opacity={canGoPrevious ? 1 : 0.4}
        aria-label="Câu trước"
        onPress={onPrevious}
      >
        ‹ Câu trước
      </AppButton>

      <AppButton
        appearance="text"
        padding={10}
        fontSize={14}
        fontWeight="600"
        color={homeDesign.colors.link}
        disabled={!canSubmit}
        opacity={canSubmit ? 1 : 0.4}
        onPress={onSubmit}
      >
        Nộp
      </AppButton>

      <AppButton
        appearance="text"
        flex={1}
        minWidth={0}
        paddingHorizontal={10}
        paddingVertical={10}
        justifyContent="flex-end"
        fontSize={14}
        fontWeight="600"
        color={homeDesign.colors.link}
        disabled={!canGoNext}
        opacity={canGoNext ? 1 : 0.4}
        aria-label="Câu sau"
        onPress={onNext}
      >
        Câu sau ›
      </AppButton>
    </XStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
