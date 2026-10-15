import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { XStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";

export function ReadingExamFooter({
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: {
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <XStack
      minHeight={62}
      paddingHorizontal={18}
      alignItems="center"
      justifyContent="space-between"
      backgroundColor={homeDesign.colors.surface}
      borderTopWidth={1}
      borderTopColor={homeDesign.colors.border}
    >
      <AppButton
        appearance="text"
        width={52}
        height={48}
        disabled={!canGoPrevious}
        opacity={canGoPrevious ? 1 : 0.3}
        aria-label="Câu trước"
        onPress={onPrevious}
        icon={
          <MaterialIcons
            name="chevron-left"
            size={38}
            color={homeDesign.colors.text}
          />
        }
      />

      <AppButton
        appearance="text"
        width={52}
        height={48}
        disabled
        opacity={0.55}
        aria-label="Yêu thích - sẽ phát triển sau"
        icon={
          <MaterialIcons
            name="favorite-border"
            size={29}
            color={homeDesign.colors.text}
          />
        }
      />

      <AppButton
        appearance="text"
        width={52}
        height={48}
        disabled={!canGoNext}
        opacity={canGoNext ? 1 : 0.3}
        aria-label="Câu tiếp theo"
        onPress={onNext}
        icon={
          <MaterialIcons
            name="chevron-right"
            size={38}
            color={homeDesign.colors.text}
          />
        }
      />
    </XStack>
  );
}
