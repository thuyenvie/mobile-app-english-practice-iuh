import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useEffect, useState } from "react";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";


import { useSession } from "@/lib/auth/useSession";
import { getExamErrorMessage } from "../api/examApi";
import { getStudyPlan, saveStudyPlan } from "../api/studyPlanApi";
import { registerStudyPushToken } from "../../notifications/api/pushNotificationApi";
import { StudyScaffold } from "../components/StudyScaffold";
import { FormScrollView, useFormInputFocus } from "@/components/ui/FormScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";


const weekDays = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 7, label: "CN" },
];

export default function StudyPlanSetupScreen() {
  const { themeColor, c, styles } = useThemedStyles();
  const session = useSession();
  const insets = useSafeAreaInsets();
  const [targetScore, setTargetScore] = useState("700");
  const [currentScore, setCurrentScore] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState("20");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session.status !== "authenticated") {
      setLoading(false);
      return;
    }
    let active = true;
    getStudyPlan()
      .then((plan) => {
        if (!active || !plan) return;
        setTargetScore(String(plan.targetScore));
        setCurrentScore(
          plan.currentScore == null ? "" : String(plan.currentScore)
        );
        setTargetDate(plan.targetDate ?? "");
        setDailyMinutes(String(plan.dailyMinutes));
        setReminderEnabled(plan.reminderEnabled);
        setReminderTime(plan.reminderTime?.slice(0, 5) ?? "20:00");
        setReminderDays(
          plan.reminderDays.length ? plan.reminderDays : [1, 2, 3, 4, 5]
        );
        setQuietStart(plan.quietStart?.slice(0, 5) ?? "22:00");
        setQuietEnd(plan.quietEnd?.slice(0, 5) ?? "07:00");
      })
      .catch((cause: unknown) => {
        if (active) setError(getExamErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.status]);

  const toggleDay = (day: number) =>
    setReminderDays((selected) =>
      selected.includes(day)
        ? selected.filter((item) => item !== day)
        : [...selected, day].sort()
    );

  const submit = async () => {
    setError("");
    const score = Number(targetScore);
    const current = currentScore ? Number(currentScore) : null;
    const minutes = Number(dailyMinutes);
    if (!Number.isInteger(score) || score < 10 || score > 990) {
      setError("Điểm mục tiêu phải từ 10 đến 990.");
      return;
    }
    if (
      current !== null &&
      (!Number.isInteger(current) || current < 10 || current > 990)
    ) {
      setError("Điểm hiện tại phải từ 10 đến 990.");
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) {
      setError("Thời lượng học phải từ 5 đến 240 phút mỗi ngày.");
      return;
    }
    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setError("Ngày mục tiêu nhập theo dạng YYYY-MM-DD.");
      return;
    }
    if (
      reminderEnabled &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime) ||
        reminderDays.length === 0)
    ) {
      setError("Chọn giờ nhắc hợp lệ và ít nhất một ngày trong tuần.");
      return;
    }
    if (
      reminderEnabled &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(quietStart) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(quietEnd))
    ) {
      setError("Giờ yên lặng phải nhập theo dạng HH:mm.");
      return;
    }

    if (reminderDays.length === 0) {
      setError("Chọn ít nhất một ngày học trong tuần.");
      return;
    }

    setSaving(true);
    try {
      await saveStudyPlan({
        targetScore: score,
        currentScore: current,
        targetDate: targetDate || null,
        dailyMinutes: minutes,
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "Asia/Ho_Chi_Minh",
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : null,
        reminderDays,
        quietStart: reminderEnabled ? quietStart : null,
        quietEnd: reminderEnabled ? quietEnd : null,
      });

      let reminderNotice = "";
      if (reminderEnabled) {
        try {
          const registration = await registerStudyPushToken();
          if (registration === "permission-denied") {
            reminderNotice =
              "Kế hoạch đã lưu, nhưng bạn chưa cấp quyền thông báo. Hãy bật quyền thông báo cho ứng dụng trong Cài đặt để nhận nhắc lịch.";
          } else if (registration === "unsupported") {
            reminderNotice =
              "Kế hoạch đã lưu. Push notification chỉ chạy trên ứng dụng iOS/Android, chưa hỗ trợ bản web.";
          }
        } catch {
          reminderNotice =
            "Kế hoạch đã lưu, nhưng chưa đăng ký được thiết bị nhận thông báo. Kiểm tra kết nối Gateway rồi lưu lại kế hoạch.";
        }
      }

      if (reminderNotice) {
        Alert.alert("Đã lưu kế hoạch học", reminderNotice, [
          { text: "Đã hiểu", onPress: () => router.replace("/(tabs)/study") },
        ]);
      } else {
        router.replace("/(tabs)/study");
      }
    } catch (cause: unknown) {
      setError(getExamErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudyScaffold>
        <FormScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <Pressable
            style={styles.back}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={23} color={c.text} />
            <Text style={styles.backText}>Học tập</Text>
          </Pressable>
          <Text style={styles.title}>Mục tiêu học tập</Text>
          <Text style={styles.subtitle}>
            Chọn mục tiêu phù hợp. Ứng dụng tạo lịch luyện trong 7 ngày tới.
          </Text>

          {session.status === "loading" ? (
            <ActivityIndicator color={c.tabActive} style={styles.loader} />
          ) : session.status === "guest" ? (
            <View style={styles.section}>
              <Text style={styles.label}>Đăng nhập để lưu kế hoạch</Text>
              <Text style={styles.hint}>
                Mục tiêu, nhiệm vụ và cài đặt nhắc được lưu theo tài khoản của
                bạn.
              </Text>
              <Pressable
                style={styles.saveButton}
                onPress={() => router.push("/auth/login")}
              >
                <Text style={styles.saveText}>Đăng nhập</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <ActivityIndicator color={c.tabActive} style={styles.loader} />
          ) : (
            <>
              <Field
                label="Điểm TOEIC mục tiêu"
                value={targetScore}
                onChangeText={setTargetScore}
                keyboardType="number-pad"
                hint="Từ 10 đến 990"
              />
              <Field
                label="Điểm hiện tại (không bắt buộc)"
                value={currentScore}
                onChangeText={setCurrentScore}
                keyboardType="number-pad"
                hint="Để theo dõi khoảng cách đến mục tiêu"
              />
              <Field
                label="Ngày mục tiêu (không bắt buộc)"
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                hint="Ví dụ: 2027-03-01"
              />
              <Field
                label="Thời lượng học mỗi ngày (phút)"
                value={dailyMinutes}
                onChangeText={setDailyMinutes}
                keyboardType="number-pad"
                hint="Từ 5 đến 240 phút"
              />

              <View style={styles.section}>
                <Text style={styles.label}>Ngày học và nhắc lịch</Text>
                <View style={styles.daysRow}>
                  {weekDays.map((day) => {
                    const selected = reminderDays.includes(day.value);
                    return (
                      <Pressable
                        key={day.value}
                        accessibilityRole="checkbox"
                        accessibilityLabel={day.value === 7 ? "Chủ nhật" : `Thứ ${day.value + 1}`}
                        accessibilityState={{ checked: selected }}
                        onPress={() => toggleDay(day.value)}
                        style={[
                          styles.dayChip,
                          selected && styles.dayChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            selected && styles.dayTextSelected,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.flex}>
                    <Text style={styles.label}>Nhắc lịch học</Text>
                    <Text style={styles.hint}>
                      Nhận thông báo vào ngày học đã chọn, ngoài giờ yên lặng.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Nhắc lịch theo kế hoạch học"
                    value={reminderEnabled}
                    onValueChange={setReminderEnabled}
                    trackColor={{ true: c.tabActive }}
                  />
                </View>
                {reminderEnabled ? (
                  <>
                    <Field
                      label="Giờ nhắc"
                      value={reminderTime}
                      onChangeText={setReminderTime}
                      placeholder="20:00"
                      hint="Định dạng 24 giờ, ví dụ 20:00"
                    />
                    <View style={styles.timeRow}>
                      <View style={styles.flex}>
                        <Field
                          label="Bắt đầu yên lặng"
                          value={quietStart}
                          onChangeText={setQuietStart}
                          placeholder="22:00"
                        />
                      </View>
                      <View style={styles.flex}>
                        <Field
                          label="Kết thúc yên lặng"
                          value={quietEnd}
                          onChangeText={setQuietEnd}
                          placeholder="07:00"
                        />
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            </>
          )}

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {session.status === "authenticated" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || saving, busy: saving }}
              onPress={() => void submit()}
              disabled={loading || saving}
              style={[
                styles.saveButton,
                (loading || saving) && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={themeColor("#111", "text")} />
              ) : (
                <Text style={styles.saveText}>Lưu mục tiêu và tạo lịch</Text>
              )}
            </Pressable>
          ) : null}
        </FormScrollView>
    </StudyScaffold>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "number-pad" | "default";
  placeholder?: string;
  hint?: string;
}) {
  const { resolvedMode } = useAppTheme();
  const focusInput = useFormInputFocus();
  const { c, styles } = useThemedStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput keyboardAppearance={resolvedMode}
        accessibilityLabel={props.label}
        onFocus={focusInput}
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType ?? "default"}
        placeholder={props.placeholder}
        placeholderTextColor={c.secondary}
        style={styles.input}
      />
      {props.hint ? <Text style={styles.hint}>{props.hint}</Text> : null}
    </View>
  );
}



function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, themeColor } = appTheme;
    const c = homeDesign.colors;
    const styles = StyleSheet.create({
      flex: { flex: 1 },
      content: { padding: 16 },
      back: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
      },
      backText: { color: c.text, fontSize: 15, fontWeight: "600" },
      title: { color: c.text, fontSize: 26, fontWeight: "800" },
      subtitle: {
        color: c.secondary,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 7,
        marginBottom: 24,
      },
      loader: { marginVertical: 40 },
      field: { marginBottom: 17 },
      label: { color: c.text, fontSize: 14, fontWeight: "700", marginBottom: 8 },
      input: {
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        color: c.text,
        paddingHorizontal: 14,
        fontSize: 16,
      },
      hint: { color: c.secondary, fontSize: 12, marginTop: 6, lineHeight: 17 },
      section: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        padding: 14,
        marginTop: 3,
        marginBottom: 18,
      },
      switchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      },
      daysRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 17,
      },
      dayChip: {
        minWidth: 48,
        minHeight: 48,
        padding: 10,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.surfaceRaised,
      },
      dayChipSelected: { backgroundColor: c.tabActive },
      dayText: { color: c.text, fontWeight: "700", fontSize: 14 },
      dayTextSelected: { color: c.onSelection },
      timeRow: { gap: 10 },
      error: { color: themeColor("#ff8585", "text"), fontSize: 13, lineHeight: 19, marginBottom: 14 },
      saveButton: {
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: c.tabActive,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
      },
      saveText: { color: c.onSelection, fontSize: 15, fontWeight: "800" },
      disabled: { opacity: 0.55 },
    });
    return { homeDesign, themeColor, c, styles };
  }, [appTheme]);
}
