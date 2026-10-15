import { Modal, ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
import type { ExamAnswers, ExamQuestion } from "../types";

const OPTION_LABELS = ["A", "B", "C", "D"];

export function QuestionSheetModal({
  visible,
  questions,
  answers,
  currentQuestionNumber,
  onClose,
  onJump,
  onSelect,
  onSubmit,
}: {
  visible: boolean;
  questions: ExamQuestion[];
  answers: ExamAnswers;
  currentQuestionNumber: number;
  onClose: () => void;
  onJump: (questionNumber: number) => void;
  onSelect: (questionNumber: number, label: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <YStack
        flex={1}
        padding={18}
        justifyContent="center"
        backgroundColor="rgba(0,0,0,0.72)"
      >
        <YStack
          width="100%"
          maxWidth={440}
          maxHeight="88%"
          alignSelf="center"
          borderRadius={18}
          overflow="hidden"
          backgroundColor={homeDesign.colors.surface}
          borderWidth={1}
          borderColor={homeDesign.colors.border}
        >
          <YStack padding={17} borderBottomWidth={1} borderBottomColor={homeDesign.colors.border}>
            <Text
              color={homeDesign.colors.text}
              textAlign="center"
              fontSize={19}
              fontWeight="800"
            >
              Bảng câu hỏi
            </Text>
            <Text
              marginTop={5}
              color={homeDesign.colors.secondary}
              textAlign="center"
              fontSize={12}
            >
              Chạm số câu để chuyển nhanh hoặc chọn trực tiếp A–D
            </Text>
          </YStack>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 14, gap: 8 }}
          >
            {questions.map((question) => {
              const current = question.questionNumber === currentQuestionNumber;
              const availableOptions = new Set(
                question.options.map((option) => option.label)
              );

              return (
                <XStack
                  key={question.id}
                  minHeight={54}
                  paddingHorizontal={8}
                  alignItems="center"
                  gap={8}
                  borderRadius={10}
                  backgroundColor={
                    current ? homeDesign.colors.surfaceRaised : "transparent"
                  }
                >
                  <AppButton
                    appearance="text"
                    width={54}
                    height={42}
                    aria-label={`Đi tới câu ${question.questionNumber}`}
                    onPress={() => onJump(question.questionNumber)}
                  >
                    <Text
                      color={current ? homeDesign.colors.tabActive : homeDesign.colors.text}
                      fontSize={15}
                      fontWeight="800"
                    >
                      {question.questionNumber}.
                    </Text>
                  </AppButton>

                  <XStack flex={1} justifyContent="space-between" gap={6}>
                    {OPTION_LABELS.map((label) => {
                      const available = availableOptions.has(label);
                      const selected = answers[question.questionNumber] === label;

                      return (
                        <AppButton
                          key={label}
                          appearance="text"
                          width={38}
                          height={38}
                          minHeight={38}
                          borderRadius={19}
                          disabled={!available}
                          opacity={available ? 1 : 0.2}
                          backgroundColor={
                            selected
                              ? homeDesign.colors.tabActive
                              : homeDesign.colors.tab
                          }
                          color={homeDesign.colors.cardText}
                          aria-label={`Câu ${question.questionNumber}, đáp án ${label}`}
                          onPress={() => onSelect(question.questionNumber, label)}
                        >
                          {label}
                        </AppButton>
                      );
                    })}
                  </XStack>
                </XStack>
              );
            })}
          </ScrollView>

          <XStack
            padding={14}
            gap={10}
            borderTopWidth={1}
            borderTopColor={homeDesign.colors.border}
          >
            <AppButton
              appearance="text"
              flex={1}
              minHeight={48}
              backgroundColor="transparent"
              borderWidth={1}
              borderColor={homeDesign.colors.tabActive}
              color={homeDesign.colors.tabActive}
              onPress={onClose}
            >
              Huỷ
            </AppButton>
            <AppButton
              appearance="text"
              flex={1}
              minHeight={48}
              backgroundColor={homeDesign.colors.tabActive}
              color={homeDesign.colors.cardText}
              onPress={onSubmit}
            >
              Nộp bài
            </AppButton>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
