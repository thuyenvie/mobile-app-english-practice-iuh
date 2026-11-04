import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { homeDesign } from "@/theme/tokens";
import type { ToeicPartDefinition } from "../types";

export function PartCard({
  part,
  onStart,
  selected,
}: {
  part: ToeicPartDefinition;
  onStart: () => void;
  selected?: boolean;
}) {
  const listening = part.section === "LISTENING";

  return (
    <Pressable
      onPress={onStart}
      accessibilityRole={selected === undefined ? "button" : "checkbox"}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      accessibilityLabel={`Part ${part.number} · ${part.title}`}
    >
    <XStack
      backgroundColor={homeDesign.colors.surface}
      borderWidth={1}
      borderColor={selected ? homeDesign.colors.tabActive : homeDesign.colors.border}
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
      <YStack flex={1} minWidth={0} gap={3}>
        <Text color={homeDesign.colors.text} fontSize={15} fontWeight="700">
          Part {part.number} · {part.title}
        </Text>
        <Text color={homeDesign.colors.secondary} fontSize={11}>
          {part.description} · Câu {part.questionRange} · {part.questionCount}{" "}
          câu
        </Text>
      </YStack>
      <MaterialCommunityIcons
        name={selected === undefined ? "chevron-right" : selected ? "checkbox-marked" : "checkbox-blank-outline"}
        size={24}
        color={selected ? homeDesign.colors.tabActive : homeDesign.colors.link}
      />
    </XStack>
    </Pressable>
  );
}
