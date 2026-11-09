import { useAppTheme } from "@/theme/useAppTheme";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { DialogContent } from "@/components/ui/DialogContent";
import { AppButton } from "@/components/ui/AppButton";

import type { ExamAnswers, ExamQuestion } from "../types";

export function QuestionSheetModal({
  visible,
  partNumber,
  questions,
  answers,
  currentQuestionNumber,
  canSubmit,
  onClose,
  onJump,
  onSubmit,
}: {
  visible: boolean;
  partNumber: number;
  questions: ExamQuestion[];
  answers: ExamAnswers;
  currentQuestionNumber: number;
  canSubmit: boolean;
  onClose: () => void;
  onJump: (questionNumber: number) => void;
  onSubmit: () => void;
}) {
  const { homeDesign, themeColor } = useAppTheme();
  const c = homeDesign.colors;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: themeColor("#000b", "background") }]}>
        <DialogContent style={[styles.dialog, { backgroundColor: c.surface }]} contentStyle={{ gap: 14 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: "700" }}>
            Bảng câu hỏi · Part {partNumber}
          </Text>
          <Text style={{ color: c.secondary, fontSize: 13, lineHeight: 20 }}>
            Chạm số câu để chuyển đến câu hỏi.
          </Text>
          <View style={styles.grid}>
            {questions.map((question) => {
              const answer = answers[question.questionNumber];
              const current = question.questionNumber === currentQuestionNumber;
              return (
                <Pressable
                  key={question.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Câu ${question.questionNumber}${answer ? `, đã chọn ${answer}` : ", chưa trả lời"}`}
                  accessibilityState={{ selected: current }}
                  onPress={() => onJump(question.questionNumber)}
                  style={[
                    styles.cell,
                    { borderColor: current ? c.link : answer ? c.tabActive : c.border },
                    answer && { backgroundColor: themeColor("#334018", "background") },
                  ]}
                >
                  <Text style={{ color: c.text, fontSize: 16, lineHeight: 24 }}>
                    {question.questionNumber}{answer ? ` · ${answer}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <AppButton
            appearance="text"
            padding={10}
            color={c.link}
            fontSize={14}
            fontWeight="600"
            disabled={!canSubmit}
            opacity={canSubmit ? 1 : 0.4}
            onPress={onSubmit}
          >
            Nộp
          </AppButton>
          <AppButton
            appearance="text"
            padding={10}
            color={c.link}
            fontSize={14}
            fontWeight="600"
            onPress={onClose}
          >
            Đóng
          </AppButton>
        </DialogContent>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, padding: 20, justifyContent: "center" },
  dialog: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    maxHeight: "85%",
    padding: 18,
    gap: 12,
    borderRadius: 16,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { padding: 12, minWidth: 64, minHeight: 48, borderWidth: 1, borderRadius: 8 },
});
