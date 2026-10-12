import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { homeDesign } from "@/theme/tokens";
import { getExamErrorMessage } from "../api/examApi";
import { getListeningHistory, type ListeningHistoryItem } from "../api/listeningApi";
import { ListeningResultCard } from "../components/ListeningResultCard";
import { StudyScaffold } from "../components/StudyScaffold";

export default function ListeningHistoryScreen() {
  const [items, setItems] = useState<ListeningHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const loadingMoreRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError("");
    setItems([]);
    setPage(0);
    setTotalPages(0);
    getListeningHistory().then(
      (data) => { if (active) { setItems(data.items); setPage(data.page); setTotalPages(data.totalPages); setLoading(false); } },
      (cause: unknown) => { if (active) { setError(getExamErrorMessage(cause)); setLoading(false); } },
    );
    return () => { active = false; };
  }, [retry]));

  const loadMore = async () => {
    if (loadingMoreRef.current || page + 1 >= totalPages) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError("");
    try {
      const data = await getListeningHistory(page + 1);
      setItems(current => [...current, ...data.items]);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (cause) { setError(getExamErrorMessage(cause)); }
    finally { loadingMoreRef.current = false; setLoadingMore(false); }
  };

  return <StudyScaffold>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/study")}>
        <Text style={styles.link}>‹ Quay lại</Text>
      </Pressable>
      <Text style={styles.title}>Lịch sử Listening</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator /> : items.length ? items.map(item => <ListeningResultCard key={item.resultId} item={item} />)
        : !error ? <Text style={styles.muted}>Bạn chưa nộp bài Listening nào.</Text> : null}
      {error ? <><Text style={styles.warning}>{error}</Text>
        <Pressable onPress={() => items.length ? void loadMore() : setRetry(value => value + 1)}><Text style={styles.link}>Thử lại</Text></Pressable></> : null}
      {!loading && !error && page + 1 < totalPages ? <Pressable disabled={loadingMore} onPress={() => void loadMore()}>
        <Text style={styles.link}>{loadingMore ? "Đang tải..." : "Xem thêm kết quả"}</Text>
      </Pressable> : null}
    </ScrollView>
  </StudyScaffold>;
}

const c = homeDesign.colors;
const styles = StyleSheet.create({
  header: { padding: 16, gap: 8, borderBottomWidth: 1, borderColor: c.border },
  title: { color: c.text, fontSize: 21, fontWeight: "700" },
  link: { color: c.link, fontSize: 15, paddingVertical: 8 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  muted: { color: c.secondary, fontSize: 14 },
  warning: { color: c.inProgress, fontSize: 14 },
});
