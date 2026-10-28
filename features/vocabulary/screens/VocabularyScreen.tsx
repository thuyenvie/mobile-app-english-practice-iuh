import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
  type SavedVocabulary,
} from "../api/vocabularyApi";
import { VocabularyWordCard } from "../components/VocabularyWordCard";

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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);

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
      setItems(result.items);
      setTotalItems(result.totalItems);
      setPage(result.page);
      setHasMore(result.page + 1 < result.totalPages);
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

  const loadNextPage = async () => {
    if (!hasMore || loading || loadingMoreRef.current) return;
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
      if (currentRequestId !== requestId.current) return;
      setItems((current) => [...current, ...result.items]);
      setPage(result.page);
      setHasMore(result.page + 1 < result.totalPages);
    } catch (loadError: unknown) {
      if (currentRequestId === requestId.current)
        setError(getExamErrorMessage(loadError));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const deleteItem = async (item: SavedVocabulary) => {
    try {
      await deleteSavedVocabulary(item.id);
      setItems((current) => current.filter((saved) => saved.id !== item.id));
      setTotalItems((current) => Math.max(0, current - 1));
    } catch (deleteError: unknown) {
      setError(getExamErrorMessage(deleteError));
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
                  onPress={() => setFilter(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.filterChip, active && styles.activeFilterChip]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active && styles.activeFilterText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
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

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VocabularyWordCard item={item} onDelete={confirmDelete} />
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
              <YStack alignItems="center" gap={10} padding={24}>
                <ActivityIndicator color={homeDesign.colors.link} />
                <Text color={homeDesign.colors.secondary}>
                  Đang tải từ vựng...
                </Text>
              </YStack>
            ) : error ? (
              <YStack alignItems="center" gap={10} padding={24}>
                <MaterialCommunityIcons
                  name="cloud-alert-outline"
                  size={40}
                  color={homeDesign.colors.secondary}
                />
                <Text
                  color={homeDesign.colors.text}
                  fontSize={16}
                  fontWeight="700"
                >
                  Chưa tải được danh sách
                </Text>
                <Pressable
                  onPress={() => void loadFirstPage()}
                  accessibilityRole="button"
                >
                  <Text color={homeDesign.colors.link} fontWeight="800">
                    Tải lại
                  </Text>
                </Pressable>
              </YStack>
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
        />
      </YStack>
    </HomeScaffold>
  );
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
