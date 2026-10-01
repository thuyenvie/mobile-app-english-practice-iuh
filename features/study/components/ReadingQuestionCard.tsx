import { Image } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
import type { ExamQuestion } from "../types";

function getQuestionImage(question: ExamQuestion) {
  if (question.imageUrl) return question.imageUrl;
  if (!question.imageBase64) return null;
  return question.imageBase64.startsWith("data:")
    ? question.imageBase64
    : `data:image/jpeg;base64,${question.imageBase64}`;
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function ReadingQuestionCard({
  question,
  selectedOption,
  focused,
  onSelect,
}: {
  question: ExamQuestion;
  selectedOption?: string;
  focused: boolean;
  onSelect: (label: string) => void;
}) {
  const imageUri = getQuestionImage(question);

  return (
    <YStack
      padding={14}
      gap={12}
      borderRadius={14}
      borderWidth={focused ? 2 : 1}
      borderColor={focused ? homeDesign.colors.link : homeDesign.colors.border}
      backgroundColor={homeDesign.colors.surface}
    >
      <Text color={homeDesign.colors.text} fontSize={17} fontWeight="800">
        {question.questionNumber}.
      </Text>

      {question.content ? (
        <Text color={homeDesign.colors.text} fontSize={16} lineHeight={24}>
          {normalizeInlineText(question.content)}
        </Text>
      ) : null}

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          resizeMode="contain"
          style={{ width: "100%", height: 220, borderRadius: 10 }}
        />
      ) : null}

      <YStack gap={9}>
        {question.options.map((option) => {
          const selected = selectedOption === option.label;

          return (
            <AppButton
              key={option.id ?? `${question.id}-${option.label}`}
              appearance="text"
              width="100%"
              height="auto"
              minHeight={54}
              paddingHorizontal={12}
              paddingVertical={11}
              borderWidth={1}
              borderColor={
                selected ? homeDesign.colors.tabActive : homeDesign.colors.border
              }
              borderRadius={12}
              backgroundColor={
                selected ? homeDesign.colors.surfaceRaised : "transparent"
              }
              alignItems="stretch"
              aria-label={`Chọn đáp án ${option.label} cho câu ${question.questionNumber}`}
              onPress={() => onSelect(option.label)}
            >
              <XStack width="100%" alignItems="flex-start" gap={11}>
                <YStack
                  width={30}
                  height={30}
                  flexShrink={0}
                  borderRadius={15}
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={2}
                  borderColor={
                    selected
                      ? homeDesign.colors.tabActive
                      : homeDesign.colors.secondary
                  }
                  backgroundColor={
                    selected ? homeDesign.colors.tabActive : "transparent"
                  }
                >
                  <Text
                    color={selected ? homeDesign.colors.cardText : homeDesign.colors.text}
                    fontWeight="800"
                  >
                    {option.label}
                  </Text>
                </YStack>
                <Text
                  flex={1}
                  flexShrink={1}
                  color={homeDesign.colors.text}
                  fontSize={15}
                  lineHeight={22}
                  paddingTop={4}
                  textAlign="left"
                >
                  {normalizeInlineText(option.text)}
                </Text>
              </XStack>
            </AppButton>
          );
        })}
      </YStack>
    </YStack>
  );
}
