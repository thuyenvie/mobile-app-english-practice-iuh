import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { homeDesign } from "@/theme/tokens";
import { useSession } from "@/lib/auth/useSession";
import { StudyScaffold } from "../../study/components/StudyScaffold";
import { getExamErrorMessage } from "../../study/api/examApi";
import { useStudyElapsed, useStudySession, formatStudyTime } from "../../study/session/StudySessionProvider";
import { getVocabularyTask, type VocabularyTaskDetail } from "../api/vocabularyTaskApi";
import { VocabularyFlashcard } from "../components/VocabularyFlashcard";
import { useVocabularyPronunciation } from "../hooks/useVocabularyPronunciation";

const c = homeDesign.colors;
export default function VocabularyTaskReviewScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const id = Number(taskId);
  const account = useSession();
  const session = useStudySession();
  const elapsed = useStudyElapsed();
  const pronunciation = useVocabularyPronunciation();
  const [detail, setDetail] = useState<VocabularyTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError("");
    if (!Number.isSafeInteger(id) || id < 1) { setError("Lịch ôn không hợp lệ."); setLoading(false); return; }
    getVocabularyTask(id).then(value => { if (active) setDetail(value); })
      .catch((cause: unknown) => { if (active) setError(getExamErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; pronunciation.stop(); };
  }, [id, account.generation, retry, pronunciation.stop]));
  useEffect(() => { setDetail(null); setIndex(0); setRevealed(false); }, [id, account.generation]);
  useEffect(() => { pronunciation.stop(); }, [index, pronunciation.stop]);
  const active = session.current?.taskId === id && session.current.status !== "ENDED";
  const paused = active && session.current?.status === "PAUSED";
  const act = async (operation: () => Promise<void>) => {
    setError("");
    try { await operation(); } catch (cause: unknown) { setError(getExamErrorMessage(cause)); }
  };
  const finish = (complete: boolean) => void act(async () => {
    // Chi ket thuc phien cua bo tu dang xem, khong dong nham task khac.
    if (!active) return;
    pronunciation.stop();
    await session.end(complete);
    setConfirm(false);
    router.replace("/(tabs)/home");
  });
  return <StudyScaffold><View style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")}><Text style={styles.link}>‹ Trang chủ</Text></Pressable><Text style={styles.title}>{detail?.task.title ?? "Buổi ôn từ vựng"}</Text><Text style={styles.muted}>{active ? `${paused ? "Tạm dừng" : "Đang ôn"} · ${formatStudyTime(elapsed)}` : "Đúng bộ từ đã lưu cho buổi ôn này"}</Text></View>
    {loading ? <ActivityIndicator color={c.tabActive} /> : error && !detail ? <View style={styles.header}><Text style={styles.warning}>{error}</Text><Action label="Thử lại" onPress={() => setRetry(v => v + 1)} /></View> : detail?.task.status === "SKIPPED" ? <Text style={styles.warning}>Lịch ôn đã hủy.</Text> : !active && detail?.task.status !== "COMPLETED" ? <View style={styles.header}>
      <Text style={styles.muted}>{detail?.vocabulary.map(word => word.word).join(" · ")}</Text>
      <Text style={styles.muted}>Bấm bắt đầu để ghi nhận thời gian ôn.</Text>
      {detail?.task.status === "PENDING" ? <Action label="Bắt đầu ôn" disabled={session.busy} onPress={() => void act(() => session.start(id))} /> : null}
      {error ? <Text style={styles.warning}>{error}</Text> : null}
    </View> : <>
      {error ? <Text style={styles.warning}>{error}</Text> : null}
      {paused ? <View style={styles.header}><Text style={styles.muted}>Phiên đang nghỉ. Tiếp tục để ôn và tính thời gian.</Text><Action label="Tiếp tục" disabled={session.busy} onPress={() => void act(session.resume)} /></View> : detail?.vocabulary[index] ? <VocabularyFlashcard
        item={detail.vocabulary[index]} index={index} total={detail.vocabulary.length} revealed={revealed}
        canGoPrevious={index > 0} canGoNext={index < detail.vocabulary.length - 1} loadingNext={false} hasMore={false}
        onToggleAnswer={() => setRevealed(value => !value)} onPrevious={() => { setIndex(value => value - 1); setRevealed(false); }} onNext={() => { setIndex(value => value + 1); setRevealed(false); }}
        pronunciation={{ activeUrl: pronunciation.activeUrl, activeWord: pronunciation.activeWord, loading: pronunciation.loading, playing: pronunciation.playing, error: pronunciation.error, onPress: pronunciation.play }} /> : null}
      <View style={styles.controls}>{active ? <><Action label={paused ? "Tiếp tục" : "Tạm dừng"} disabled={session.busy} onPress={() => { pronunciation.stop(); void act(paused ? session.resume : session.pause); }} /><Action label="Kết thúc" disabled={session.busy} onPress={() => { pronunciation.stop(); setConfirm(true); }} /></> : <Action label="Đã hoàn thành · Về Trang chủ" onPress={() => router.replace("/(tabs)/home")} />}</View>
    </>}
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => { if (!session.busy) setConfirm(false); }}><View style={styles.overlay}><View style={styles.dialog}><Text style={styles.title}>Kết thúc buổi ôn?</Text><Text style={styles.muted}>Hoàn thành buổi ôn không đồng nghĩa đã thuộc vĩnh viễn tất cả từ.</Text><Action label="Đã hoàn thành" disabled={session.busy} onPress={() => finish(true)} /><Action label="Học tiếp sau" disabled={session.busy} onPress={() => finish(false)} /><Action label="Quay lại" disabled={session.busy} onPress={() => setConfirm(false)} />{error ? <Text style={styles.warning}>{error}</Text> : null}</View></View></Modal>
  </View></StudyScaffold>;
}
function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" style={[styles.button, disabled && { opacity: .5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { padding: 16, gap: 9 }, title: { color: c.text, fontSize: 20, fontWeight: "700" }, link: { color: c.link, paddingVertical: 8 },
  muted: { color: c.secondary, fontSize: 13, lineHeight: 20 }, warning: { color: c.inProgress, paddingHorizontal: 12 },
  controls: { flexDirection: "row", justifyContent: "space-around", padding: 12, gap: 10 }, button: { backgroundColor: c.surfaceRaised, padding: 13, borderRadius: 12, minHeight: 46, justifyContent: "center", alignItems: "center" },
  buttonText: { color: c.link, fontWeight: "700" }, overlay: { flex: 1, backgroundColor: "#000b", justifyContent: "center", padding: 20 }, dialog: { backgroundColor: c.surface, borderRadius: 18, padding: 20, gap: 13 },
});
