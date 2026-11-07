import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState } from "react";

import { FlatList } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';

import { HomeDataMessage } from '../components/HomeDataMessage';
import { HomeScaffold } from '../components/HomeScaffold';
import { LessonListCard } from '../components/LessonListCard';
import { LessonProgressSummary, lessonStatuses } from '../components/LessonProgressSummary';
import { useHomeData } from '../hooks/useHomeData';
import type { LessonSection, LessonStatus } from '../types';

const filters = [{ status: 'all', label: 'Tất cả' }, ...lessonStatuses] as const;

function SectionContent({ section }: { section: LessonSection }) {
  const { homeDesign } = useThemedStyles();
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<LessonStatus | 'all'>('all');
  const lessons = filter === 'all' ? section.lessons : section.lessons.filter((lesson) => lesson.status === filter);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={homeDesign.pagePadding}
        paddingTop={16} paddingBottom={20} gap={12}>
        <AppButton appearance="text" width={44} height={44} aria-label="Quay lại Trang chủ" onPress={goBack}
          icon={<MaterialIcons name="arrow-back" size={27} color={homeDesign.colors.text} />} />
        <Text flex={1} textAlign="center" role="heading" fontSize={20} color={homeDesign.colors.text}>{section.title}</Text>
        <AppButton appearance="text" width={44} height={44} borderRadius={22}
          backgroundColor={homeDesign.colors.surfaceRaised} aria-label="Lọc bài học"
          accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters((value) => !value)}
          icon={<MaterialIcons name="tune" size={25} color={filter === 'all' ? homeDesign.colors.text : homeDesign.colors.link} />} />
      </XStack>
      {showFilters && (
        <XStack paddingHorizontal={homeDesign.pagePadding} paddingBottom={12} gap={6} flexWrap="wrap">
          {filters.map((item) => (
            <AppButton key={item.status} appearance="text" paddingHorizontal={10} borderRadius={16} fontSize={11}
              color={filter === item.status ? homeDesign.colors.onSelection : homeDesign.colors.text}
              backgroundColor={filter === item.status ? homeDesign.colors.tabActive : homeDesign.colors.surfaceRaised}
              accessibilityState={{ selected: filter === item.status }} onPress={() => setFilter(item.status)}>
              {item.label}
            </AppButton>
          ))}
        </XStack>
      )}
      <FlatList data={lessons} keyExtractor={(lesson) => lesson.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: homeDesign.pagePadding, paddingBottom: 28 }}
        ListHeaderComponent={<YStack marginBottom={22}><LessonProgressSummary lessons={section.lessons} /></YStack>}
        ItemSeparatorComponent={() => <YStack height={16} />}
        renderItem={({ item }) => <LessonListCard lesson={item} />}
        ListEmptyComponent={<HomeDataMessage message="Chưa có bài học trong danh sách này." />} />
    </>
  );
}

export default function SectionLessonsScreen() {
  const { homeDesign } = useThemedStyles();
  const { sectionId } = useLocalSearchParams<{ sectionId: string | string[] }>();
  const id = Array.isArray(sectionId) ? sectionId[0] : sectionId;
  const { state, retry } = useHomeData();
  const section = state.status === 'ready' ? state.data.sections.find((item) => item.id === id) : undefined;

  return (
    <HomeScaffold bottomInset>
      {state.status === 'loading' ? <HomeDataMessage loading message="Đang tải bài học..." />
        : state.status === 'error' ? <HomeDataMessage message={state.message} onRetry={retry} />
          : section ? <SectionContent key={section.id} section={section} />
            : (
              <YStack flex={1} alignItems="center" justifyContent="center" gap="$medium" padding="$large">
                <Text color={homeDesign.colors.text}>Không tìm thấy danh sách bài học.</Text>
                <AppButton onPress={() => router.replace('/(tabs)/home')}>Về Trang chủ</AppButton>
              </YStack>
            )}
    </HomeScaffold>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
