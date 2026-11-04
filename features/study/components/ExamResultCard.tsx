import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { homeDesign } from "@/theme/tokens";
import type { ExamHistoryItem } from "../api/examResultApi";

export function ExamResultCard({ item }: { item: ExamHistoryItem }) {
  const submitted = new Date(item.submittedAt);
  const date = Number.isNaN(submitted.getTime()) ? item.submittedAt : submitted.toLocaleString("vi-VN");
  const section = item.section === "READING" ? "Reading" : "Listening";
  const label = item.partNumber != null ? `${section} · Part ${item.partNumber}` : section;
  return <Pressable accessibilityRole="button" onPress={() => router.push({
    pathname: "/study/history/[resultId]", params: { resultId: String(item.resultId) },
  })} style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.title}>ETS {item.year} · Test {item.testNumber} · {label}</Text>
      <Text style={styles.link}>Xem lại ›</Text>
    </View>
    <Text style={styles.body}>Đúng {item.score}/{item.totalQuestions} câu · Đã trả lời {item.answeredQuestions} câu</Text>
    <Text style={styles.date}>Nộp lúc {date}</Text>
  </Pressable>;
}

const c = homeDesign.colors;
const styles = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 15, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: c.text, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  link: { color: c.link, fontSize: 13 },
  body: { color: c.text, fontSize: 13 },
  date: { color: c.secondary, fontSize: 12 },
});
