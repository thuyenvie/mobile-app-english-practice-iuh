import { useStudySession } from "../session/StudySessionProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readExamDraft, writeExamDraft } from "../utils/examDrafts";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/lib/axios/axios";
import { homeDesign } from "@/theme/tokens";
import { getExamErrorMessage, getExamPart } from "../api/examApi";
import { getListeningAudio } from "../api/listeningApi";
import {
  submitListeningPractice,
  submitListeningPartPractice,
  submitReadingPractice,
  type PracticeResult,
} from "../api/practiceApi";
import { StudyScaffold } from "../components/StudyScaffold";
import { PracticeAudioPlayer } from "../components/PracticeAudioPlayer";
import { GuestResultDetails } from "../components/GuestResultDetails";
import { answersForPart, parseSelectedParts } from "../utils/selectedParts";
import { useSession } from "@/lib/auth/useSession";
import { toeicParts } from "../data/toeicCatalog";
import type { ExamPart, ExamQuestion } from "../types";

const TEST_SECONDS = 120 * 60;
const PART_NUMBERS = [1, 2, 3, 4, 5, 6, 7];
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; parts: ExamPart[] };
type ResultKey = "listening" | `reading-${number}` | `listening-${number}`;

export default function FullTestScreen({ practice = false }: { practice?: boolean } = {}) {
  const params = useLocalSearchParams<{ year?: string; testNumber?: string; parts?: string }>();
  const partNumbers = useMemo(() => practice ? parseSelectedParts(params.parts) : PART_NUMBERS, [practice, params.parts]);
  const year = Number(params.year);
  const testNumber = Number(params.testNumber);
  const valid =
    Number.isInteger(year) &&
    year > 0 &&
    Number.isInteger(testNumber) &&
    testNumber > 0 && partNumbers.length > 0;
  const session = useSession();
  const { refresh: refreshStudySession } = useStudySession();
  const insets = useSafeAreaInsets();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [questionSheet, setQuestionSheet] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [savedResults, setSavedResults] = useState<
    Partial<Record<ResultKey, PracticeResult>>
  >({});
  const [draftReady, setDraftReady] = useState(
    session.status !== "authenticated"
  );
  const submitLock = useRef(false);
  const autoSubmitted = useRef(false);
  const fullAudioPlayer = useAudioPlayer(null, { updateInterval: 1000 });
  const audioStatus = useAudioPlayerStatus(fullAudioPlayer);
  const [fullAudioError, setFullAudioError] = useState("");
  const fullAudioStarted = useRef(false);
  const c = homeDesign.colors;
  const draftKey =
    session.status === "authenticated" && session.subject
      ? `${practice ? "practice-parts:v1" : "full-test:v1"}:${encodeURIComponent(
          session.subject
        )}:${year}:${testNumber}${practice ? ":" + partNumbers.join("-") : ""}`
      : null;
  const results = Object.values(savedResults).filter(
    (item): item is PracticeResult => Boolean(item)
  );
  const expectedResultCount = practice
    ? (loadState.status === "ready" ? loadState.parts.filter((part) => Object.keys(answersForPart(part, answers)).length > 0).length : 0)
    : [
    Object.keys(answers).some((number) => Number(number) <= 100),
    ...[5, 6, 7].map((part) =>
      Object.keys(answers).some((number) => {
        const question = Number(number);
        return part === 5
          ? question >= 101 && question <= 130
          : part === 6
          ? question >= 131 && question <= 146
          : question >= 147;
      })
    ),
  ].filter(Boolean).length;
  const allSubmitted =
    results.length > 0 && results.length >= expectedResultCount;
  const totalScore = results.reduce((sum, item) => sum + item.score, 0);
  const totalScoredQuestions = results.reduce(
    (sum, item) => sum + item.totalQuestions,
    0
  );
  const totalAnswered = results.reduce(
    (sum, item) => sum + item.answeredQuestions,
    0
  );

  useEffect(() => {
    if (!valid || session.status !== "authenticated" || !draftKey) {
      setDraftReady(true);
      return;
    }
    let active = true;
    setDraftReady(false);
    readExamDraft(draftKey)
      .then((saved) => {
        if (!active || !saved) return;
        const draft = JSON.parse(saved) as {
          answers?: Record<string, string>;
          startedAt?: string;
          expiresAt?: number;
          questionNumber?: number;
          savedResults?: Partial<Record<ResultKey, PracticeResult>>;
        };
        if (draft.startedAt && Number.isFinite(Date.parse(draft.startedAt)))
          setStartedAt(draft.startedAt);
        if (
          typeof draft.expiresAt === "number" &&
          Number.isFinite(draft.expiresAt)
        )
          setExpiresAt(draft.expiresAt);
        if (
          typeof draft.questionNumber === "number" &&
          draft.questionNumber >= 1 &&
          draft.questionNumber <= 200
        )
          setQuestionNumber(draft.questionNumber);
        if (draft.answers && typeof draft.answers === "object") {
          const restored = Object.fromEntries(
            Object.entries(draft.answers)
              .filter(
                ([number, answer]) =>
                  Number(number) >= 1 &&
                  Number(number) <= 200 &&
                  /^[A-D]$/i.test(answer)
              )
              .map(([number, answer]) => [Number(number), answer.toUpperCase()])
          );
          setAnswers(restored);
        }
        if (draft.savedResults && typeof draft.savedResults === "object")
          setSavedResults(draft.savedResults);
      })
      .catch(() => {
        // Loi doc nhap khong chan nguoi hoc mo mot bai Full Test moi.
      })
      .finally(() => {
        if (active) setDraftReady(true);
      });
    return () => {
      active = false;
    };
  }, [draftKey, session.generation, session.status, valid]);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    setLoadState({ status: "loading" });
    Promise.all(
      partNumbers.map((part) => getExamPart(year, testNumber, part))
    ).then(
      (parts) => {
        if (active) setLoadState({ status: "ready", parts });
      },
      (error: unknown) => {
        if (active)
          setLoadState({
            status: "error",
            message: getExamErrorMessage(error),
          });
      }
    );
    return () => {
      active = false;
    };
  }, [testNumber, valid, year, partNumbers]);

  // Nap san file nghe lien tuc cua de truoc khi bat dau lam bai.
  useEffect(() => {
    let active = true;
    if (!valid || practice) return;
    getListeningAudio(year, testNumber)
      .then(async (audio) => {
        const uri = toAbsoluteUrl(audio.streamPath);
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
        if (!active) return;
        fullAudioPlayer.replace({ uri });
      })
      .catch((error: unknown) => {
        if (active) setFullAudioError(getExamErrorMessage(error));
      });
    return () => {
      active = false;
      try {
        fullAudioPlayer.pause();
      } catch {
        /* Audio da duoc giai phong. */
      }
    };
  }, [fullAudioPlayer, testNumber, valid, year, practice]);

  const allQuestions = useMemo(
    () =>
      loadState.status === "ready"
        ? loadState.parts
            .flatMap((part) => part.questions)
            .sort((a, b) => a.questionNumber - b.questionNumber)
        : [],
    [loadState]
  );
  const currentQuestion = allQuestions.find(
    (question) => question.questionNumber === questionNumber
  );
  const currentPartNumber =
    partNumbers.find(
      (number) =>
        loadState.status === "ready" &&
        loadState.parts
          .find((part) => part.partNumber === number)
          ?.questions.some(
            (question) => question.questionNumber === questionNumber
          )
    ) ?? 1;
  const currentPart =
    loadState.status === "ready"
      ? loadState.parts.find((part) => part.partNumber === currentPartNumber)
      : undefined;
  const currentPassage = currentPart?.passages.find(
    (passage) => passage.id === currentQuestion?.passageId
  );
  const relatedQuestions = useMemo(() => {
    if (!currentQuestion || !currentPart) return [];
    const grouped =
      currentPartNumber === 3 ||
      currentPartNumber === 4 ||
      currentPartNumber >= 6;
    return grouped && currentQuestion.passageId != null
      ? currentPart.questions.filter(
          (question) => question.passageId === currentQuestion.passageId
        )
      : [currentQuestion];
  }, [currentPart, currentPartNumber, currentQuestion]);
  const currentIndex = allQuestions.findIndex(
    (question) => question.questionNumber === questionNumber
  );

  useEffect(() => {
    if (
      practice || !startedAt ||
      !audioStatus.isLoaded ||
      fullAudioStarted.current ||
      questionNumber > 100
    )
      return;
    try {
      fullAudioPlayer.play();
      fullAudioStarted.current = true;
    } catch {
      setFullAudioError("Không phát được audio Listening.");
    }
  }, [audioStatus.isLoaded, fullAudioPlayer, questionNumber, startedAt, practice]);

  useEffect(() => {
    if (questionNumber > 100 && audioStatus.playing) {
      try {
        fullAudioPlayer.pause();
      } catch {
        /* Audio da duoc giai phong. */
      }
    }
  }, [audioStatus.playing, fullAudioPlayer, questionNumber]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (!draftReady || !draftKey || !startedAt) return;
    void writeExamDraft(draftKey, allSubmitted ? null : {
      answers, startedAt, expiresAt, questionNumber, savedResults,
    }).catch(() => setSubmitError("Không lưu được bản nháp trên thiết bị."));
  }, [
    allSubmitted,
    answers,
    draftKey,
    draftReady,
    expiresAt,
    questionNumber,
    savedResults,
    startedAt,
  ]);

  const begin = () => {
    const now = Date.now();
    setStartedAt(new Date(now).toISOString());
    setExpiresAt(practice ? null : now + TEST_SECONDS * 1000);
    setQuestionNumber(allQuestions[0]?.questionNumber ?? 1);
  };

  const selectAnswer = (question: ExamQuestion, label: string) => {
    setAnswers((current) => ({ ...current, [question.questionNumber]: label }));
    setQuestionNumber(question.questionNumber);
  };

  const submit = useCallback(async () => {
    if (submitLock.current || !startedAt || !Object.keys(answers).length)
      return;
    if (session.status === "guest" && !practice) {
      setSubmitError(
        "Backend hiện yêu cầu đăng nhập để chấm và lưu kết quả Full Test."
      );
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      if (practice) {
        if (loadState.status !== "ready") return;
        if (Object.keys(answers).some((number) => !allQuestions.some((question) => question.questionNumber === Number(number)))) {
          throw new Error("Có đáp án không thuộc các Part đã chọn. Hãy mở lại bài luyện tập.");
        }
        // Chi gui Part co dap an. Giu ket qua da nhan de thu lai phan loi.
        for (const part of loadState.parts) {
          const partAnswers = answersForPart(part, answers);
          const key: ResultKey = `${part.partNumber <= 4 ? "listening" : "reading"}-${part.partNumber}`;
          if (!Object.keys(partAnswers).length || savedResults[key]) continue;
          const submitPart = part.partNumber <= 4 ? submitListeningPartPractice : submitReadingPractice;
          const result = await submitPart(session.generation, year, testNumber, part.partNumber, partAnswers, startedAt);
          setSavedResults((current) => ({ ...current, [key]: result }));
        }
        return;
      }
      const byNumber = new Map(
        allQuestions.map((question) => [question.questionNumber, question])
      );
      const toExamAnswers = (numbers: number[]) =>
        Object.fromEntries(
          Object.entries(answers).filter(([number]) =>
            numbers.includes(Number(number))
          )
        );
      const listeningAnswers = toExamAnswers(
        Array.from({ length: 100 }, (_, index) => index + 1)
      );
      if (Object.keys(listeningAnswers).length && !savedResults.listening) {
        const result = await submitListeningPractice(
          session.generation,
          year,
          testNumber,
          listeningAnswers,
          startedAt
        );
        setSavedResults((current) => ({ ...current, listening: result }));
      }
      for (const partNumber of [5, 6, 7] as const) {
        const partQuestions = allQuestions.filter(
          (question) =>
            question.questionNumber >=
              (partNumber === 5 ? 101 : partNumber === 6 ? 131 : 147) &&
            question.questionNumber <=
              (partNumber === 5 ? 130 : partNumber === 6 ? 146 : 200)
        );
        const partAnswers = toExamAnswers(
          partQuestions.map((question) => question.questionNumber)
        );
        const key = `reading-${partNumber}` as ResultKey;
        if (Object.keys(partAnswers).length && !savedResults[key]) {
          const result = await submitReadingPractice(
            session.generation,
            year,
            testNumber,
            partNumber,
            partAnswers,
            startedAt
          );
          setSavedResults((current) => ({ ...current, [key]: result }));
        }
      }
      // Keep the answer map referenced here so a malformed response cannot silently grade unknown IDs.
      if (
        Object.keys(answers).some((number) => !byNumber.has(Number(number)))
      ) {
        throw new Error(
          "Có đáp án không thuộc đề hiện tại. Tải lại đề trước khi nộp."
        );
      }
    } catch (error: unknown) {
      setSubmitError(getExamErrorMessage(error));
    } finally {
      if (session.status === "authenticated") void refreshStudySession().catch(() => undefined);
      submitLock.current = false;
      setSubmitting(false);
    }
  }, [
    allQuestions,
    answers,
    savedResults,
    refreshStudySession,
    session.generation,
    session.status,
    startedAt,
    testNumber,
    year,
    practice,
    loadState,
  ]);

  useEffect(() => {
    if (secondsLeft === 0 && startedAt && !autoSubmitted.current) {
      autoSubmitted.current = true;
      setConfirmSubmit(true);
      void submit();
    }
  }, [secondsLeft, startedAt, submit]);

  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/study");

  if (!valid)
    return (
      <StudyScaffold>
        <Text style={styles.notice}>Thông tin đề thi không hợp lệ.</Text>
      </StudyScaffold>
    );
  if (loadState.status === "loading")
    return (
      <StudyScaffold>
        <View style={styles.center}>
          <ActivityIndicator color={c.tabActive} />
          <Text style={styles.muted}>{practice ? "Đang tải các Part đã chọn..." : "Đang tải đủ 7 Part của đề thi..."}</Text>
        </View>
      </StudyScaffold>
    );
  if (loadState.status === "error")
    return (
      <StudyScaffold>
        <View style={styles.center}>
          <Text style={styles.notice}>{loadState.message}</Text>
          <Action title="Quay lại" onPress={back} />
        </View>
      </StudyScaffold>
    );
  if ((!practice && allQuestions.length !== 200) || (practice && loadState.parts.some((part) => !part.questions.length)))
    return (
      <StudyScaffold>
        <View style={styles.center}>
          <Text style={styles.notice}>
            {practice ? "Một Part đã chọn chưa có câu hỏi. Hãy quay lại chọn Part khác." : `Đề hiện có ${allQuestions.length}/200 câu, chưa đủ dữ liệu để bắt đầu Full Test.`}
          </Text>
          <Action title="Quay lại" onPress={back} />
        </View>
      </StudyScaffold>
    );

  return (
    <StudyScaffold>
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Action
            title="‹"
            accessibilityLabel="Quay lại"
            onPress={back}
            disabled={submitting || results.length > 0}
          />
          <View style={styles.heading}>
            <Text style={styles.title}>
              {practice ? "Luyện tập" : "Full Test"} · ETS {year} Test {testNumber}
            </Text>
            <Text style={styles.muted}>
              {practice ? `Part ${partNumbers.join(", ")} · ${allQuestions.length} câu` : startedAt
                ? `Còn lại ${formatTime(secondsLeft)}`
                : "200 câu · 120 phút"}
            </Text>
          </View>
          {startedAt ? (
            <Action
              title="☷"
              accessibilityLabel="Bảng câu hỏi"
              onPress={() => setQuestionSheet(true)}
            />
          ) : null}
        </View>

        {!startedAt ? (
          <ScrollView contentContainerStyle={styles.intro}>
            <Text style={styles.title}>{practice ? `Luyện Part ${partNumbers.join(", ")}` : "Bài thi TOEIC đầy đủ"}</Text>
            <Text style={styles.body}>
              {practice ? "Làm các Part đã chọn trong cùng một lượt, không giới hạn thời gian. Audio nghe riêng theo câu hoặc nhóm hội thoại. Chuyển câu bằng nút điều hướng hoặc bảng câu hỏi." : <>Làm liên tục Part 1–7 trong 120 phút. Audio Listening phát theo
              một track toàn bài. Bạn có thể chuyển câu bằng nút điều hướng hoặc
              bảng câu hỏi.</>}
            </Text>
            <Text style={styles.muted}>
              {practice ? `Đã tải ${allQuestions.length} câu. Kết quả lưu riêng từng Part; Part chưa trả lời câu nào sẽ không được gửi chấm.` : "Đề đã tải đủ 200 câu. Khi nộp, backend sẽ lưu một kết quả Listening và tối đa ba kết quả Reading theo Part."}
            </Text>
            {session.status === "guest" ? (
              <Text style={styles.muted}>
                Bài làm khách được giữ trong phiên hiện tại; đăng nhập để lưu
                bản nháp và lịch sử.
              </Text>
            ) : null}
            {practice ? null : fullAudioError ? (
              <Text style={styles.warning}>
                Không tải được audio: {fullAudioError}. Bạn vẫn có thể bắt đầu,
                nhưng phần nghe sẽ không có âm thanh.
              </Text>
            ) : (
              <Text style={styles.muted}>
                Audio: {audioStatus.isLoaded ? "Sẵn sàng" : "Đang tải audio..."}
              </Text>
            )}
            <Action
              title={practice ? "Bắt đầu làm bài" : "Bắt đầu làm bài · 120 phút"}
              disabled={!draftReady}
              onPress={begin}
              primary
            />
          </ScrollView>
        ) : (
          <>
            {currentQuestion ? (
              <>
                {practice && currentPartNumber <= 4 ? (
                  <PracticeAudioPlayer
                    key={`${currentPartNumber}-${currentPassage?.id ?? currentQuestion.id}`}
                    audio={currentPassage?.audioSegment ?? null}
                    activeQuestionNumber={questionNumber}
                    paused={confirmSubmit || questionSheet || results.length > 0}
                  />
                ) : currentPartNumber <= 4 ? (
                  <View style={styles.audioBanner}>
                    {audioStatus.isBuffering ? (
                      <ActivityIndicator color={c.tabActive} />
                    ) : null}
                    <Text style={styles.muted}>
                      {fullAudioError
                        ? "Không phát được audio Listening."
                        : audioStatus.playing
                        ? "Đang phát audio Listening toàn bài"
                        : audioStatus.isLoaded
                        ? "Audio Listening đã sẵn sàng"
                        : "Đang tải audio Listening..."}
                    </Text>
                    {audioStatus.isLoaded && !audioStatus.playing ? (
                      <Action
                        title="Phát / tiếp tục"
                        onPress={() => {
                          try {
                            fullAudioPlayer.play();
                            fullAudioStarted.current = true;
                          } catch {
                            setFullAudioError(
                              "Không phát được audio Listening."
                            );
                          }
                        }}
                      />
                    ) : null}
                    {fullAudioError ? (
                      <Action
                        title="Thử tải lại"
                        onPress={() => {
                          setFullAudioError("");
                          getListeningAudio(year, testNumber)
                            .then((audio) => {
                              fullAudioPlayer.replace({
                                uri: toAbsoluteUrl(audio.streamPath),
                              });
                            })
                            .catch((error: unknown) =>
                              setFullAudioError(getExamErrorMessage(error))
                            );
                        }}
                      />
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.progressRow}>
                  <Text style={styles.progress}>
                    Câu {questionNumber} · Đã chọn {Object.keys(answers).length}/{allQuestions.length}
                  </Text>
                  <Text style={styles.partLabel}>Part {currentPartNumber}</Text>
                </View>
                <ScrollView
                  style={styles.questionScroll}
                  contentContainerStyle={styles.questionContent}
                >
                  {(currentPartNumber === 6 || currentPartNumber === 7) &&
                  currentPassage?.content ? (
                    <View style={styles.passage}>
                      <Text style={styles.partLabel}>Nội dung bài đọc</Text>
                      <Text style={styles.body}>{currentPassage.content}</Text>
                    </View>
                  ) : null}
                  {relatedQuestions.map((question) => (
                    <View
                      key={question.id}
                      style={[
                        styles.card,
                        question.questionNumber === questionNumber &&
                          styles.activeCard,
                      ]}
                    >
                      <Text style={styles.title}>
                        Câu {question.questionNumber}
                      </Text>
                      {question.content ? (
                        <Text style={styles.body}>{question.content}</Text>
                      ) : null}
                      {question.imageUrl || question.imageBase64 ? (
                        <QuestionImage question={question} />
                      ) : null}
                      {(currentPartNumber === 2
                        ? ["A", "B", "C"]
                        : ["A", "B", "C", "D"]
                      ).map((label) => {
                        const option = question.options.find(
                          (item) => item.label === label
                        );
                        const selected =
                          answers[question.questionNumber] === label;
                        return (
                          <Pressable
                            key={label}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            onPress={() => selectAnswer(question, label)}
                            style={[styles.option, selected && styles.selected]}
                          >
                            <Text style={styles.optionLabel}>{label}</Text>
                            {currentPartNumber >= 3 && option?.text ? (
                              <Text style={[styles.body, styles.optionText]}>{option.text}</Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.footer}>
                  <Action
                    title="‹ Trước"
                    disabled={currentIndex <= 0 || submitting}
                    onPress={() =>
                      setQuestionNumber(
                        allQuestions[currentIndex - 1].questionNumber
                      )
                    }
                  />
                  <Action
                    title="Nộp"
                    disabled={submitting || results.length > 0}
                    onPress={() => setConfirmSubmit(true)}
                  />
                  <Action
                    title="Tiếp ›"
                    disabled={
                      currentIndex >= allQuestions.length - 1 || submitting
                    }
                    onPress={() =>
                      setQuestionNumber(
                        allQuestions[currentIndex + 1].questionNumber
                      )
                    }
                  />
                </View>
              </>
            ) : null}
          </>
        )}

        <Modal
          visible={questionSheet || confirmSubmit || results.length > 0}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!submitting) {
              setQuestionSheet(false);
              setConfirmSubmit(false);
            }
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.dialog}>
              {results.length > 0 ? (
                <>
                  <Text style={styles.title}>
                    {allSubmitted
                      ? "Đã nộp các phần đã làm"
                      : "Kết quả đã nhận được"}
                  </Text>
                  <Text style={styles.body}>
                    Đúng {totalScore}/{totalScoredQuestions} câu đã chấm · Đã
                    trả lời {totalAnswered}/{allQuestions.length} câu
                  </Text>
                  <Text style={styles.muted}>
                    {practice ? "Mỗi Part đã làm có một kết quả riêng. Part chưa trả lời câu nào không được gửi chấm." : "Backend lưu từng phần riêng, nên lịch sử có một kết quả Listening và các kết quả Reading đã nộp."}
                  </Text>
                  <ScrollView style={styles.sheetScroll}>
                  {results.map((result) => (
                    <View
                      key={
                        "resultId" in result
                          ? result.resultId
                          : `${result.section}-${result.partNumber}`
                      }
                      style={styles.resultRow}
                    >
                      <Text style={styles.body}>
                        {result.partNumber != null ? `${result.section === "LISTENING" ? "Listening" : "Reading"} · Part ${result.partNumber}` : result.section === "LISTENING"
                          ? "Listening · Part 1–4"
                          : `Reading · Part ${result.partNumber}`}
                        : {result.score}/{result.totalQuestions}
                      </Text>
                      {"resultId" in result ? (
                        <Action
                          title="Xem lại"
                          onPress={() => {
                            setConfirmSubmit(false);
                            router.push({
                              pathname: "/study/history/[resultId]",
                              params: { resultId: String(result.resultId) },
                            });
                          }}
                        />
                      ) : null}
                      {practice && !("resultId" in result) ? <GuestResultDetails result={result} /> : null}
                    </View>
                  ))}
                  </ScrollView>
                  {submitError ? (
                    <Text style={styles.warning}>{submitError}</Text>
                  ) : null}
                  {!allSubmitted && !submitError ? (
                    <Text style={styles.muted}>
                      Một hoặc nhiều phần chưa được gửi.
                    </Text>
                  ) : null}
                  {!allSubmitted ? (
                    <Action
                      title={
                        submitting ? "Đang nộp..." : "Thử nộp phần còn lại"
                      }
                      disabled={submitting}
                      onPress={() => void submit()}
                      primary
                    />
                  ) : null}
                  <Action
                    title="Đóng"
                    disabled={submitting}
                    onPress={() => {
                      setConfirmSubmit(false);
                      back();
                    }}
                  />
                </>
              ) : confirmSubmit ? (
                <>
                  <Text style={styles.title}>{practice ? "Nộp bài luyện tập?" : "Nộp bài Full Test?"}</Text>
                  <Text style={styles.body}>
                    Đã chọn {Object.keys(answers).length}/{allQuestions.length} câu. Câu bỏ trống không có điểm. Part chưa có đáp án sẽ không được gửi chấm.
                  </Text>
                  {session.status === "guest" && !practice ? (
                    <Text style={styles.warning}>
                      Hãy đăng nhập trước khi nộp để backend chấm điểm và lưu
                      lịch sử.
                    </Text>
                  ) : null}
                  {submitError ? (
                    <Text style={styles.warning}>{submitError}</Text>
                  ) : null}
                  {session.status === "guest" && !practice ? (
                    <Action
                      title="Đăng nhập"
                      onPress={() => router.push("/auth/login")}
                      primary
                    />
                  ) : (
                    <Action
                      title={
                        submitting ? "Đang nộp..." : "Nộp"
                      }
                      disabled={submitting || !Object.keys(answers).length}
                      onPress={() => void submit()}
                      primary
                    />
                  )}
                  <Action
                    title="Tiếp tục làm bài"
                    disabled={submitting}
                    onPress={() => setConfirmSubmit(false)}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.title}>Bảng câu hỏi</Text>
                  <ScrollView style={styles.sheetScroll}>
                    {toeicParts.filter((part) => partNumbers.includes(part.number)).map((part) => {
                      const partData = loadState.parts.find(
                        (item) => item.partNumber === part.number
                      );
                      return (
                        <View key={part.number} style={styles.sheetPart}>
                          <Text style={styles.partLabel}>
                            Part {part.number} · {part.title}
                          </Text>
                          <View style={styles.grid}>
                            {partData?.questions.map((question) => (
                              <Pressable
                                key={question.id}
                                accessibilityRole="button"
                                accessibilityLabel={`Câu ${
                                  question.questionNumber
                                }${
                                  answers[question.questionNumber]
                                    ? ` đã chọn ${
                                        answers[question.questionNumber]
                                      }`
                                    : " chưa làm"
                                }`}
                                onPress={() => {
                                  setQuestionNumber(question.questionNumber);
                                  setQuestionSheet(false);
                                }}
                                style={[
                                  styles.cell,
                                  answers[question.questionNumber] &&
                                    styles.cellAnswered,
                                  question.questionNumber === questionNumber &&
                                    styles.cellCurrent,
                                ]}
                              >
                                <Text style={styles.cellText}>
                                  {question.questionNumber}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                  <Action
                    title="Đóng bảng câu hỏi"
                    onPress={() => setQuestionSheet(false)}
                  />
                  <Action
                    title="Nộp"
                    onPress={() => {
                      setQuestionSheet(false);
                      setConfirmSubmit(true);
                    }}
                  />
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </StudyScaffold>
  );
}

function QuestionImage({ question }: { question: ExamQuestion }) {
  const uri =
    question.imageUrl ||
    (question.imageBase64?.startsWith("data:")
      ? question.imageBase64
      : `data:image/jpeg;base64,${question.imageBase64}`);
  return (
    <Image
      source={{ uri }}
      resizeMode="contain"
      accessibilityLabel={`Hình câu ${question.questionNumber}`}
      style={styles.image}
    />
  );
}

function Action({
  title,
  onPress,
  disabled = false,
  primary = false,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        primary && styles.primaryAction,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.actionText, primary && styles.primaryActionText]}>
        {title}
      </Text>
    </Pressable>
  );
}

function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const servicePath = normalized.startsWith("/exam-service/")
    ? normalized
    : `/exam-service${normalized}`;
  return `${API_BASE_URL.replace(/\/+$/, "")}${servicePath}`;
}

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

const c = homeDesign.colors;
const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  heading: { flex: 1 },
  title: { color: c.text, fontSize: 17, fontWeight: "800" },
  body: { color: c.text, fontSize: 15, lineHeight: 23 },
  muted: { color: c.secondary, fontSize: 12, lineHeight: 18 },
  notice: { color: c.text, padding: 22 },
  warning: { color: c.inProgress, fontSize: 13, lineHeight: 19 },
  intro: { padding: 22, gap: 18 },
  audioBanner: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
    backgroundColor: c.surface,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  progress: { color: c.tabActive, fontSize: 13, fontWeight: "700" },
  partLabel: { color: c.link, fontSize: 13, fontWeight: "700" },
  questionScroll: { flex: 1 },
  questionContent: { padding: 12, gap: 12, paddingBottom: 20 },
  passage: {
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  card: {
    padding: 14,
    gap: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  activeCard: { borderColor: c.tabActive },
  image: { width: "100%", height: 210 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderRadius: 11,
    borderColor: c.border,
  },
  optionLabel: { color: c.text, fontSize: 16, fontWeight: "800" },
  optionText: { flex: 1, flexShrink: 1 },
  selected: { borderColor: c.tabActive, backgroundColor: "#334018" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  action: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionText: { color: c.link, fontSize: 14, fontWeight: "700" },
  primaryAction: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: c.tabActive,
  },
  primaryActionText: { color: c.cardText, fontSize: 15 },
  disabled: { opacity: 0.4 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: "#000b",
  },
  dialog: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "88%",
    alignSelf: "center",
    gap: 12,
    padding: 17,
    borderRadius: 17,
    backgroundColor: c.surfaceRaised,
  },
  sheetScroll: { maxHeight: "72%" },
  sheetPart: {
    gap: 9,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  cell: {
    width: 43,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 9,
    borderColor: c.border,
  },
  cellAnswered: { backgroundColor: "#334018", borderColor: c.tabActive },
  cellCurrent: { borderWidth: 2, borderColor: c.link },
  cellText: { color: c.text, fontSize: 12, fontWeight: "700" },
  resultRow: { padding: 10, borderRadius: 10, backgroundColor: c.background },
});
