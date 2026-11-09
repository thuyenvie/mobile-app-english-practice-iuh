import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { Image } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";

import type { ExamQuestion } from "../types";
import { InteractiveText } from "./InteractiveText";

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
  onWordPress,
  highlightedWord,
  disabled = false,
}: {
  question: ExamQuestion;
  selectedOption?: string;
  focused: boolean;
  onSelect: (label: string) => void;
  onWordPress?: (word: string, context: string) => void;
  highlightedWord?: string | null;
  disabled?: boolean;
}) {
  const { homeDesign, themeColor } = useThemedStyles();
  const imageUri = getQuestionImage(question);

  return (
    <YStack
      padding={14}
      gap={12}
      borderRadius={14}
      borderWidth={1}
      borderColor={focused ? homeDesign.colors.link : homeDesign.colors.border}
      backgroundColor={homeDesign.colors.surface}
    >
      <Text color={homeDesign.colors.text} fontSize={18} fontWeight="700">
        Câu {question.questionNumber}
      </Text>

      {question.content ? (
        onWordPress ? (
          <InteractiveText
            text={normalizeInlineText(question.content)}
            textStyle={{ color: homeDesign.colors.text, fontSize: 16, lineHeight: 24 }}
            selectedWord={highlightedWord}
            onWordPress={onWordPress}
          />
        ) : (
          <Text color={homeDesign.colors.text} fontSize={16} lineHeight={24}>
            {normalizeInlineText(question.content)}
          </Text>
        )
      ) : null}

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          resizeMode="contain"
          style={{ width: "100%", height: 220, borderRadius: 10 }}
        />
      ) : null}

      <YStack gap={12}>
        {question.options.map((option) => {
          const selected = selectedOption === option.label;

          return (
            <AppButton
              key={option.id ?? `${question.id}-${option.label}`}
              appearance="text"
              width="100%"
              height="auto"
              minHeight={54}
              padding={14}
              borderWidth={1}
              borderColor={
                selected ? homeDesign.colors.tabActive : homeDesign.colors.border
              }
              borderRadius={12}
              backgroundColor={
                selected ? themeColor("#334018", "background") : "transparent"
              }
              alignItems="stretch"
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              aria-label={`Chọn đáp án ${option.label} cho câu ${question.questionNumber}`}
              onPress={() => onSelect(option.label)}
            >
              <XStack width="100%" alignItems="flex-start" gap={14}>
                <Text
                  color={homeDesign.colors.text}
                  fontSize={16}
                  lineHeight={24}
                  fontWeight="700"
                >
                  {option.label}
                </Text>
                <Text
                  flex={1}
                  flexShrink={1}
                  color={homeDesign.colors.text}
                  fontSize={16}
                  lineHeight={24}
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

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, themeColor } = appTheme;

    return { homeDesign, themeColor };
  }, [appTheme]);
}
