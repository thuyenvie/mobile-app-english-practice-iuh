import { useAppTheme } from "@/theme/useAppTheme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ReadingExamFooter({
  canGoPrevious,
  canGoNext,
  canSubmit,
  onPrevious,
  onNext,
  onSubmit,
}: {
  canGoPrevious: boolean;
  canGoNext: boolean;
  canSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const { homeDesign } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingBottom: insets.bottom, backgroundColor: homeDesign.colors.background }}>
      <View style={[styles.footer, { backgroundColor: homeDesign.colors.surface }]}>
        <FooterAction text="‹ Câu trước" disabled={!canGoPrevious} onPress={onPrevious} />
        <FooterAction text="Nộp" disabled={!canSubmit} onPress={onSubmit} />
        <FooterAction text="Câu sau ›" disabled={!canGoNext} onPress={onNext} />
      </View>
    </View>
  );
}

function FooterAction({
  text,
  disabled,
  onPress,
}: {
  text: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { homeDesign } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && styles.disabled]}
    >
      <Text style={[styles.actionText, { color: homeDesign.colors.link }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  action: {
    padding: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  actionText: { fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.4 },
});
