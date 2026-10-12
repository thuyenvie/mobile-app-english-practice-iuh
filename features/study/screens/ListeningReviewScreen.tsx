import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { homeDesign } from "@/theme/tokens";
import { getExamErrorMessage, getExamPart } from "../api/examApi";
import { getListeningResult, type ListeningResult } from "../api/listeningApi";
import { StudyScaffold } from "../components/StudyScaffold";
import type { ExamQuestion } from "../types";

type QuestionContext = { question: ExamQuestion };

export default function ListeningReviewScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const id = Number(resultId);
  const [result, setResult] = useState<ListeningResult | null>(null);
  const [questions, setQuestions] = useState<Record<number, QuestionContext>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id <= 0) { setError("Mã kết quả không hợp lệ."); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError("");
    setQuestions({});
    getListeningResult(id).then(async (data) => {
      if (!active) return;
      setResult(data);
      setLoading(false);
      // Cau hoi hien tai chi bo sung ngu canh; dap an dung van lay tu snapshot trong ket qua.
      const parts = await Promise.allSettled([1, 2, 3, 4].map(part => getExamPart(data.year, data.testNumber, part)));
      if (!active) return;
      const context: Record<number, QuestionContext> = {};
      parts.forEach(part => {
        if (part.status !== "fulfilled") return;
        part.value.questions.forEach(question => {
          context[question.questionNumber] = { question };
        });
      });
      setQuestions(context);
    }).catch((cause: unknown) => { if (active) { setError(getExamErrorMessage(cause)); setLoading(false); } });
    return () => { active = false; };
  }, [id, retry]);

  const answers = [...(result?.answers ?? [])].sort((a, b) => a.questionNumber - b.questionNumber);
  const wrongCount = answers.filter(answer => !answer.correct).length;
  const visible = showAll ? answers : answers.filter(answer => !answer.correct);
  const submitted = result ? new Date(result.submittedAt) : null;
  const date = submitted && !Number.isNaN(submitted.getTime()) ? submitted.toLocaleString("vi-VN") : result?.submittedAt;

  return <StudyScaffold>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/study/history")}>
        <Text style={styles.link}>‹ Quay lại</Text>
      </Pressable>
      <Text style={styles.title}>Xem lại bài Listening</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator /> : error ? <>
        <Text style={styles.warning}>{error}</Text>
        <Pressable onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>Thử lại</Text></Pressable>
      </> : result ? <>
        <View style={styles.card}>
          <Text style={styles.title}>ETS {result.year} · Test {result.testNumber} · Listening</Text>
          <Text style={styles.body}>Đúng {result.score}/{result.totalQuestions} câu · Đã trả lời {result.answeredQuestions} câu</Text>
          <Text style={styles.muted}>Chưa trả lời {result.totalQuestions - result.answeredQuestions} câu · Nộp lúc {date}</Text>
          <Text style={styles.muted}>Đây là số câu đúng, chưa quy đổi ra điểm TOEIC.</Text>
        </View>
        <View style={styles.row}>
          <Pressable onPress={() => setShowAll(false)}><Text style={[styles.link, !showAll && styles.active]}>Câu sai ({wrongCount})</Text></Pressable>
          <Pressable onPress={() => setShowAll(true)}><Text style={[styles.link, showAll && styles.active]}>Đã trả lời ({answers.length})</Text></Pressable>
        </View>
        {!visible.length ? <Text style={styles.muted}>{showAll ? "Chưa có câu trả lời." : "Không có câu sai trong các câu đã trả lời."}</Text> : null}
        {visible.map(answer => {
          const context = questions[answer.questionNumber];
          const image = context?.question.imageUrl || context?.question.imageBase64;
          const uri = image?.startsWith("data:") || image?.startsWith("http") ? image : image ? `data:image/jpeg;base64,${image}` : null;
          return <View key={answer.questionNumber} style={styles.card}>
            <Text style={styles.title}>Câu {answer.questionNumber} · {answer.correct ? "Đúng" : "Sai"}</Text>
            {context?.question.content ? <Text style={styles.body}>{context.question.content}</Text> : null}
            {uri ? <Image source={{ uri }} resizeMode="contain" style={styles.image} /> : null}
            {context?.question.options.map(option => <Text key={option.id} style={styles.body}>
              {option.label}. {option.text}
            </Text>)}
            <Text style={styles.warning}>Bạn chọn: {answer.selectedOption}</Text>
            <Text style={styles.correct}>Đáp án đúng: {answer.correctOption ?? "Không có snapshot cho lượt làm cũ"}</Text>
          </View>;
        })}
      </> : null}
    </ScrollView>
  </StudyScaffold>;
}

const c = homeDesign.colors;
const styles = StyleSheet.create({
  header: { padding: 16, gap: 8, borderBottomWidth: 1, borderColor: c.border },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, gap: 8 },
  row: { flexDirection: "row", gap: 20 },
  title: { color: c.text, fontSize: 17, fontWeight: "700" },
  body: { color: c.text, fontSize: 14, lineHeight: 21 },
  muted: { color: c.secondary, fontSize: 13, lineHeight: 20 },
  link: { color: c.link, fontSize: 14, paddingVertical: 8 },
  active: { fontWeight: "700", textDecorationLine: "underline" },
  warning: { color: c.inProgress, fontSize: 14 },
  correct: { color: c.completed, fontSize: 14 },
  image: { width: "100%", height: 180 },
});
