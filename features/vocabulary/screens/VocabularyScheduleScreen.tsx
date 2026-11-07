import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useEffect, useRef, useState } from "react";

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth/useSession";
import { getSessionSnapshot } from "@/lib/auth/sessionStore";

import { StudyScaffold } from "../../study/components/StudyScaffold";
import { getExamErrorMessage } from "../../study/api/examApi";
import { getStudyPlan, type StudyPlan } from "../../study/api/studyPlanApi";
import { registerStudyPushToken } from "../../notifications/api/pushNotificationApi";
import { createVocabularyTask, getVocabularyTask, updateVocabularyTask, type VocabularyTaskInput } from "../api/vocabularyTaskApi";
import { localDateValue, localTimeValue, scheduleInstant } from "../utils/scheduleTime";


export default function VocabularyScheduleScreen() {
  const { c, styles } = useThemedStyles();
  const params = useLocalSearchParams<{ ids?: string; words?: string; taskId?: string }>();
  const account = useSession();
  const insets = useSafeAreaInsets();
  const initial = useRef(new Date(Date.now() + 10 * 60_000));
  const requestId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
  const [ids, setIds] = useState<string[]>([]);
  const [summary, setSummary] = useState(params.words ?? "");
  const [date, setDate] = useState(localDateValue(initial.current));
  const [time, setTime] = useState(localTimeValue(initial.current));
  const [minutes, setMinutes] = useState("10");
  const [remind, setRemind] = useState(true);
  const [before, setBefore] = useState(5);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const [retry, setRetry] = useState(0);
  const taskId = Number(params.taskId);
  const editing = !!params.taskId;
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setReady(false); setPlanLoaded(false);
    void (async () => {
      const currentPlan = await getStudyPlan();
      if (!active) return;
      setPlan(currentPlan); setPlanLoaded(true);
      if (editing) {
        if (!Number.isSafeInteger(taskId) || taskId < 1) throw new Error("Lịch ôn không hợp lệ.");
        const detail = await getVocabularyTask(taskId);
        if (!active) return;
        if (detail.task.status !== "PENDING") throw new Error("Lịch ôn đã hoàn thành hoặc đã hủy.");
        setIds(detail.vocabulary.map(word => word.id));
        setSummary(detail.vocabulary.slice(0, 6).map(word => word.word).join(" · "));
        const at = new Date(detail.task.scheduledAt ?? "");
        setDate(localDateValue(at)); setTime(localTimeValue(at));
        setMinutes(String(detail.task.estimatedMinutes));
        setRemind(!!detail.task.reminderAt); setBefore(detail.task.reminderMinutesBefore ?? 5);
      } else {
        const selected = (params.ids ?? "").split(",").filter(Boolean);
        if (!selected.length || selected.length > 100 || new Set(selected).size !== selected.length) throw new Error("Chọn từ 1 đến 100 từ để lên lịch.");
        setIds(selected);
      }
      setReady(true);
    })().catch((cause: unknown) => { if (active) setError(getExamErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.ids, editing, taskId, account.generation, retry]);
  const back = () => router.canGoBack() ? router.back() : router.replace("/(tabs)/vocabulary");
  const save = async () => {
    if (savingRef.current || !plan || !ids.length || !ready) return;
    const generation = account.generation;
    const at = scheduleInstant(date, time);
    const amount = Number(minutes);
    if (!at || Date.parse(at) <= Date.now() || (remind && Date.parse(at) - before * 60_000 <= Date.now())) {
      setError("Chọn ngày giờ hợp lệ trong tương lai; thời điểm nhắc cũng phải ở tương lai."); return;
    }
    if (!Number.isInteger(amount) || amount < 5 || amount > 240) { setError("Thời lượng từ 5 đến 240 phút."); return; }
    savingRef.current = true; setSaving(true); setError("");
    try {
      const input: VocabularyTaskInput = { requestId: requestId.current, vocabularyIds: ids, scheduledAt: at, estimatedMinutes: amount, reminderEnabled: remind, reminderMinutesBefore: before };
      if (editing) await updateVocabularyTask(taskId, input); else await createVocabularyTask(input);
      if (getSessionSnapshot().generation !== generation) return;
      let notice = "Lịch ôn đã xuất hiện ở Trang chủ. Các từ đã chọn được giữ riêng cho buổi ôn.";
      if (remind) {
        try {
          const result = await registerStudyPushToken();
          if (result === "permission-denied") notice += " Bạn chưa cấp quyền thông báo. Hãy bật quyền trong Cài đặt của ứng dụng; lịch vẫn được lưu.";
          else if (result === "unsupported") notice += " Push chỉ hỗ trợ ứng dụng native; lịch vẫn được lưu trên bản web.";
        } catch { notice += " Chưa đăng ký được thiết bị nhận thông báo. Hãy kiểm tra quyền và thử lưu lịch lại."; }
      }
      if (getSessionSnapshot().generation === generation)
        Alert.alert("Đã lưu lịch ôn", notice, [{ text: "Về Trang chủ", onPress: () => router.replace("/(tabs)/home") }]);
    } catch (cause: unknown) { if (getSessionSnapshot().generation === generation) setError(getExamErrorMessage(cause)); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <StudyScaffold><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
    <Pressable onPress={back} disabled={saving} accessibilityRole="button"><Text style={styles.link}>‹ Quay lại</Text></Pressable>
    <Text style={styles.heading}>{editing ? "Sửa lịch ôn" : "Lên lịch ôn từ"}</Text>
    {loading ? <ActivityIndicator color={c.tabActive} /> : <>
      <View style={styles.card}><Text style={styles.title}>Ôn {ids.length} từ · Flashcard</Text><Text style={styles.muted}>{summary}</Text><Text style={styles.muted}>Tập từ được giữ riêng, không tự thêm từ mới vào buổi ôn.</Text></View>
      {!plan && planLoaded ? <View style={styles.card}><Text style={styles.text}>Hãy thiết lập mục tiêu học trước để dùng lịch và phiên học.</Text><Pressable onPress={() => router.push("/study-plan/setup")}><Text style={styles.link}>Thiết lập mục tiêu</Text></Pressable><Pressable onPress={() => setRetry(v => v + 1)}><Text style={styles.link}>Đã thiết lập · Tải lại</Text></Pressable></View> : !plan ? <Pressable onPress={() => setRetry(v => v + 1)}><Text style={styles.link}>Thử tải lại kế hoạch</Text></Pressable> : <>
        <Text style={styles.muted}>Nhập theo giờ thiết bị: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Lịch học lưu theo múi giờ {plan.timezone}.</Text>
        <Field label="Ngày học (YYYY-MM-DD)" value={date} onChange={setDate} disabled={saving} />
        <Field label="Giờ bắt đầu (HH:mm)" value={time} onChange={setTime} disabled={saving} />
        <Field label="Thời lượng dự kiến (phút)" value={minutes} onChange={setMinutes} disabled={saving} numeric />
        <View style={styles.row}><Text style={styles.title}>Nhắc buổi ôn này</Text><Switch value={remind} onValueChange={setRemind} disabled={saving} trackColor={{ true: c.tabActive }} /></View>
        {remind ? <View style={styles.row}>{[0, 5, 10].map(value => <Pressable key={value} disabled={saving} accessibilityRole="button" accessibilityState={{ selected: before === value }} onPress={() => setBefore(value)} style={[styles.chip, before === value && styles.selected]}><Text style={before === value ? styles.darkText : styles.text}>{value === 0 ? "Đúng giờ" : `Trước ${value} phút`}</Text></Pressable>)}</View> : null}
        <Text style={styles.muted}>{plan.quietStart && plan.quietEnd ? `Giờ yên lặng: ${plan.quietStart.slice(0, 5)}–${plan.quietEnd.slice(0, 5)}. ` : "Chưa đặt giờ yên lặng. "}Ngày ôn riêng có thể khác ngày học mặc định.</Text>
        <Pressable style={[styles.button, (saving || !ids.length || !ready) && styles.disabled]} disabled={saving || !ids.length || !ready} onPress={() => void save()} accessibilityRole="button">{saving ? <ActivityIndicator color={c.onSelection} /> : <Text style={styles.darkText}>Lưu lịch ôn</Text>}</Pressable>
      </>}
    </>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </ScrollView></StudyScaffold>;
}
function Field({ label, value, onChange, numeric, disabled }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; disabled: boolean }) {
  const { resolvedMode } = useAppTheme();
  const { styles } = useThemedStyles();
  return <View style={{ gap: 7 }}><Text style={styles.text}>{label}</Text><TextInput keyboardAppearance={resolvedMode} accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} autoCapitalize="none" keyboardType={numeric ? "number-pad" : "default"} style={styles.input} /></View>;
}


function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;
    const c = homeDesign.colors;
    const styles = StyleSheet.create({
      content: { padding: 18, gap: 17 }, heading: { color: c.text, fontSize: 26, fontWeight: "800" }, title: { color: c.text, fontSize: 17, fontWeight: "700", flexShrink: 1 },
      text: { color: c.text, fontSize: 14 }, muted: { color: c.secondary, fontSize: 13, lineHeight: 20 }, link: { color: c.link, paddingVertical: 10 },
      card: { backgroundColor: c.surface, padding: 17, borderRadius: 17, borderWidth: 1, borderColor: c.border, gap: 8 },
      input: { color: c.text, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, minHeight: 48, padding: 12, fontSize: 16 },
      row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
      chip: { padding: 12, borderRadius: 18, backgroundColor: c.surfaceRaised }, selected: { backgroundColor: c.tabActive },
      button: { minHeight: 50, backgroundColor: c.tabActive, borderRadius: 14, alignItems: "center", justifyContent: "center", padding: 12 },
      darkText: { color: c.onSelection, fontSize: 14, fontWeight: "700" }, disabled: { opacity: .5 }, error: { color: c.inProgress, lineHeight: 21 },
    });
    return { homeDesign, c, styles };
  }, [appTheme]);
}
