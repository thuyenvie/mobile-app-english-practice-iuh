import { useMemo, useRef, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
import { HomeDataMessage } from "../../home/components/HomeDataMessage";
import { QuestionSheetModal } from "../components/QuestionSheetModal";
import { ReadingExamFooter } from "../components/ReadingExamFooter";
import { ReadingExamHeader } from "../components/ReadingExamHeader";
import { ReadingQuestionCard } from "../components/ReadingQuestionCard";
import { InteractiveText } from "../components/InteractiveText";
import { WordLookupModal } from "../components/WordLookupModal";
import { StudyScaffold } from "../components/StudyScaffold";
import { getExamErrorMessage } from "../api/examApi";
<<<<<<< HEAD
import { submitReadingPractice, type PracticeResult } from "../api/practiceApi";
import { useSession } from "@/lib/auth/useSession";
import { GuestPracticeNotice } from "../components/GuestPracticeNotice";
import { GuestResultDetails } from "../components/GuestResultDetails";
=======
import { lookupDictionaryWord, saveVocabularyWord, type DictionaryLookup } from "../api/dictionaryApi";
import { submitReadingPart } from "../api/examResultApi";
>>>>>>> origin/nho
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
  const session = useSession();
  const questions = useMemo(
    () => [...part.questions].sort((first, second) => first.questionNumber - second.questionNumber),
    [part.questions]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [questionSheetVisible, setQuestionSheetVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const submittingRef = useRef(false);
  const { label: timerLabel, expired: timerExpired } = useReadingTimer(part.partNumber);
  const [lookupVisible, setLookupVisible] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupWord, setLookupWord] = useState("");
  const [lookupContext, setLookupContext] = useState("");
  const [lookupEntry, setLookupEntry] = useState<DictionaryLookup | null>(null);
  const [vocabularySaving, setVocabularySaving] = useState(false);
  const [vocabularySaved, setVocabularySaved] = useState(false);
  const [vocabularySaveError, setVocabularySaveError] = useState("");
  const lookupRequestId = useRef(0);

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

  const loadWordLookup = async (word: string, context: string) => {
    const requestId = ++lookupRequestId.current;
    const wordIndex = context.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
    const snippet = wordIndex < 0
      ? context.slice(0, 220)
      : context.slice(Math.max(0, wordIndex - 100), Math.min(context.length, wordIndex + word.length + 100));
    setLookupWord(word);
    setLookupContext(snippet);
    setLookupVisible(true);
    setLookupLoading(true);
    setLookupError("");
    setLookupEntry(null);
    setVocabularySaving(false);
    setVocabularySaved(false);
    setVocabularySaveError("");
    try {
      const entry = await lookupDictionaryWord(word, snippet);
      if (requestId === lookupRequestId.current) setLookupEntry(entry);
    } catch (error: unknown) {
      if (requestId === lookupRequestId.current) {
        setLookupError(getExamErrorMessage(error));
      }
    } finally {
      if (requestId === lookupRequestId.current) setLookupLoading(false);
    }
  };

  const saveCurrentWord = async () => {
    if (!lookupEntry || vocabularySaving || vocabularySaved) return;
    const saveRequestId = lookupRequestId.current;
    setVocabularySaving(true);
    setVocabularySaveError("");
    try {
      await saveVocabularyWord(lookupEntry);
      if (saveRequestId === lookupRequestId.current) setVocabularySaved(true);
    } catch (error: unknown) {
      if (saveRequestId === lookupRequestId.current) {
        setVocabularySaveError(getExamErrorMessage(error));
      }
    } finally {
      if (saveRequestId === lookupRequestId.current) setVocabularySaving(false);
    }
  };

  const closeWordLookup = () => {
    lookupRequestId.current += 1;
    setLookupVisible(false);
    setLookupLoading(false);
  };

  const goToQuestion = (questionNumber: number, closeSheet = true) => {
    const nextIndex = questions.findIndex(
      (question) => question.questionNumber === questionNumber
    );
    if (nextIndex >= 0) setCurrentIndex(nextIndex);
    if (closeSheet) setQuestionSheetVisible(false);
  };

  const selectAnswer = (questionNumber: number, label: string) => {
    setAnswers((current) => ({ ...current, [questionNumber]: label }));
    goToQuestion(questionNumber, false);
  };

  const openSubmitConfirmation = () => {
    setQuestionSheetVisible(false);
    setSubmitError("");
    setConfirmVisible(true);
  };

  const submit = async () => {
    if (submittingRef.current || Object.keys(answers).length === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const saved = await submitReadingPractice(session.generation, part.year, part.testNumber, part.partNumber, answers, startedAt);
      setResult(saved);
      setConfirmVisible(false);
    } catch (error: unknown) {
      setSubmitError(getExamErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <StudyScaffold>
      <GuestPracticeNotice hasAnswers={Object.keys(answers).length > 0} busy={submitting} />
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
            onWordPress={(word, context) => void loadWordLookup(word, context)}
            highlightedWord={lookupVisible ? lookupWord : null}
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
              {currentPassage?.content ? (
                <InteractiveText
                  text={currentPassage.content}
                  textStyle={{ color: homeDesign.colors.text, fontSize: 16, lineHeight: 25 }}
                  selectedWord={lookupVisible ? lookupWord : null}
                  onWordPress={(word, context) =>
                    void loadWordLookup(word, context)
                  }
                />
              ) : (
                <Text color={homeDesign.colors.text} fontSize={16} lineHeight={25}>
                  Nội dung bài đọc chưa được import cho nhóm câu hỏi này.
                </Text>
              )}
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
                  onWordPress={(word, context) =>
                    void loadWordLookup(word, context)
                  }
                  highlightedWord={lookupVisible ? lookupWord : null}
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
        visible={questionSheetVisible && !confirmVisible && !result}
        questions={questions}
        answers={answers}
        currentQuestionNumber={currentQuestion.questionNumber}
        onClose={() => setQuestionSheetVisible(false)}
        onJump={goToQuestion}
        onSelect={selectAnswer}
        onSubmit={openSubmitConfirmation}
      />

      <WordLookupModal
        visible={lookupVisible}
        loading={lookupLoading}
        error={lookupError}
        entry={lookupEntry}
        word={lookupWord}
        onClose={closeWordLookup}
        onRetry={() => void loadWordLookup(lookupWord, lookupContext)}
        saved={vocabularySaved}
        saving={vocabularySaving}
        saveError={vocabularySaveError}
        onSave={() => void saveCurrentWord()}
      />

      <Modal
        visible={confirmVisible || !!result}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!submitting) {
            if (result && "resultId" in result) router.push({ pathname: "/study/history/[resultId]", params: { resultId: String(result.resultId) } });
            else if (result) setResult(null);
            else setConfirmVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {result ? <>
              <Text color={homeDesign.colors.text} fontSize={19} fontWeight="800">Kết quả Reading · Part {result.partNumber}</Text>
              <Text color={homeDesign.colors.text} fontSize={15}>
                Đúng {result.score}/{result.totalQuestions} câu · Đã trả lời {result.answeredQuestions} câu
              </Text>
              <Text color={homeDesign.colors.secondary} fontSize={13}>
                Đây là số câu đúng trên tổng câu thực tế của Part, không quy đổi sang điểm TOEIC.
              </Text>
              {"resultId" in result ? <>
                <AppButton onPress={() => {
                  const resultId = result.resultId;
                  setResult(null);
                  router.push({ pathname: "/study/history/[resultId]", params: { resultId: String(resultId) } });
                }}>Xem lại bài</AppButton>
                <AppButton appearance="text" onPress={() => {
                  const resultId = result.resultId;
                  setResult(null);
                  router.push({ pathname: "/study/history/[resultId]", params: { resultId: String(resultId) } });
                }}>Đóng</AppButton>
              </> : <>
                <GuestResultDetails result={result} />
                <AppButton onPress={() => setResult(null)}>Đóng kết quả tạm</AppButton>
              </>}
            </> : <>
              <Text color={homeDesign.colors.text} fontSize={19} fontWeight="800">Nộp Reading · Part {part.partNumber}?</Text>
              <Text color={homeDesign.colors.text} fontSize={14}>
                Đã chọn {Object.keys(answers).length}/{questions.length} câu; còn {questions.length - Object.keys(answers).length} câu chưa trả lời. Câu bỏ trống không được tính đúng.
              </Text>
              {submitError ? <Text color={homeDesign.colors.inProgress} fontSize={13}>{submitError}</Text> : null}
              <AppButton disabled={submitting || Object.keys(answers).length === 0} onPress={() => void submit()}>
                {submitting ? "Đang chấm..." : "Xác nhận nộp"}
              </AppButton>
              <AppButton appearance="text" disabled={submitting} onPress={() => setConfirmVisible(false)}>Tiếp tục làm bài</AppButton>
            </>}
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.72)" },
  modalCard: { width: "100%", maxWidth: 440, alignSelf: "center", padding: 18, gap: 12, borderRadius: 16, backgroundColor: homeDesign.colors.surface },
});
