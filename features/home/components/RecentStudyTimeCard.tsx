import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useCallback, useState } from "react";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  Switch,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";

import { getExamErrorMessage } from "../../study/api/examApi";
import { emptyRecentStudyTime, getRecentStudyTime, type StudyTimeDay } from "../../study/api/studyTimeApi";
import {
  DEFAULT_STUDY_TIME_GOAL,
  loadStudyTimeGoal,
  saveStudyTimeGoal,
  type StudyTimeGoal,
} from "../storage/studyTimeGoalStorage";

const PLOT_HEIGHT = 184;
const MARKER_SIZE = 11;

interface Point {
  x: number;
  y: number;
}

function getPoints(values: number[], width: number, chartMax: number): Point[] {
  const usableWidth = Math.max(0, width - MARKER_SIZE);
  return values.map((value, index) => ({
    x: MARKER_SIZE / 2 + (usableWidth * index) / Math.max(values.length - 1, 1),
    y: PLOT_HEIGHT - (Math.min(value, chartMax) / chartMax) * PLOT_HEIGHT,
  }));
}

function StudyLine({ points, color }: { points: Point[]; color: string }) {
  const { styles } = useThemedStyles();
  return (
    <>
      {points.slice(1).map((point, index) => {
        const previous = points[index];
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return (
          <View
            key={`line-${index}`}
            pointerEvents="none"
            style={[
              styles.lineSegment,
              {
                backgroundColor: color,
                width: length,
                left: (point.x + previous.x - length) / 2,
                top: (point.y + previous.y - 3) / 2,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}
      {points.map((point, index) => (
        <View
          key={`marker-${index}`}
          pointerEvents="none"
          style={[
            styles.marker,
            {
              backgroundColor: color,
              left: point.x - MARKER_SIZE / 2,
              top: point.y - MARKER_SIZE / 2,
            },
          ]}
        />
      ))}
    </>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { styles } = useThemedStyles();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export function RecentStudyTimeCard({ authenticated }: { authenticated: boolean }) {
  const { authDesign, homeDesign, themeColor, styles } = useThemedStyles();
  const [days, setDays] = useState<StudyTimeDay[]>(() => emptyRecentStudyTime());
  const [goal, setGoal] = useState<StudyTimeGoal>(DEFAULT_STUDY_TIME_GOAL);
  const [draftGoal, setDraftGoal] = useState<StudyTimeGoal>(DEFAULT_STUDY_TIME_GOAL);
  const [plotWidth, setPlotWidth] = useState(0);
  const [loading, setLoading] = useState(authenticated);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const { width: windowWidth } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadStudyTimeGoal().then((saved) => {
        if (active) setGoal(saved);
      }).catch(() => {
        if (active) setGoal(DEFAULT_STUDY_TIME_GOAL);
      });

      if (!authenticated) {
        setDays(emptyRecentStudyTime());
        setLoading(false);
        setLoadError("");
        return () => { active = false; };
      }

      setLoading(true);
      setLoadError("");
      void getRecentStudyTime().then(
        (recent) => {
          if (active) {
            setDays(recent);
            setLoading(false);
          }
        },
        (error: unknown) => {
          if (active) {
            setLoadError(getExamErrorMessage(error));
            setLoading(false);
          }
        },
      );
      return () => { active = false; };
    }, [authenticated, retryCount]),
  );

  const chartMax = Math.max(
    30,
    Math.ceil(Math.max(goal.enabled ? goal.targetMinutes : 0, ...days.map((day) => day.minutes)) / 30) * 30,
  );
  const ticks = [chartMax, (chartMax * 2) / 3, chartMax / 3, 0];
  const actualPoints = getPoints(days.map((day) => day.minutes), plotWidth, chartMax);
  const targetPoints = getPoints(days.map(() => goal.targetMinutes), plotWidth, chartMax);
  const modalWidth = Math.min(windowWidth - 40, 480);

  const openGoalModal = () => {
    setDraftGoal(goal);
    setGoalModalVisible(true);
  };

  const changeTarget = (amount: number) => {
    setDraftGoal((current) => ({
      ...current,
      targetMinutes: Math.min(180, Math.max(5, current.targetMinutes + amount)),
    }));
  };

  const confirmGoal = async () => {
    setSavingGoal(true);
    try {
      await saveStudyTimeGoal(draftGoal);
      setGoal(draftGoal);
      setGoalModalVisible(false);
    } catch {
      Alert.alert("Chưa lưu được mục tiêu", "Hãy thử lưu lại sau.");
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Thời gian làm bài gần đây (phút)
      </Text>

      <View style={styles.card}>
        <View style={styles.legend}>
          <LegendItem color={homeDesign.colors.completed} label="Đã học" />
          {goal.enabled ? <LegendItem color={homeDesign.colors.inProgress} label="Mục tiêu" /> : null}
        </View>

        <View style={styles.graphRow}>
          <View style={styles.axis}>
            {ticks.map((tick) => (
              <Text
                key={tick}
                style={[
                  styles.axisLabel,
                  { top: PLOT_HEIGHT - (tick / chartMax) * PLOT_HEIGHT - 9 },
                ]}
              >
                {Math.round(tick)}
              </Text>
            ))}
          </View>
          <View style={styles.plotColumn}>
            <View
              onLayout={(event: LayoutChangeEvent) => setPlotWidth(event.nativeEvent.layout.width)}
              style={styles.plot}
            >
              {ticks.map((tick) => (
                <View
                  key={`grid-${tick}`}
                  pointerEvents="none"
                  style={[styles.gridLine, { top: PLOT_HEIGHT - (tick / chartMax) * PLOT_HEIGHT }]}
                />
              ))}
              {plotWidth > 0 && goal.enabled
                ? <StudyLine points={targetPoints} color={homeDesign.colors.inProgress} />
                : null}
              {plotWidth > 0
                ? <StudyLine points={actualPoints} color={homeDesign.colors.completed} />
                : null}
            </View>
            <View style={styles.dayLabels}>
              {days.map((day, index) => {
                const left = actualPoints[index]?.x ?? 0;
                return (
                  <Text
                    key={day.dateKey}
                    numberOfLines={2}
                    style={[styles.dayLabel, { left: left - 28 }]}
                  >
                    {day.label}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.messageRow}>
            <ActivityIndicator size="small" color={homeDesign.colors.link} />
            <Text style={styles.message}>Đang tải thời gian học...</Text>
          </View>
        ) : loadError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryCount((value) => value + 1)}
            style={styles.messageRow}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={homeDesign.colors.link} />
            <Text style={[styles.message, { color: homeDesign.colors.link }]}>Tải lại thời gian học</Text>
          </Pressable>
        ) : (
          <Text style={styles.caption}>
            {authenticated
              ? "Tính từ thời lượng các bài thi đã nộp trong 7 ngày qua."
              : "Đăng nhập để xem thời gian từ các bài thi đã lưu."}
          </Text>
        )}

        <AppButton
          accessibilityLabel="Đặt mục tiêu thời gian học"
          onPress={openGoalModal}
          minHeight={54}
          borderRadius={14}
        >
          Đặt mục tiêu thời gian
        </AppButton>
      </View>

      <Modal
        visible={goalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Đóng hộp thoại"
            accessibilityRole="button"
            onPress={() => setGoalModalVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.modalCard, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đặt mục tiêu thời gian (phút)</Text>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.switchRow}>
                <Text style={styles.modalBodyText}>{draftGoal.enabled ? "Bật" : "Tắt"}</Text>
                <Switch
                  accessibilityLabel="Bật hoặc tắt mục tiêu thời gian"
                  value={draftGoal.enabled}
                  onValueChange={(enabled: boolean) => setDraftGoal((current) => ({ ...current, enabled }))}
                  trackColor={{ false: homeDesign.colors.border, true: authDesign.colors.primaryPressed }}
                  thumbColor={draftGoal.enabled ? authDesign.colors.primary : themeColor("#d1d5db", "text")}
                />
              </View>

              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Giảm mục tiêu 5 phút"
                  accessibilityState={{ disabled: draftGoal.targetMinutes <= 5 }}
                  disabled={draftGoal.targetMinutes <= 5}
                  onPress={() => changeTarget(-5)}
                  style={styles.stepButton}
                >
                  <MaterialCommunityIcons name="minus" size={28} color={authDesign.colors.primary} />
                </Pressable>
                <Text accessibilityLabel={`${draftGoal.targetMinutes} phút`} style={styles.targetValue}>
                  {draftGoal.targetMinutes}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tăng mục tiêu 5 phút"
                  accessibilityState={{ disabled: draftGoal.targetMinutes >= 180 }}
                  disabled={draftGoal.targetMinutes >= 180}
                  onPress={() => changeTarget(5)}
                  style={styles.stepButton}
                >
                  <MaterialCommunityIcons name="plus" size={28} color={authDesign.colors.primary} />
                </Pressable>
              </View>
              <Text style={styles.caption}>Chọn từ 5 đến 180 phút, mỗi lần thay đổi 5 phút.</Text>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                accessibilityRole="button"
                disabled={savingGoal}
                onPress={() => setGoalModalVisible(false)}
                style={styles.footerButton}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
              <View style={styles.footerDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: savingGoal }}
                disabled={savingGoal}
                onPress={() => void confirmGoal()}
                style={styles.footerButton}
              >
                <Text style={styles.saveText}>{savingGoal ? "Đang lưu..." : "Lưu"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}




function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { authDesign, homeDesign, themeColor } = appTheme;
    const c = homeDesign.colors;
    const styles = StyleSheet.create({
      section: { gap: 12 },
      sectionTitle: { color: c.text, fontSize: 23, lineHeight: 30, fontWeight: "800" },
      card: { backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 16 },
      legend: { gap: 12 },
      legendItem: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 28 },
      legendDot: { width: 16, height: 16, borderRadius: 8 },
      legendText: { color: c.text, fontSize: 16 },
      graphRow: { height: 224, flexDirection: "row" },
      axis: { width: 34, height: PLOT_HEIGHT, position: "relative" },
      axisLabel: { position: "absolute", right: 6, color: c.text, fontSize: 13 },
      plotColumn: { flex: 1, minWidth: 0 },
      plot: { height: PLOT_HEIGHT, position: "relative", overflow: "visible" },
      gridLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
      lineSegment: { position: "absolute", height: 4, borderRadius: 2 },
      marker: { position: "absolute", width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: MARKER_SIZE / 2 },
      dayLabels: { height: 38, position: "relative" },
      dayLabel: { position: "absolute", top: 8, width: 56, color: c.text, fontSize: 11, lineHeight: 14, textAlign: "center" },
      messageRow: { minHeight: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
      message: { color: c.secondary, fontSize: 12 },
      caption: { color: c.secondary, fontSize: 11, lineHeight: 16, textAlign: "center" },
      modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: themeColor("rgba(0, 0, 0, 0.68)", "background") },
      modalCard: { overflow: "hidden", borderRadius: 24, backgroundColor: c.surface },
      modalHeader: { minHeight: 70, justifyContent: "center", alignItems: "center", paddingHorizontal: 18, backgroundColor: authDesign.colors.primary },
      modalTitle: { color: c.text, fontSize: 19, lineHeight: 25, fontWeight: "700", textAlign: "center" },
      modalContent: { minHeight: 245, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, paddingVertical: 24, gap: 28 },
      switchRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
      modalBodyText: { color: c.text, fontSize: 16 },
      stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 30 },
      stepButton: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 26, backgroundColor: c.surfaceRaised },
      targetValue: { minWidth: 48, color: c.text, fontSize: 22, textAlign: "center" },
      modalFooter: { minHeight: 58, flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
      footerButton: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center" },
      footerDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border },
      cancelText: { color: c.text, fontSize: 16, fontWeight: "600" },
      saveText: { color: authDesign.colors.primary, fontSize: 16, fontWeight: "700" },
    });
    return { authDesign, homeDesign, themeColor, c, styles };
  }, [appTheme]);
}
