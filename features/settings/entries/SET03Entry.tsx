import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/lib/auth/useSession";
import { getStudyPlan, updateStudyReminder } from "../../study/api/studyPlanApi";
import { registerStudyPushToken } from "../../notifications/api/pushNotificationApi";
import { createReminderController, type ReminderDraft } from "../reminder/reminderController";
import type { SettingsEntryProps } from "../types";

export function SET03Entry({ theme, authenticated }: SettingsEntryProps) {
  const session = useSession();
  const controller = useMemo(() => createReminderController(session, {
    load: () => getStudyPlan(session.generation), patch: updateStudyReminder,
    register: generation => registerStudyPushToken({ generation, preserveTokenOnDenied: true }),
  }), [session]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const account = authenticated && session.status === "authenticated";
  useEffect(() => {
    controller.activate();
    if (account) void controller.load();
    return () => controller.dispose();
  }, [account, controller]);
  const action = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button"
    disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={{ minHeight: 44, justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: theme.accent }}>{label}</Text></Pressable>;
  const input = (label: string, field: keyof Omit<ReminderDraft, "reminderEnabled">) => <View>
    <Text style={{ color: theme.text }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={state.draft[field]} editable={!state.busy} maxLength={5}
      placeholder="HH:mm" placeholderTextColor={theme.muted} autoCorrect={false}
      onChangeText={value => controller.edit({ [field]: value })}
      style={{ minHeight: 44, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, color: theme.text }} />
  </View>;
  const device = { unregistered: "Chưa kiểm tra quyền và đăng ký của thiết bị trong phiên này.", registered: "Thiết bị đã đăng ký; chưa xác nhận thông báo đã được giao.",
    "permission-denied": "Thiết bị chưa cấp quyền thông báo. Cấp quyền trong cài đặt hệ thống rồi thử lại.",
    unsupported: "Nền tảng này chưa hỗ trợ nhận push.", error: "Chưa đăng ký được thiết bị. Kiểm tra kết nối rồi thử lại." };
  return <View style={{ borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 12, padding: 16, gap: 10 }}>
    <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>Nhắc nhở học tập</Text>
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
        <Text style={{ color: theme.muted }}>Múi giờ kế hoạch: {state.plan.timezone}</Text>
        <Text style={{ color: theme.muted }}>Ngày theo kế hoạch (1 = Thứ hai, 7 = Chủ nhật): {state.plan.reminderDays.join(", ")}</Text>
        <Text style={{ color: theme.text }}>Nhắc học hằng ngày</Text>
        <Text style={{ color: theme.muted }}>Máy chủ: {state.plan.reminderEnabled ? "đang bật" : "đang tắt"}. Thay đổi có hiệu lực sau khi lưu.</Text>
        <Text style={{ color: theme.muted }}>Giờ nhắc đã lưu: {state.plan.reminderTime?.slice(0, 5) ?? "chưa đặt"} (theo múi giờ kế hoạch).</Text>
        <Switch accessibilityLabel="Nhắc học hằng ngày" value={state.draft.reminderEnabled} disabled={state.busy}
          onValueChange={value => controller.edit({ reminderEnabled: value })} trackColor={{ true: theme.accent, false: theme.border }} />
        {input("Giờ nhắc học", "reminderTime")}
        {input("Yên lặng từ", "quietStart")}
        {input("Yên lặng đến", "quietEnd")}
        <Text style={{ color: theme.muted }}>Để trống cả hai giờ yên lặng để tắt khoảng yên lặng. Tắt nhắc hằng ngày vẫn giữ giờ và nhắc từ vựng.</Text>
        {action(state.busy ? "Đang xử lý…" : "Lưu nhắc học", () => void controller.save(), state.busy)}
        {state.saved ? <Text style={{ color: theme.success }} accessibilityLiveRegion="polite">Đã lưu cấu hình trên máy chủ.</Text> : null}
        <Text style={{ color: theme.muted }}>{device[state.device]}</Text>
        {action("Cho phép nhận thông báo", () => void controller.register(), state.busy || !state.plan.reminderEnabled)}
        <Text style={{ color: theme.muted }}>Cấp quyền thông báo và đăng ký máy này cho tài khoản đang đăng nhập.</Text>
      </> : null}
      {state.error ? <Text style={{ color: theme.error }} accessibilityRole="alert">{state.error}</Text> : null}
      {action("Kiểm tra lại lịch nhắc", () => void controller.load(), state.busy)}
      <Text style={{ color: theme.muted }}>Đọc lại lịch đã lưu; không gửi thông báo thử.</Text>
      <Text style={{ color: theme.muted }}>Lưu kế hoạch và đăng ký thiết bị là hai bước riêng. Máy chủ quyết định lịch gửi; thông báo còn phụ thuộc quyền và kết nối thiết bị.</Text>
    </>}
  </View>;
}
