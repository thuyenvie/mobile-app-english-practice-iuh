import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/lib/auth/useSession";
import { getStudyPlan, updateStudyReminder } from "../../study/api/studyPlanApi";
import { registerStudyPushToken } from "../../notifications/api/pushNotificationApi";
import { createReminderController } from "../reminder/reminderController";
import { isReminderInQuietHours } from "../reminder/reminderSchedule";
import { QuietHoursFields } from "../reminder/QuietHoursFields";
import type { SettingsEntryProps } from "../types";
import { useFormInputFocus } from "@/components/ui/FormScrollView";

export function SET03Entry({ theme, authenticated }: SettingsEntryProps) {
  const session = useSession();
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(false);
  const quietStartInput = useRef<TextInput>(null);
  const focusInput = useFormInputFocus();
  const controller = useMemo(() => createReminderController(session, {
    load: () => getStudyPlan(session.generation), patch: updateStudyReminder,
    register: generation => registerStudyPushToken({ generation, preserveTokenOnDenied: true }),
  }), [session]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const account = authenticated && session.status === "authenticated";
  const displayedSchedule = editing ? state.draft : state.plan;
  const quietConflict = displayedSchedule?.reminderEnabled && isReminderInQuietHours(
    displayedSchedule.reminderTime, displayedSchedule.quietStart, displayedSchedule.quietEnd,
  );
  useEffect(() => {
    controller.activate();
    if (account) void controller.load();
    return () => controller.dispose();
  }, [account, controller]);
  const action = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button"
    disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={{ minHeight: 48, justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: theme.accent }}>{label}</Text></Pressable>;
  const input = (label: string, field: "reminderTime") => <View>
    <Text style={{ color: theme.text }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={state.draft[field]} editable={!state.busy} maxLength={5}
      onFocus={focusInput} autoCapitalize="none"
      returnKeyType="next" submitBehavior="submit"
      onSubmitEditing={() => quietStartInput.current?.focus()}
      placeholder="Ví dụ: 20:00" placeholderTextColor={theme.muted} autoCorrect={false}
      onChangeText={value => controller.edit({ [field]: value })}
      style={{ minHeight: 48, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontSize: 16, color: theme.text }} />
  </View>;
  const device = { unregistered: "Chưa kiểm tra quyền và đăng ký của thiết bị trong phiên này.", registered: "Thiết bị đã đăng ký; chưa xác nhận thông báo đã được giao.",
    "permission-denied": "Thiết bị chưa cấp quyền thông báo. Cấp quyền trong cài đặt hệ thống rồi thử lại.",
    unsupported: "Nền tảng này chưa hỗ trợ nhận push.", error: "Chưa đăng ký được thiết bị. Kiểm tra kết nối rồi thử lại." };
  return <View style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 12, padding: 16, gap: 10 }}>
    <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>Nhắc học theo kế hoạch</Text>
    {!account ? <>
      <Text style={{ color: theme.muted }}>Đăng nhập để nhận nhắc học từ máy chủ theo kế hoạch của tài khoản.</Text>
      {action("Đăng nhập để cài nhắc học", () => router.push("/auth/login"))}
    </> : <>
      {state.phase === "loading" || state.phase === "idle" ? <Text style={{ color: theme.muted }}>Đang tải kế hoạch…</Text> : null}
      {state.phase === "missing" ? <>
        <Text style={{ color: theme.muted }}>Bạn chưa có kế hoạch học.</Text>
        {action("Tạo kế hoạch học", () => router.push("/study-plan/setup"))}
      </> : null}
      {state.phase === "ready" && state.plan ? <>
        <Text style={{ color: theme.text }}>{state.plan.reminderEnabled ? "Đang bật" : "Đang tắt"} · {state.plan.reminderDays.map(day => day === 7 ? "CN" : `T${day + 1}`).join(", ")}</Text>
        <Text style={{ color: theme.muted }}>Giờ nhắc đã lưu: {state.plan.reminderTime?.slice(0, 5) ?? "chưa đặt"} (theo múi giờ kế hoạch).</Text>
        {quietConflict ? <Text style={{ color: theme.warning }} accessibilityRole="alert">
          Giờ nhắc nằm trong khoảng yên lặng nên sẽ không gửi thông báo. Hãy đổi giờ nhắc hoặc khoảng yên lặng.
        </Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: editing, disabled: state.busy }} disabled={state.busy}
          onPress={() => setEditing(value => !value)} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.accent }}>{editing ? "Thu gọn chỉnh sửa" : "Chỉnh sửa nhắc học"}</Text>
        </Pressable>
        {editing ? <>
        <Text style={{ color: theme.text }}>Nhắc học hằng ngày · Có hiệu lực sau khi lưu</Text>
        <Switch accessibilityLabel="Nhắc học hằng ngày" value={state.draft.reminderEnabled} disabled={state.busy}
          onValueChange={value => controller.edit({ reminderEnabled: value })} trackColor={{ true: theme.accent, false: theme.border }} />
        {input("Giờ nhắc học", "reminderTime")}
        <QuietHoursFields start={state.draft.quietStart} end={state.draft.quietEnd} theme={theme}
          onStartChange={value => controller.edit({ quietStart: value })}
          onEndChange={value => controller.edit({ quietEnd: value })}
          startInputRef={quietStartInput} disabled={state.busy} />
        <Text style={{ color: theme.muted }}>Tắt nhắc học vẫn giữ nhắc từ vựng.</Text>
        {action(state.busy ? "Đang xử lý…" : "Lưu nhắc học", () => void controller.save(), state.busy)}
        </> : null}
        {state.saved ? <Text style={{ color: theme.success }} accessibilityLiveRegion="polite">Đã lưu cấu hình trên máy chủ.</Text> : null}
        <Text style={{ color: theme.muted }}>{device[state.device]}</Text>
        {!state.plan.reminderEnabled ? <Text style={{ color: theme.muted }}>
          Nhắc học hằng ngày đang tắt. Bạn vẫn có thể đăng ký thiết bị để nhận nhắc từ vựng; thao tác này không tự bật lịch nhắc học.
        </Text> : null}
        {action("Cho phép nhận thông báo", () => void controller.register(), state.busy)}
      </> : null}
      {state.error ? <Text style={{ color: theme.error }} accessibilityRole="alert">{state.error}</Text> : null}
      {action("Kiểm tra lại lịch nhắc", () => void controller.load(), state.busy)}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(value => !value)} style={{ minHeight: 48, justifyContent: "center" }}>
        <Text style={{ color: theme.accent }}>{details ? "Ẩn chi tiết nhắc học" : "Chi tiết nhắc học"}</Text>
      </Pressable>
      {details ? <>
        {state.plan ? <Text style={{ color: theme.muted }}>Múi giờ kế hoạch: {state.plan.timezone}</Text> : null}
        <Text style={{ color: theme.muted }}>Cho phép nhận thông báo sẽ cấp quyền và đăng ký máy này cho tài khoản đang đăng nhập.</Text>
        <Text style={{ color: theme.muted }}>Kiểm tra lại chỉ đọc lịch đã lưu, không gửi thông báo thử. Lưu lịch và cấp quyền nhận thông báo là hai bước riêng. Thông báo còn phụ thuộc lịch gửi, quyền và kết nối thiết bị.</Text>
      </> : null}
    </>}
  </View>;
}
