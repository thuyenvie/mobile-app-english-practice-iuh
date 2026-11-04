import { useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { homeDesign } from "@/theme/tokens";
import { StudyScaffold } from "../components/StudyScaffold";
import { PracticeAudioPlayer } from "../components/PracticeAudioPlayer";
import { useExamPart } from "../hooks/useExamPart";
import { useListeningDraft } from "../hooks/useListeningDraft";
import { getExamErrorMessage } from "../api/examApi";
import {
  submitListeningPractice,
  type PracticeResult,
} from "../api/practiceApi";
import { useSession } from "@/lib/auth/useSession";
import { GuestPracticeNotice } from "../components/GuestPracticeNotice";
import { GuestResultDetails } from "../components/GuestResultDetails";
import type { ExamQuestion } from "../types";

export default function ListeningPartScreen() {
  const session = useSession();
  const params = useLocalSearchParams<{
    year: string;
    testNumber: string;
    partNumber: string;
  }>();
  const year = Number(params.year),
    test = Number(params.testNumber),
    partNumber = Number(params.partNumber);
  const valid =
    Number.isInteger(year) &&
    year > 0 &&
    Number.isInteger(test) &&
    test > 0 &&
    Number.isInteger(partNumber) &&
    partNumber >= 1 &&
    partNumber <= 4;
  const { state, retry } = useExamPart(year, test, partNumber, valid);
  const draft = useListeningDraft(year, test);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const insets = useSafeAreaInsets();
  const questions = useMemo(
    () =>
      state.status === "ready"
        ? [...state.part.questions].sort(
            (a, b) => a.questionNumber - b.questionNumber
          )
        : [],
    [state]
  );
  const current =
    questions.find((q) => q.questionNumber === selectedNumber) ?? questions[0];
  const index = questions.indexOf(current);
  const related =
    current && partNumber >= 3 && current.passageId != null
      ? questions.filter((q) => q.passageId === current.passageId)
      : current
      ? [current]
      : [];
  const activePassage =
    current && current.passageId != null && state.status === "ready"
      ? state.part.passages.find((passage) => passage.id === current.passageId)
      : undefined;
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/study");
  const submit = async () => {
    if (submitting.current || !Object.keys(draft.answers).length) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      setResult(
        await submitListeningPractice(
          session.generation,
          year,
          test,
          draft.answers,
          draft.startedAt
        )
      );
      setConfirm(false);
      setSheet(false);
    } catch (e) {
      setError(getExamErrorMessage(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <StudyScaffold>
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Action text="‹" label="Quay lại" onPress={back} disabled={busy} />
          <View style={styles.flex}>
            <Text style={styles.title}>Listening · Part {partNumber}</Text>
            <Text style={styles.muted}>
              ETS {year} · Test {test} · Luyện tập
            </Text>
          </View>
          <Action
            text="☰"
            label="Mở bảng câu hỏi"
            onPress={() => setSheet(true)}
            disabled={!current || busy}
          />
        </View>
        <GuestPracticeNotice
          hasAnswers={Object.keys(draft.answers).length > 0}
          busy={busy}
        />
        <View style={styles.row}>
          {[1, 2, 3, 4].map((part) => (
            <Action
              key={part}
              text={`Part ${part}`}
              disabled={busy || part === partNumber}
              onPress={() => {
                setSelectedNumber(null);
                router.setParams({ partNumber: String(part) });
              }}
            />
          ))}
        </View>
        {current ? (
          <PracticeAudioPlayer
            key={`${activePassage?.id ?? current.id}-${
              activePassage?.audioSegment?.segmentId ?? "no-segment"
            }`}
            audio={activePassage?.audioSegment ?? null}
            activeQuestionNumber={current.questionNumber}
            paused={confirm || !!result || sheet}
          />
        ) : null}
        {!valid ? (
          <Text style={styles.message}>Thông tin đề không hợp lệ.</Text>
        ) : state.status === "loading" || !draft.ready ? (
          <ActivityIndicator style={styles.message} />
        ) : state.status === "error" ? (
          <>
            <Text style={styles.message}>{state.message}</Text>
            <Action text="Tải lại" onPress={retry} />
          </>
        ) : !current ? (
          <Text style={styles.message}>Part này chưa có câu hỏi.</Text>
        ) : (
          <>
            <Text style={styles.progress}>
              Câu {current.questionNumber} · Đã chọn{" "}
              {Object.keys(draft.answers).length}/100
            </Text>
            {draft.error ? (
              <Text style={styles.warning}>{draft.error}</Text>
            ) : null}
            <ScrollView
              key={`${partNumber}-${current.passageId ?? current.id}`}
              style={styles.flex}
              contentContainerStyle={styles.content}
            >
              {partNumber >= 3 ? (
                <Text style={styles.muted}>
                  Nghe đoạn hội thoại/bài nói và trả lời các câu liên quan.
                </Text>
              ) : null}
              {related.map((question) => (
                <View
                  key={question.id}
                  style={[styles.card, question === current && styles.active]}
                >
                  <Text style={styles.title}>
                    Câu {question.questionNumber}
                  </Text>
                  {partNumber >= 3 && question.content ? (
                    <Text style={styles.body}>{question.content}</Text>
                  ) : null}
                  {question.imageUrl || question.imageBase64 ? (
                    <QuestionImage question={question} />
                  ) : partNumber === 1 ? (
                    <Text style={styles.warning}>
                      Câu này chưa có hình ảnh. Hãy kiểm tra dữ liệu import.
                    </Text>
                  ) : null}
                  {(partNumber <= 2
                    ? partNumber === 2
                      ? ["A", "B", "C"]
                      : ["A", "B", "C", "D"]
                    : question.options.map((option) => option.label)
                  ).map((label) => {
                    const option = question.options.find(
                      (item) => item.label === label
                    );
                    const selected =
                      draft.answers[question.questionNumber] === label;
                    return (
                      <Pressable
                        key={label}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={`Câu ${question.questionNumber}, đáp án ${label}`}
                        disabled={busy || !!result}
                        onPress={() =>
                          draft.select(question.questionNumber, label)
                        }
                        style={[styles.option, selected && styles.selected]}
                      >
                        <Text style={styles.optionLabel}>{label}</Text>
                        {/* Part 1-2 khong hien loi thoai trong luc lam bai. */}
                        {partNumber >= 3 ? (
                          <Text style={[styles.body, styles.flex]}>
                            {option?.text}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {partNumber >= 3 && !question.options.length ? (
                    <Text style={styles.warning}>Chưa có lựa chọn đáp án.</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
            <View style={styles.footer}>
              <Action
                text="‹ Câu trước"
                disabled={index <= 0 || busy}
                onPress={() =>
                  setSelectedNumber(questions[index - 1].questionNumber)
                }
              />
              <Action
                text="Nộp Listening"
                disabled={busy || !!result}
                onPress={() => setConfirm(true)}
              />
              <Action
                text="Câu sau ›"
                disabled={index >= questions.length - 1 || busy}
                onPress={() =>
                  setSelectedNumber(questions[index + 1].questionNumber)
                }
              />
            </View>
          </>
        )}
        <Modal
          visible={sheet || confirm || !!result}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) {
              setSheet(false);
              setConfirm(false);
              setResult(null);
            }
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.dialog}>
              {result ? (
                <>
                  <Text style={styles.title}>Kết quả Listening</Text>
                  <Text style={styles.body}>
                    Đúng {result.score}/{result.totalQuestions} câu · Đã trả lời{" "}
                    {result.answeredQuestions} câu
                  </Text>
                  <Text style={styles.muted}>
                    Đây là số câu đúng, không phải điểm TOEIC quy đổi.
                  </Text>
                  {"resultId" in result ? (
                    <Action
                      text="Xem lại bài"
                      onPress={() => {
                        const resultId = result.resultId;
                        setResult(null);
                        router.push({
                          pathname: "/study/history/[resultId]",
                          params: { resultId: String(resultId) },
                        });
                      }}
                    />
                  ) : (
                    <GuestResultDetails result={result} />
                  )}
                  <Action text="Đóng kết quả" onPress={() => setResult(null)} />
                </>
              ) : confirm ? (
                <>
                  <Text style={styles.title}>Nộp toàn bộ Listening?</Text>
                  <Text style={styles.body}>
                    Bạn đã chọn {Object.keys(draft.answers).length}/100 câu. Câu
                    chưa trả lời không có điểm. Backend cần đủ đề và đáp án của
                    cả Part 1–4.
                  </Text>
                  <Text style={styles.muted}>
                    {session.status === "guest"
                      ? "Kết quả chỉ hiển thị trong bài học thử này, không lưu vào tài khoản hoặc lịch sử."
                      : "Bản nháp được giữ để bạn luyện tiếp. Mỗi lần nộp thành công tạo một kết quả mới."}
                  </Text>
                  {error ? <Text style={styles.warning}>{error}</Text> : null}
                  <Action
                    text={busy ? "Đang chấm..." : "Xác nhận nộp"}
                    disabled={busy || !Object.keys(draft.answers).length}
                    onPress={() => void submit()}
                  />
                  <Action
                    text="Tiếp tục làm bài"
                    disabled={busy}
                    onPress={() => setConfirm(false)}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.title}>
                    Bảng câu hỏi · Part {partNumber}
                  </Text>
                  <Text style={styles.muted}>
                    Chạm số câu để chuyển đến câu hỏi.
                  </Text>
                  <ScrollView contentContainerStyle={styles.grid}>
                    {questions.map((question) => (
                      <Pressable
                        key={question.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Câu ${question.questionNumber}`}
                        onPress={() => {
                          setSelectedNumber(question.questionNumber);
                          setSheet(false);
                        }}
                        style={[
                          styles.cell,
                          draft.answers[question.questionNumber] &&
                            styles.selected,
                        ]}
                      >
                        <Text style={styles.body}>
                          {question.questionNumber}
                          {draft.answers[question.questionNumber]
                            ? ` · ${draft.answers[question.questionNumber]}`
                            : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Action
                    text="Nộp Listening (100 câu)"
                    onPress={() => setConfirm(true)}
                  />
                  <Action text="Đóng" onPress={() => setSheet(false)} />
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
  const [ratio, setRatio] = useState(1.5);
  const [failed, setFailed] = useState(false);
  const uri =
    question.imageUrl ||
    (question.imageBase64?.startsWith("data:")
      ? question.imageBase64
      : `data:image/jpeg;base64,${question.imageBase64}`);
  return failed ? (
    <Text style={styles.warning}>Không tải được hình ảnh câu hỏi.</Text>
  ) : (
    <Image
      source={{ uri }}
      resizeMode="contain"
      accessibilityLabel={`Hình câu ${question.questionNumber}`}
      onLoad={(event) => {
        const { width, height } = event.nativeEvent.source;
        if (width > 0 && height > 0) setRatio(width / height);
      }}
      onError={() => setFailed(true)}
      style={{ width: "100%", aspectRatio: ratio }}
    />
  );
}
function Action({
  text,
  label,
  onPress,
  disabled = false,
}: {
  text: string;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? text}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.actionText}>{text}</Text>
    </Pressable>
  );
}
const c = homeDesign.colors;
const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 8, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-around" },
  title: { color: c.text, fontSize: 18, fontWeight: "700" },
  body: { color: c.text, fontSize: 16, lineHeight: 24, flexShrink: 1 },
  muted: { color: c.secondary, fontSize: 13, lineHeight: 20 },
  action: { padding: 10, minHeight: 44, justifyContent: "center" },
  actionText: { color: c.link, fontSize: 14, fontWeight: "600" },
  message: { color: c.text, padding: 24 },
  warning: { color: c.inProgress, padding: 8 },
  progress: { color: c.tabActive, padding: 10 },
  content: { padding: 12, gap: 12, paddingBottom: 24 },
  card: {
    padding: 14,
    gap: 12,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  active: { borderColor: c.link },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
  },
  selected: { borderColor: c.tabActive, backgroundColor: "#334018" },
  optionLabel: { color: c.text, fontSize: 16, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: c.surface,
  },
  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000b",
    justifyContent: "center",
  },
  dialog: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    maxHeight: "85%",
    padding: 18,
    gap: 12,
    borderRadius: 16,
    backgroundColor: c.surface,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    padding: 12,
    minWidth: 64,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
  },
});
