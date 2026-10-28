import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { homeDesign } from "@/theme/tokens";
import type { SavedVocabulary } from "../api/vocabularyApi";

export function VocabularyWordCard({
  item,
  onDelete,
}: {
  item: SavedVocabulary;
  onDelete: (item: SavedVocabulary) => void;
}) {
  const savedDate = new Date(item.savedAt);
  const dateLabel = Number.isNaN(savedDate.getTime())
    ? ""
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(savedDate);

  return (
    <YStack
      padding={16}
      gap={10}
      borderRadius={16}
      borderWidth={1}
      borderColor={homeDesign.colors.border}
      backgroundColor={homeDesign.colors.surface}
    >
      <XStack alignItems="flex-start" justifyContent="space-between" gap={12}>
        <View style={styles.titleGroup}>
          <Text color={homeDesign.colors.text} fontSize={21} fontWeight="800">
            {item.word}
          </Text>
          {item.phonetic ? (
            <Text color={homeDesign.colors.secondary} fontSize={14}>
              {item.phonetic}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onDelete(item)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Xóa từ ${item.word}`}
          style={styles.deleteButton}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={21} color="#ff7777" />
        </Pressable>
      </XStack>

      {item.partOfSpeech ? <Text style={styles.partOfSpeech}>{item.partOfSpeech}</Text> : null}
      <Text color={homeDesign.colors.tabActive} fontSize={17} fontWeight="800">
        {item.vietnameseMeaning}
      </Text>
      <Text color={homeDesign.colors.text} fontSize={14} lineHeight={21}>
        {item.englishDefinition}
      </Text>
      {item.example ? (
        <Text color={homeDesign.colors.secondary} fontSize={13} lineHeight={19} fontStyle="italic">
          “{item.example}”
        </Text>
      ) : null}
      {dateLabel ? <Text color={homeDesign.colors.link} fontSize={12}>Đã lưu {dateLabel}</Text> : null}
    </YStack>
  );
}

const styles = StyleSheet.create({
  titleGroup: { flex: 1, gap: 3 },
  deleteButton: { padding: 4 },
  partOfSpeech: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    color: homeDesign.colors.cardText,
    backgroundColor: homeDesign.colors.tabActive,
    fontSize: 12,
    fontWeight: "700",
  },
});
