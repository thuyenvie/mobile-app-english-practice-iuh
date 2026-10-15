import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
import type { ToeicPartDefinition } from "../types";

export function PartCard({
  part,
  onStart,
}: {
  part: ToeicPartDefinition;
  onStart: () => void;
}) {
  const listening = part.section === "LISTENING";

  return (
    <XStack
      backgroundColor={homeDesign.colors.surface}
      borderWidth={1}
      borderColor={homeDesign.colors.border}
      borderRadius={16}
      padding={14}
      alignItems="center"
      gap={12}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor={
          listening ? homeDesign.colors.tab : homeDesign.colors.tabActive
        }
        alignItems="center"
        justifyContent="center"
      >
        <MaterialCommunityIcons
          name={listening ? "headphones" : "book-open-page-variant-outline"}
          size={23}
          color={homeDesign.colors.cardText}
        />
      </YStack>
      <YStack flex={1} gap={3}>
        <Text color={homeDesign.colors.text} fontSize={15} fontWeight="700">
          Part {part.number} · {part.title}
        </Text>
        <Text color={homeDesign.colors.secondary} fontSize={11}>
          {part.description} · Câu {part.questionRange} · {part.questionCount}{" "}
          câu
        </Text>
      </YStack>
      <AppButton
        appearance="text"
        color={homeDesign.colors.link}
        fontSize={12}
        onPress={onStart}
      >
        Bắt đầu
      </AppButton>
    </XStack>
  );
}
