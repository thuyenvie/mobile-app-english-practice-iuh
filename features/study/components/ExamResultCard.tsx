import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ExamHistoryItem } from "../api/examResultApi";

export function ExamResultCard({ item }: { item: ExamHistoryItem }) {
  const { styles } = useThemedStyles();
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




function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;
    const c = homeDesign.colors;
    const styles = StyleSheet.create({
      card: { backgroundColor: c.surface, borderRadius: 14, padding: 15, gap: 8 },
      row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
      title: { color: c.text, fontSize: 15, fontWeight: "700", flexShrink: 1 },
      link: { color: c.link, fontSize: 13 },
      body: { color: c.text, fontSize: 13 },
      date: { color: c.secondary, fontSize: 12 },
    });
    return { homeDesign, c, styles };
  }, [appTheme]);
}
