import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSession } from "@/lib/auth/useSession";
import { homeDesign } from "@/theme/tokens";
import { listExamDrafts } from "../utils/examDrafts";

const colors = homeDesign.colors;

export function ContinueExamCard({ home = false }: { home?: boolean }) {
  const { subject, status, generation } = useSession();
  const [drafts, setDrafts] = useState<Awaited<ReturnType<typeof listExamDrafts>>>([]);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const limit = home ? 3 : 4;
  useFocusEffect(useCallback(() => {
    setDrafts([]);
    setExpanded(false);
    if (status !== "authenticated" || !subject) return;
    let active = true;
    setMessage("Đang tải bản nháp…");
    void listExamDrafts(subject).then(items => {
      if (!active) return;
      setDrafts(items);
      setMessage(items.length ? "" : "Chưa có bài thi được lưu nháp.");
    }).catch(() => {
      if (active) setMessage("Không đọc được bản nháp trên thiết bị.");
    });
    return () => { active = false; };
  }, [subject, status, generation]));

  if (home && (status !== "authenticated" || !drafts.length)) return null;
  return <View style={[styles.card, home && styles.home]}>
    <Text style={styles.title}>Tiếp tục bài đang làm</Text>
    {status === "guest" ? <Text style={styles.detail}>Đăng nhập để lưu và tiếp tục bài làm.</Text> :
      message ? <Text style={styles.detail}>{message}</Text> : null}
    {(expanded ? drafts : drafts.slice(0, limit)).map(draft => (
      <Pressable key={draft.key} accessibilityRole="button" style={styles.row} onPress={() => router.push(draft.href)}>
        <View style={styles.body}>
          <Text style={styles.title}>ETS {draft.href.params.year} · Test {draft.href.params.testNumber} · {draft.label}</Text>
          <Text style={styles.detail}>Đã trả lời {draft.count} câu</Text>
        </View>
        <Text style={styles.link}>Tiếp tục ›</Text>
      </Pressable>
    ))}
    {drafts.length > limit ? <Pressable
      accessibilityRole="button"
      accessibilityState={home ? undefined : { expanded }}
      onPress={() => {
        if (home) router.navigate("/(tabs)/study");
        else setExpanded(value => !value);
      }}
    >
      <Text style={styles.link}>{expanded ? "Thu gọn" : `Xem tất cả (${drafts.length})`}</Text>
    </Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 10, marginBottom: 24 },
  home: { marginHorizontal: 16 },
  title: { color: colors.text, fontWeight: "700", fontSize: 15 },
  detail: { color: colors.secondary, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 6 },
  body: { flex: 1, gap: 4 },
  link: { color: colors.link, fontWeight: "700" },
});
