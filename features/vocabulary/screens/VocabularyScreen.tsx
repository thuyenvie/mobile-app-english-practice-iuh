import { BrandedPageState } from "@/components/ui/BrandedPageState";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { homeDesign } from "@/theme/tokens";
import { getExamErrorMessage } from "../../study/api/examApi";
import { HomeScaffold } from "../../home/components/HomeScaffold";
import {
  deleteSavedVocabulary,
  getSavedVocabulary,
  refreshSavedVocabularyPhonetic,
  type SavedVocabulary,
} from "../api/vocabularyApi";
import { VocabularyFlashcard } from "../components/VocabularyFlashcard";
import { VocabularyWordCard } from "../components/VocabularyWordCard";
import { useVocabularyPronunciation } from "../hooks/useVocabularyPronunciation";

type DateFilter = "all" | "today" | "yesterday" | "week";

const PAGE_SIZE = 20;
const FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "yesterday", label: "Hôm qua" },
  { id: "week", label: "7 ngày qua" },
];

export default function VocabularyScreen() {
  const [filter, setFilter] = useState<DateFilter>("all");
  const [items, setItems] = useState<SavedVocabulary[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "flashcard">("list");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [repairingPhoneticIds, setRepairingPhoneticIds] = useState<Set<string>>(() => new Set());
  const [phoneticRepairFailedIds, setPhoneticRepairFailedIds] = useState<Set<string>>(() => new Set());
  const pronunciation = useVocabularyPronunciation();
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);

  // Dung mot audio player cho toan man; dung audio cu khi doi tu hoac che do.
  useEffect(() => {
    pronunciation.stop();
  }, [filter, viewMode, reviewIndex, pronunciation.stop]);

  const pronunciationProps = {
    activeUrl: pronunciation.activeUrl,
    activeWord: pronunciation.activeWord,
    playing: pronunciation.playing,
    loading: pronunciation.loading,
    error: pronunciation.error,
    onPress: pronunciation.play,
  };

  const loadFirstPage = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await getSavedVocabulary({
        ...getDateRange(filter),
        page: 0,
        size: PAGE_SIZE,
      });
      if (currentRequestId !== requestId.current) return;
      const repaired = await repairLegacyPhonetics(result.items);
      if (currentRequestId !== requestId.current) return;
      setItems(repaired.items);
      setPhoneticRepairFailedIds(new Set(repaired.failedIds));
      setTotalItems(result.totalItems);
      setPage(result.page);
      setHasMore(result.page + 1 < result.totalPages);
      if (repaired.failedIds.length > 0) {
        setError(`Chưa khôi phục được phiên âm cho ${repaired.failedIds.length} từ. Bấm “Tải lại” trên thẻ từ sau khi có mạng.`);
      }
    } catch (loadError: unknown) {
      if (currentRequestId === requestId.current)
        setError(getExamErrorMessage(loadError));
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
      return () => {
        // Bo qua response cu neu chuyen tab hoac doi bo loc khi request dang chay.
        requestId.current += 1;
      };
    }, [loadFirstPage])
  );

  const loadNextPage = async (): Promise<SavedVocabulary[] | null> => {
    if (!hasMore || loading || loadingMoreRef.current) return null;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    const currentRequestId = requestId.current;
    try {
      const result = await getSavedVocabulary({
        ...getDateRange(filter),
        page: nextPage,
        size: PAGE_SIZE,
      });
      if (currentRequestId !== requestId.current) return null;
      const repaired = await repairLegacyPhonetics(result.items);
      if (currentRequestId !== requestId.current) return null;
      setItems((current) => [...current, ...repaired.items]);
      setPhoneticRepairFailedIds((current) => new Set([...current, ...repaired.failedIds]));
      setPage(result.page);
      setHasMore(result.page + 1 < result.totalPages);
      if (repaired.failedIds.length > 0) {
        setError(`Chưa khôi phục được phiên âm cho ${repaired.failedIds.length} từ. Bấm “Tải lại” trên thẻ từ sau khi có mạng.`);
      }
      return repaired.items;
    } catch (loadError: unknown) {
      if (currentRequestId === requestId.current)
        setError(getExamErrorMessage(loadError));
      return null;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const moveToNextCard = async () => {
    if (reviewIndex < items.length - 1) {
      setReviewIndex((current) => current + 1);
      setAnswerRevealed(false);
      return;
    }
    if (!hasMore || loadingMoreRef.current) return;

    const nextPageItems = await loadNextPage();
    if (nextPageItems?.length) {
      setReviewIndex(items.length);
      setAnswerRevealed(false);
    }
  };

  const chooseFilter = (nextFilter: DateFilter) => {
    setSelectedIds([]);
    setFilter(nextFilter);
    setViewMode("list");
    setReviewIndex(0);
    setAnswerRevealed(false);
  };

  const deleteItem = async (item: SavedVocabulary) => {
    try {
      await deleteSavedVocabulary(item.id);
      setSelectedIds(current => current.filter(id => id !== item.id));
      setItems((current) => current.filter((saved) => saved.id !== item.id));
      setTotalItems((current) => Math.max(0, current - 1));
    } catch (deleteError: unknown) {
      setError(getExamErrorMessage(deleteError));
    }
  };

  const repairPhonetic = async (item: SavedVocabulary) => {
    setRepairingPhoneticIds((current) => new Set(current).add(item.id));
    try {
      const updated = await refreshSavedVocabularyPhonetic(item.id);
      setItems((current) => current.map((saved) => saved.id === item.id ? updated : saved));
      setPhoneticRepairFailedIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      setError("");
    } catch (repairError: unknown) {
      setPhoneticRepairFailedIds((current) => new Set(current).add(item.id));
      setError(getExamErrorMessage(repairError));
    } finally {
      setRepairingPhoneticIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  };

  const confirmDelete = (item: SavedVocabulary) => {
    Alert.alert("Xóa từ vựng", `Xóa “${item.word}” khỏi danh sách đã lưu?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => void deleteItem(item),
      },
    ]);
  };

  return (
    <HomeScaffold>
      <YStack flex={1} backgroundColor={homeDesign.colors.background}>
        <YStack
          paddingHorizontal={homeDesign.pagePadding}
          paddingTop={18}
          paddingBottom={12}
          gap={6}
        >
          <Text color={homeDesign.colors.text} fontSize={27} fontWeight="800">
            Từ vựng
          </Text>
          <Text color={homeDesign.colors.secondary} fontSize={14}>
            {totalItems} từ đã lưu · Chọn từ khi đọc bài để lưu lại học sau
          </Text>
          <XStack gap={8}>
            <Pressable
              onPress={() => setViewMode("list")}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "list" }}
              style={[styles.modeChip, viewMode === "list" && styles.activeFilterChip]}
            >
              <Text style={[styles.filterText, viewMode === "list" && styles.activeFilterText]}>Danh sách</Text>
            </Pressable>
            <Pressable
              onPress={() => { setReviewIndex(0); setAnswerRevealed(false); setViewMode("flashcard"); }}
              disabled={loading || items.length === 0}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "flashcard", disabled: loading || items.length === 0 }}
              style={[styles.modeChip, viewMode === "flashcard" && styles.activeFilterChip, (loading || items.length === 0) && styles.disabledChip]}
            >
              <Text style={[styles.filterText, viewMode === "flashcard" && styles.activeFilterText]}>Ôn Flashcard</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setViewMode("list"); setSelecting(value => !value); setSelectedIds([]); }} style={[styles.modeChip, selecting && styles.activeFilterChip]}>
              <Text style={[styles.filterText, selecting && styles.activeFilterText]}>{selecting ? "Hủy chọn" : "Lên lịch ôn"}</Text>
            </Pressable>
          </XStack>
          {selecting && viewMode === "list" ? <XStack alignItems="center" justifyContent="space-between">
            <Text color={homeDesign.colors.secondary} fontSize={12}>Đã chọn {selectedIds.length}/100 từ</Text>
            <Pressable accessibilityRole="button" onPress={() => setSelectedIds(selectedIds.length ? [] : items.slice(0, 100).map(item => item.id))}>
              <Text color={homeDesign.colors.link} fontSize={12}>{selectedIds.length ? "Bỏ chọn" : `Chọn ${Math.min(100, items.length)} từ đã tải`}</Text>
            </Pressable>
          </XStack> : null}
          {viewMode === "list" ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => chooseFilter(item.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.filterChip, active && styles.activeFilterChip]}
                  >
                    <Text style={[styles.filterText, active && styles.activeFilterText]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text color={homeDesign.colors.secondary} fontSize={12}>
              Bộ lọc: {FILTERS.find((item) => item.id === filter)?.label}
            </Text>
          )}
        </YStack>

        {error ? (
          <XStack
            marginHorizontal={homeDesign.pagePadding}
            marginBottom={8}
            alignItems="center"
            gap={8}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={19}
              color="#ff8c8c"
            />
            <Text flex={1} color="#ffaaaa" fontSize={13}>
              {error}
            </Text>
            <Pressable
              onPress={() => void loadFirstPage()}
              accessibilityRole="button"
            >
              <Text color={homeDesign.colors.link} fontWeight="700">
                Thử lại
              </Text>
            </Pressable>
          </XStack>
        ) : null}

        {viewMode === "flashcard" && items[reviewIndex] ? (
          <VocabularyFlashcard
            item={items[reviewIndex]}
            index={reviewIndex}
            total={totalItems}
            revealed={answerRevealed}
            canGoPrevious={reviewIndex > 0}
            canGoNext={reviewIndex < items.length - 1}
            loadingNext={loadingMore}
            hasMore={hasMore}
            onToggleAnswer={() => setAnswerRevealed((current) => !current)}
            onPrevious={() => { setReviewIndex((current) => Math.max(0, current - 1)); setAnswerRevealed(false); }}
            onNext={() => void moveToNextCard()}
            pronunciation={pronunciationProps}
          />
        ) : viewMode === "flashcard" ? (
          <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={12}>
            <Text color={homeDesign.colors.text} fontSize={17} fontWeight="700">Chưa có từ để ôn</Text>
            <Text color={homeDesign.colors.secondary} textAlign="center">Hãy lưu từ trong bài Reading hoặc chọn bộ lọc khác.</Text>
          </YStack>
        ) : <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ gap: 6 }}>
            {selecting ? <Pressable
              accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.includes(item.id) }}
              accessibilityLabel={`Chọn ${item.word}`} style={styles.selectRow}
              onPress={() => setSelectedIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : current.length < 100 ? [...current, item.id] : current)}>
              <MaterialCommunityIcons name={selectedIds.includes(item.id) ? "checkbox-marked" : "checkbox-blank-outline"} color={homeDesign.colors.tabActive} size={24} />
              <Text color={homeDesign.colors.text}>Chọn {item.word}</Text>
            </Pressable> : null}
            <VocabularyWordCard
              item={item}
              onDelete={confirmDelete}
              onRepairPhonetic={repairPhonetic}
              repairingPhonetic={repairingPhoneticIds.has(item.id)}
              phoneticRepairFailed={phoneticRepairFailedIds.has(item.id)}
              pronunciation={pronunciationProps}
            />
            </View>
          )}
          contentContainerStyle={
            items.length ? styles.listContent : styles.emptyListContent
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => void loadNextPage()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void loadFirstPage()}
              tintColor={homeDesign.colors.link}
            />
          }
          ListEmptyComponent={
            loading ? (
              <BrandedPageState compact loading message="Đang tải từ vựng..." />
            ) : error ? (
              <BrandedPageState compact message={error} onRetry={() => void loadFirstPage()} />
            ) : (
              <YStack alignItems="center" gap={10} padding={24}>
                <MaterialCommunityIcons
                  name="book-open-page-variant-outline"
                  size={40}
                  color={homeDesign.colors.secondary}
                />
                <Text
                  color={homeDesign.colors.text}
                  fontSize={17}
                  fontWeight="700"
                >
                  Chưa có từ nào
                </Text>
                <Text
                  color={homeDesign.colors.secondary}
                  textAlign="center"
                  fontSize={13}
                >
                  Mở bài Reading, chạm vào từ mới rồi chọn “Lưu từ này”.
                </Text>
              </YStack>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={styles.footerLoading}
                color={homeDesign.colors.link}
              />
            ) : null
          }
        />}
        {selecting && viewMode === "list" ? <View style={styles.scheduleFooter}>
          <Pressable disabled={!selectedIds.length} accessibilityRole="button" style={[styles.scheduleButton, !selectedIds.length && styles.disabledChip]}
            onPress={() => router.push({ pathname: "/vocabulary/schedule", params: { ids: selectedIds.join(","), words: items.filter(item => selectedIds.includes(item.id)).slice(0, 6).map(item => item.word).join(" · ") } })}>
            <Text style={styles.activeFilterText}>{`Lên lịch ôn (${selectedIds.length} từ)`}</Text>
          </Pressable>
        </View> : null}
      </YStack>
    </HomeScaffold>
  );
}

async function repairLegacyPhonetics(items: SavedVocabulary[]) {
  const failedIds: string[] = [];
  const repairedItems: SavedVocabulary[] = [];
  // Gioi han ba request cung luc de khong gui ca lo lon vao dictionary API.
  for (let index = 0; index < items.length; index += 3) {
    const group = await Promise.all(items.slice(index, index + 3).map(async (item) => {
      // Neu phonetic bi loi hoac nguon cu khong co, thu lay lai tu dictionary.
      if (item.phonetic && !item.phonetic.includes("?")) return item;
      try {
        return await refreshSavedVocabularyPhonetic(item.id);
      } catch {
        failedIds.push(item.id);
        return item;
      }
    }));
    repairedItems.push(...group);
  }
  return { items: repairedItems, failedIds };
}

function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  if (filter === "all") return {};

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (filter === "today")
    return { from: today.toISOString(), to: tomorrow.toISOString() };
  if (filter === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { from: yesterday.toISOString(), to: today.toISOString() };
  }

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  return { from: weekStart.toISOString(), to: tomorrow.toISOString() };
}

const styles = StyleSheet.create({
  selectRow: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44 },
  scheduleFooter: { padding: 14, backgroundColor: homeDesign.colors.background, borderTopWidth: 1, borderTopColor: homeDesign.colors.border },
  scheduleButton: { minHeight: 48, backgroundColor: homeDesign.colors.tabActive, borderRadius: 14, alignItems: "center", justifyContent: "center", padding: 12 },
  filters: { gap: 8, paddingVertical: 12, paddingRight: 8 },
  filterChip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: homeDesign.colors.border,
    backgroundColor: homeDesign.colors.surfaceRaised,
  },
  modeChip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: homeDesign.colors.border,
    backgroundColor: homeDesign.colors.surfaceRaised,
  },
  disabledChip: { opacity: 0.5 },
  activeFilterChip: {
    borderColor: homeDesign.colors.tabActive,
    backgroundColor: homeDesign.colors.tabActive,
  },
  filterText: {
    color: homeDesign.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  activeFilterText: { color: homeDesign.colors.cardText },
  listContent: {
    paddingHorizontal: homeDesign.pagePadding,
    paddingTop: 4,
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: homeDesign.pagePadding,
  },
  separator: { height: 12 },
  footerLoading: { paddingVertical: 18 },
});
