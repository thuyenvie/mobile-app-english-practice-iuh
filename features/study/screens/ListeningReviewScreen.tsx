import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useEffect, useRef, useState } from "react";
import { BrandedPageState } from "@/components/ui/BrandedPageState";

import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getExamErrorMessage, getExamPart } from "../api/examApi";
import { getExamResult, type ExamResult } from "../api/examResultApi";
import { StudyScaffold } from "../components/StudyScaffold";
import { InteractiveText } from "../components/InteractiveText";
import { WordLookupModal } from "../components/WordLookupModal";
import {
  lookupDictionaryWord,
  saveVocabularyWord,
  type DictionaryLookup,
} from "../api/dictionaryApi";
import type { ExamQuestion } from "../types";

type QuestionContext = {
  question: ExamQuestion;
  passageContent: string | null;
};

export default function ListeningReviewScreen() {
  const { styles } = useThemedStyles();
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const id = Number(resultId);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Record<number, QuestionContext>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [retry, setRetry] = useState(0);
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

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id <= 0) {
      setError("Mã kết quả không hợp lệ.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setQuestions({});
    getExamResult(id)
      .then(async (data) => {
        if (!active) return;
        setResult(data);
        setLoading(false);
        // Snapshot Reading la nguon chinh; tai de hien tai chi de bo sung anh va du lieu cu.
        const partNumbers =
          data.partNumber != null
            ? [data.partNumber]
            : [1, 2, 3, 4];
        const parts = await Promise.allSettled(
          partNumbers.map((part) =>
            getExamPart(data.year, data.testNumber, part)
          )
        );
        if (!active) return;
        const context: Record<number, QuestionContext> = {};
        parts.forEach((part) => {
          if (part.status !== "fulfilled") return;
          part.value.questions.forEach((question) => {
            const passage = part.value.passages.find(
              (item) => item.id === question.passageId
            );
            context[question.questionNumber] = {
              question,
              passageContent: passage?.content ?? null,
            };
          });
        });
        setQuestions(context);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(getExamErrorMessage(cause));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, retry]);

  useEffect(
    () => () => {
      lookupRequestId.current += 1;
    },
    []
  );

  const loadWordLookup = async (word: string, context: string) => {
    const requestId = ++lookupRequestId.current;
    const wordIndex = context
      .toLocaleLowerCase()
      .indexOf(word.toLocaleLowerCase());
    const snippet =
      wordIndex < 0
        ? context.slice(0, 220)
        : context.slice(
            Math.max(0, wordIndex - 100),
            Math.min(context.length, wordIndex + word.length + 100)
          );
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
    } catch (cause: unknown) {
      if (requestId === lookupRequestId.current)
        setLookupError(getExamErrorMessage(cause));
    } finally {
      if (requestId === lookupRequestId.current) setLookupLoading(false);
    }
  };

  const saveCurrentWord = async () => {
    if (!lookupEntry || vocabularySaving || vocabularySaved) return;
    const requestId = lookupRequestId.current;
    setVocabularySaving(true);
    setVocabularySaveError("");
    try {
      await saveVocabularyWord(lookupEntry);
      if (requestId === lookupRequestId.current) setVocabularySaved(true);
    } catch (cause: unknown) {
      if (requestId === lookupRequestId.current)
        setVocabularySaveError(getExamErrorMessage(cause));
    } finally {
      if (requestId === lookupRequestId.current) setVocabularySaving(false);
    }
  };

  const closeWordLookup = () => {
    lookupRequestId.current += 1;
    setLookupVisible(false);
    setLookupLoading(false);
  };

  const answers = [...(result?.answers ?? [])].sort(
    (a, b) => a.questionNumber - b.questionNumber
  );
  const wrongCount = answers.filter((answer) => !answer.correct).length;
  const visible = showAll
    ? answers
    : answers.filter((answer) => !answer.correct);
  const submitted = result ? new Date(result.submittedAt) : null;
  const date =
    submitted && !Number.isNaN(submitted.getTime())
      ? submitted.toLocaleString("vi-VN")
      : result?.submittedAt;

  return (
    <StudyScaffold>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/study/history")
          }
        >
          <Text style={styles.link}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Xem lại bài làm</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <BrandedPageState compact loading message="Đang tải bài làm..." />
        ) : error ? (
          <BrandedPageState compact message={error} onRetry={() => setRetry(value => value + 1)} />
        ) : result ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>
                ETS {result.year} · Test {result.testNumber} ·{" "}
                {result.section === "READING"
                  ? `Reading · Part ${result.partNumber}`
                  : result.partNumber != null ? `Listening · Part ${result.partNumber}` : "Listening"}
              </Text>
              <Text style={styles.body}>
                Đúng {result.score}/{result.totalQuestions} câu · Đã trả lời{" "}
                {result.answeredQuestions} câu
              </Text>
              <Text style={styles.muted}>
                Chưa trả lời {result.totalQuestions - result.answeredQuestions}{" "}
                câu · Nộp lúc {date}
              </Text>
              <Text style={styles.muted}>
                Đây là số câu đúng, chưa quy đổi ra điểm TOEIC.
              </Text>
            </View>
            <View style={styles.row}>
              <Pressable onPress={() => setShowAll(false)}>
                <Text style={[styles.link, !showAll && styles.active]}>
                  Câu sai ({wrongCount})
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowAll(true)}>
                <Text style={[styles.link, showAll && styles.active]}>
                  Đã trả lời ({answers.length})
                </Text>
              </Pressable>
            </View>
            {!visible.length ? (
              <Text style={styles.muted}>
                {showAll
                  ? "Chưa có câu trả lời."
                  : "Không có câu sai trong các câu đã trả lời."}
              </Text>
            ) : null}
            {visible.map((answer) => {
              const context = questions[answer.questionNumber];
              const image =
                context?.question.imageUrl || context?.question.imageBase64;
              const uri =
                image?.startsWith("data:") || image?.startsWith("http")
                  ? image
                  : image
                  ? `data:image/jpeg;base64,${image}`
                  : null;
              return (
                <View key={answer.questionNumber} style={styles.card}>
                  <Text style={styles.title}>
                    Câu {answer.questionNumber} ·{" "}
                    {answer.correct ? "Đúng" : "Sai"}
                  </Text>
                  {answer.questionContent || context?.question.content ? (
                    <InteractiveText
                      text={
                        answer.questionContent ||
                        context?.question.content ||
                        ""
                      }
                      textStyle={styles.body}
                      selectedWord={lookupVisible ? lookupWord : null}
                      onWordPress={(word, text) =>
                        void loadWordLookup(word, text)
                      }
                    />
                  ) : null}
                  {answer.passageContent || context?.passageContent ? (
                    <View style={styles.passage}>
                      <Text style={styles.muted}>Đoạn văn</Text>
                      <InteractiveText
                        text={
                          answer.passageContent || context?.passageContent || ""
                        }
                        textStyle={styles.body}
                        selectedWord={lookupVisible ? lookupWord : null}
                        onWordPress={(word, text) =>
                          void loadWordLookup(word, text)
                        }
                      />
                    </View>
                  ) : null}
                  {uri ? (
                    <Image
                      source={{ uri }}
                      resizeMode="contain"
                      style={styles.image}
                    />
                  ) : null}
                  {(answer.options.length
                    ? answer.options
                    : context?.question.options ?? []
                  ).map((option, index) => (
                    <View
                      key={`${option.label}-${index}`}
                      style={styles.optionRow}
                    >
                      <Text style={styles.body}>{option.label}.</Text>
                      {option.text ? (
                        <InteractiveText
                          text={option.text}
                          textStyle={styles.optionText}
                          selectedWord={lookupVisible ? lookupWord : null}
                          onWordPress={(word, text) =>
                            void loadWordLookup(word, text)
                          }
                        />
                      ) : null}
                    </View>
                  ))}
                  <Text style={styles.warning}>
                    Bạn chọn: {answer.selectedOption}
                  </Text>
                  <Text style={styles.correct}>
                    Đáp án đúng:{" "}
                    {answer.correctOption ??
                      "Không có snapshot cho lượt làm cũ"}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
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
    </StudyScaffold>
  );
}




function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;
    const c = homeDesign.colors;
    const styles = StyleSheet.create({
      header: { padding: 16, gap: 8, borderBottomWidth: 1, borderColor: c.border },
      content: { padding: 16, paddingBottom: 36, gap: 12 },
      card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, gap: 8 },
      row: { flexDirection: "row", gap: 20 },
      optionRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
      title: { color: c.text, fontSize: 17, fontWeight: "700" },
      body: { color: c.text, fontSize: 14, lineHeight: 21 },
      optionText: { flex: 1, color: c.text, fontSize: 14, lineHeight: 21 },
      muted: { color: c.secondary, fontSize: 13, lineHeight: 20 },
      link: { color: c.link, fontSize: 14, paddingVertical: 8 },
      active: { fontWeight: "700", textDecorationLine: "underline" },
      warning: { color: c.inProgress, fontSize: 14 },
      correct: { color: c.completed, fontSize: 14 },
      image: { width: "100%", height: 180 },
      passage: {
        padding: 12,
        gap: 6,
        borderRadius: 10,
        backgroundColor: c.background,
      },
    });
    return { homeDesign, c, styles };
  }, [appTheme]);
}
