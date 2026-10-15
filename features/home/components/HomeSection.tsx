import { ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';
import { homeDesign } from '@/theme/tokens';
import type { LessonSection } from '../types';

export function HomeSection({ section }: { section: LessonSection }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(Math.min(width, homeDesign.maxWidth) * 0.41);
  const preview = section.lessons.slice(0, section.previewLimit ?? 4);
  return (
    <YStack marginBottom={42}>
      <XStack paddingHorizontal={8} alignItems="center" justifyContent="space-between" gap={8}>
        <Text flex={1} role="heading" color={homeDesign.colors.text} fontSize={13} fontWeight="700">{section.title}</Text>
        <AppButton appearance="text" color={homeDesign.colors.link} fontSize={12}
          aria-label={`Xem tất cả bài học: ${section.title} (${section.id})`}
          onPress={() => router.push({ pathname: '/sections/[sectionId]', params: { sectionId: section.id } })}>
          Xem tất cả &gt;&gt;
        </AppButton>
      </XStack>
      {preview.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: homeDesign.colors.cardTrack }}
          contentContainerStyle={{ gap: 26, paddingHorizontal: 2 }}>
          {preview.map((lesson) => (
            <YStack key={lesson.id} width={cardWidth} height={cardWidth} borderRadius={7}
              backgroundColor={homeDesign.colors.card} alignItems="center" justifyContent="center">
              <Text color={homeDesign.colors.cardText} fontSize={13} fontWeight="700">{lesson.label}</Text>
            </YStack>
          ))}
        </ScrollView>
      ) : <Text padding="$medium" color={homeDesign.colors.secondary}>Chưa có bài học.</Text>}
    </YStack>
  );
}
