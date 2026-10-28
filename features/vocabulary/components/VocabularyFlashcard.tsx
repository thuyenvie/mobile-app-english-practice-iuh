import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";
import { PhoneticText } from "../../study/components/PhoneticText";
import type { SavedVocabulary } from "../api/vocabularyApi";

export function VocabularyFlashcard({
  item,
  index,
  total,
  revealed,
  canGoPrevious,
  canGoNext,
  loadingNext,
  hasMore,
  onToggleAnswer,
  onPrevious,
  onNext,
}: {
  item: SavedVocabulary;
  index: number;
  total: number;
  revealed: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  loadingNext: boolean;
  hasMore: boolean;
  onToggleAnswer: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const progress = total ? ((index + 1) / total) * 100 : 0;

  return (
    <YStack flex={1} paddingHorizontal={homeDesign.pagePadding} paddingTop={18} paddingBottom={22} gap={16}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text color={homeDesign.colors.secondary} fontSize={14} fontWeight="700">
          Thẻ {index + 1} / {total}
        </Text>
        <Text color={homeDesign.colors.link} fontSize={13} fontWeight="700">
          {Math.round(progress)}% lượt này
        </Text>
      </XStack>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealed ? "Ẩn nghĩa của từ" : `Hiện nghĩa của ${item.word}`}
        accessibilityHint="Chạm thẻ để lật và xem đáp án"
        onPress={onToggleAnswer}
        style={styles.cardPressable}
      >
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={18}>
          <MaterialCommunityIcons
            name={revealed ? "check-circle-outline" : "cards-outline"}
            size={32}
            color={homeDesign.colors.link}
          />
          <Text color={homeDesign.colors.text} fontSize={30} fontWeight="800" textAlign="center">
            {item.word}
          </Text>
          {item.phonetic ? (
            <PhoneticText style={styles.phonetic}>{item.phonetic}</PhoneticText>
          ) : (
            <Text color={homeDesign.colors.secondary} fontSize={13}>Chưa có phiên âm</Text>
          )}

          {revealed ? (
            <YStack width="100%" alignItems="center" gap={12}>
              {item.partOfSpeech ? <Text style={styles.partOfSpeech}>{item.partOfSpeech}</Text> : null}
              <Text color={homeDesign.colors.tabActive} fontSize={21} fontWeight="800" textAlign="center">
                {item.vietnameseMeaning}
              </Text>
              <Text color={homeDesign.colors.text} fontSize={15} lineHeight={23} textAlign="center">
                {item.englishDefinition}
              </Text>
              {item.example ? (
                <Text color={homeDesign.colors.secondary} fontSize={14} lineHeight={21} fontStyle="italic" textAlign="center">
                  “{item.example}”
                </Text>
              ) : null}
            </YStack>
          ) : (
            <Text color={homeDesign.colors.secondary} fontSize={14} textAlign="center">
              Chạm vào thẻ để xem nghĩa và ví dụ
            </Text>
          )}
        </YStack>
      </Pressable>

      <XStack gap={12}>
        <AppButton flex={1} appearance="text" disabled={!canGoPrevious || loadingNext} onPress={onPrevious}>
          ← Trước
        </AppButton>
        <AppButton flex={1} disabled={(!canGoNext && !hasMore) || loadingNext} onPress={onNext}>
          {loadingNext ? "Đang tải..." : hasMore && !canGoNext ? "Tải thẻ tiếp →" : "Tiếp →"}
        </AppButton>
      </XStack>

      {!hasMore && !canGoNext ? (
        <Text color={homeDesign.colors.secondary} fontSize={12} textAlign="center">
          Đã hết từ trong bộ lọc này. Bạn có thể xem lại thẻ trước hoặc quay về danh sách.
        </Text>
      ) : null}
    </YStack>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 6, overflow: "hidden", borderRadius: 4, backgroundColor: homeDesign.colors.surfaceRaised },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: homeDesign.colors.tabActive },
  cardPressable: { flex: 1, minHeight: 300, overflow: "hidden", borderRadius: 22, borderWidth: 1, borderColor: homeDesign.colors.border, backgroundColor: homeDesign.colors.surface },
  phonetic: { color: homeDesign.colors.secondary, fontSize: 16 },
  partOfSpeech: { color: homeDesign.colors.cardText, backgroundColor: homeDesign.colors.tabActive, paddingHorizontal: 10, paddingVertical: 5, overflow: "hidden", borderRadius: 9, fontSize: 12, fontWeight: "700" },
});
