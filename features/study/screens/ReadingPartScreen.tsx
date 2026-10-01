import { useMemo, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
import { HomeDataMessage } from "../../home/components/HomeDataMessage";
import { QuestionSheetModal } from "../components/QuestionSheetModal";
import { ReadingExamFooter } from "../components/ReadingExamFooter";
import { ReadingExamHeader } from "../components/ReadingExamHeader";
import { ReadingQuestionCard } from "../components/ReadingQuestionCard";
import { StudyScaffold } from "../components/StudyScaffold";
import { useExamPart } from "../hooks/useExamPart";
import { useReadingTimer } from "../hooks/useReadingTimer";
import type { ExamAnswers, ExamPart, ExamQuestion } from "../types";

export default function ReadingPartScreen() {
  const params = useLocalSearchParams<{
    year?: string;
    testNumber?: string;
    partNumber?: string;
  }>();
  const year = Number(params.year);
  const testNumber = Number(params.testNumber);
  const partNumber = Number(params.partNumber);
  const validParams =
    Number.isInteger(year) &&
    Number.isInteger(testNumber) &&
    Number.isInteger(partNumber) &&
    partNumber >= 5 &&
    partNumber <= 7;
  const { state, retry } = useExamPart(
    year,
    testNumber,
    partNumber,
    validParams
  );

  if (!validParams) {
    return (
      <StudyScaffold>
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={16}>
          <Text color={homeDesign.colors.text} textAlign="center">
            Thông tin Reading Part không hợp lệ. Chỉ hỗ trợ Part 5, 6 và 7.
          </Text>
          <AppButton onPress={() => router.replace("/(tabs)/study")}>
            Về trang Học tập
          </AppButton>
        </YStack>
      </StudyScaffold>
    );
  }

  if (state.status === "loading") {
    return (
      <StudyScaffold>
        <HomeDataMessage loading message={`Đang tải Part ${partNumber}...`} />
      </StudyScaffold>
    );
  }

  if (state.status === "error") {
    return (
      <StudyScaffold>
        <HomeDataMessage message={state.message} onRetry={retry} />
      </StudyScaffold>
    );
  }

  if (!state.part.questions.length) {
    return (
      <StudyScaffold>
        <HomeDataMessage message={`Part ${partNumber} chưa có câu hỏi.`} onRetry={retry} />
      </StudyScaffold>
    );
  }

  return <ReadingPartContent part={state.part} />;
}

function ReadingPartContent({ part }: { part: ExamPart }) {
  const questions = useMemo(
    () => [...part.questions].sort((first, second) => first.questionNumber - second.questionNumber),
    [part.questions]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [questionSheetVisible, setQuestionSheetVisible] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const { label: timerLabel, expired: timerExpired } = useReadingTimer(part.partNumber);

  const currentQuestion = questions[currentIndex];
  const currentPassage = part.passages.find(
    (passage) => passage.id === currentQuestion.passageId
  );
  const relatedQuestions = useMemo(() => {
    if (part.partNumber === 5 || currentQuestion.passageId == null) {
      return [currentQuestion];
    }

    return questions.filter(
      (question) => question.passageId === currentQuestion.passageId
    );
  }, [currentQuestion, part.partNumber, questions]);

  const questionLabel = getQuestionLabel(currentQuestion, relatedQuestions);

  const goToQuestion = (questionNumber: number, closeSheet = true) => {
    const nextIndex = questions.findIndex(
      (question) => question.questionNumber === questionNumber
    );
    if (nextIndex >= 0) setCurrentIndex(nextIndex);
    if (closeSheet) setQuestionSheetVisible(false);
  };

  const selectAnswer = (questionNumber: number, label: string) => {
    setAnswers((current) => ({ ...current, [questionNumber]: label }));
    setSubmissionMessage("");
    goToQuestion(questionNumber, false);
  };

  const submitLocally = () => {
    const answeredCount = Object.keys(answers).length;
    const missingCount = Math.max(0, questions.length - answeredCount);
    setQuestionSheetVisible(false);
    setSubmissionMessage(
      missingCount === 0
        ? `Đã hoàn thành ${answeredCount}/${questions.length} câu. Backend hiện chưa có API chấm Reading.`
        : `Đã chọn ${answeredCount}/${questions.length} câu, còn ${missingCount} câu chưa trả lời.`
    );
  };

  return (
    <StudyScaffold>
      <ReadingExamHeader
        questionLabel={questionLabel}
        timerLabel={timerLabel}
        timerExpired={timerExpired}
        onBack={() => router.back()}
        onOpenQuestionSheet={() => setQuestionSheetVisible(true)}
      />

      {timerExpired ? (
        <XStack
          paddingHorizontal={14}
          paddingVertical={8}
          alignItems="center"
          gap={7}
          backgroundColor="#3a1818"
        >
          <MaterialIcons name="warning-amber" size={19} color="#ff7676" />
          <Text flex={1} color="#ffb3b3" fontSize={12}>
            Đã hết thời gian gợi ý cho Part {part.partNumber}. Bạn vẫn có thể tiếp tục luyện tập.
          </Text>
        </XStack>
      ) : null}

      {submissionMessage ? (
        <Text
          paddingHorizontal={14}
          paddingVertical={8}
          color={homeDesign.colors.inProgress}
          backgroundColor={homeDesign.colors.surfaceRaised}
          fontSize={12}
          role="status"
        >
          {submissionMessage}
        </Text>
      ) : null}

      {part.partNumber === 5 ? (
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.singleQuestionContent}
        >
          <ReadingQuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            selectedOption={answers[currentQuestion.questionNumber]}
            focused
            onSelect={(label) => selectAnswer(currentQuestion.questionNumber, label)}
          />
        </ScrollView>
      ) : (
        <YStack flex={1} padding={10} gap={8}>
          <YStack
            flex={1}
            overflow="hidden"
            borderRadius={14}
            borderWidth={1}
            borderColor={homeDesign.colors.border}
            backgroundColor={homeDesign.colors.surface}
          >
            <XStack
              paddingHorizontal={13}
              paddingVertical={10}
              alignItems="center"
              justifyContent="space-between"
              backgroundColor={homeDesign.colors.tabActive}
            >
              <Text color={homeDesign.colors.cardText} fontSize={15} fontWeight="800">
                Nội dung bài đọc
              </Text>
              <Text color={homeDesign.colors.cardText} fontSize={12} fontWeight="700">
                Câu {relatedQuestions[0].questionNumber}–
                {relatedQuestions[relatedQuestions.length - 1].questionNumber}
              </Text>
            </XStack>
            <ScrollView
              style={styles.flex}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.passageContent}
            >
              <Text color={homeDesign.colors.text} fontSize={16} lineHeight={25}>
                {currentPassage?.content ||
                  "Nội dung bài đọc chưa được import cho nhóm câu hỏi này."}
              </Text>
            </ScrollView>
          </YStack>

          <YStack
            flex={1.15}
            overflow="hidden"
            borderRadius={14}
            borderWidth={1}
            borderColor={homeDesign.colors.border}
            backgroundColor={homeDesign.colors.background}
          >
            <XStack
              paddingHorizontal={13}
              paddingVertical={9}
              backgroundColor={homeDesign.colors.link}
            >
              <Text color={homeDesign.colors.cardText} fontSize={14} fontWeight="800">
                Câu hỏi liên quan
              </Text>
            </XStack>
            <ScrollView
              style={styles.flex}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.relatedQuestionsContent}
            >
              {relatedQuestions.map((question) => (
                <ReadingQuestionCard
                  key={question.id}
                  question={question}
                  selectedOption={answers[question.questionNumber]}
                  focused={question.questionNumber === currentQuestion.questionNumber}
                  onSelect={(label) => selectAnswer(question.questionNumber, label)}
                />
              ))}
            </ScrollView>
          </YStack>
        </YStack>
      )}

      <ReadingExamFooter
        canGoPrevious={currentIndex > 0}
        canGoNext={currentIndex < questions.length - 1}
        onPrevious={() => setCurrentIndex((index) => Math.max(0, index - 1))}
        onNext={() =>
          setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))
        }
      />

      <QuestionSheetModal
        visible={questionSheetVisible}
        questions={questions}
        answers={answers}
        currentQuestionNumber={currentQuestion.questionNumber}
        onClose={() => setQuestionSheetVisible(false)}
        onJump={goToQuestion}
        onSelect={selectAnswer}
        onSubmit={submitLocally}
      />
    </StudyScaffold>
  );
}

function getQuestionLabel(
  currentQuestion: ExamQuestion,
  relatedQuestions: ExamQuestion[]
) {
  if (relatedQuestions.length <= 1) {
    return `Question ${currentQuestion.questionNumber}`;
  }

  return `Question ${relatedQuestions[0].questionNumber}–${
    relatedQuestions[relatedQuestions.length - 1].questionNumber
  }`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  singleQuestionContent: { padding: 14, paddingBottom: 28 },
  passageContent: { padding: 15, paddingBottom: 26 },
  relatedQuestionsContent: { padding: 10, paddingBottom: 24, gap: 10 },
});
