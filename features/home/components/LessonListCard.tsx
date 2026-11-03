import { useState } from 'react';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, Text, XStack, YStack } from 'tamagui';

import { homeDesign } from '@/theme/tokens';
import type { Lesson } from '../types';

const levelColors = {
  A1: { background: '#ddfce9', text: '#226840' },
  A2: { background: '#ddfce9', text: '#226840' },
  B1: { background: '#dbe9ff', text: '#2845a8' },
  B2: { background: '#e9e1ff', text: '#4935a5' },
} as const;

function PracticeBadge({ label, completed }: { label: string; completed?: boolean }) {
  return (
    <XStack borderRadius={20} paddingHorizontal={7} paddingVertical={3} gap={4}
      alignItems="center" backgroundColor={homeDesign.colors.surfaceRaised}>
      <MaterialIcons name={completed === undefined ? 'remove' : completed ? 'check-circle' : 'radio-button-unchecked'} size={12}
        color={completed ? homeDesign.colors.completed : homeDesign.colors.secondary} />
      <Text fontSize={10} color={homeDesign.colors.secondary}>{label}</Text>
    </XStack>
  );
}

export function LessonListCard({ lesson }: { lesson: Lesson }) {
  const [failedUri, setFailedUri] = useState<string>();
  const level = lesson.level ? levelColors[lesson.level] : undefined;
  return (
    <XStack backgroundColor={homeDesign.colors.surface} borderWidth={1} borderColor={homeDesign.colors.border}
      role="button" accessible accessibilityLabel={lesson.title}
      onPress={() => lesson.exam && router.push({ pathname: '/study/[year]/[testNumber]',
        params: { year: String(lesson.exam.year), testNumber: String(lesson.exam.testNumber) } })}
      borderRadius={20} padding={12} gap={12} alignItems="center">
      <YStack width="34%" minHeight={102} alignSelf="stretch" borderRadius={13} overflow="hidden"
        backgroundColor={homeDesign.colors.surfaceRaised} alignItems="center" justifyContent="center">
        {lesson.thumbnailUrl && failedUri !== lesson.thumbnailUrl ? (
          <Image source={{ uri: lesson.thumbnailUrl }} position="absolute" width="100%" height="100%"
            resizeMode="cover" onError={() => setFailedUri(lesson.thumbnailUrl)} />
        ) : (
          <YStack alignItems="center" gap={3} paddingVertical={12}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={32} color="#ffffff" />
            <Text fontSize={12} fontWeight="700" color="#ffffff">{lesson.label}</Text>
          </YStack>
        )}
        <XStack position="absolute" top={6} left={5} right={5} gap={4} flexWrap="wrap">
          {level && <Text backgroundColor={level.background} color={level.text} borderRadius={20}
            fontSize={11} fontWeight="700" paddingHorizontal={8} paddingVertical={3}>{lesson.level}</Text>}
          {lesson.isPro && (
            <XStack backgroundColor={homeDesign.colors.inProgress} borderRadius={20}
              paddingHorizontal={6} paddingVertical={3} alignItems="center" gap={3}>
              <MaterialCommunityIcons name="crown" size={12} color="#ffffff" />
              <Text fontSize={10} fontWeight="700" color="#ffffff">PRO</Text>
            </XStack>
          )}
        </XStack>
      </YStack>
      <YStack flex={1} gap={8} paddingVertical={2}>
        <Text color={homeDesign.colors.text} fontSize={16} lineHeight={22} numberOfLines={3}>{lesson.title}</Text>
        <XStack gap={10} flexWrap="wrap">
          <XStack gap={4} alignItems="center">
            <MaterialIcons name="videocam" size={15} color={homeDesign.colors.secondary} />
            <Text color={homeDesign.colors.secondary} fontSize={12}>{lesson.duration ?? '—'}</Text>
          </XStack>
          <XStack gap={4} alignItems="center">
            <MaterialIcons name="visibility" size={15} color={homeDesign.colors.secondary} />
            <Text color={homeDesign.colors.secondary} fontSize={12}>{lesson.views ?? '—'}</Text>
          </XStack>
        </XStack>
        <XStack flexWrap="wrap" gap={5}>
          <PracticeBadge label="Chính tả" completed={lesson.dictationCompleted} />
          <PracticeBadge label="Nói theo" completed={lesson.shadowingCompleted} />
        </XStack>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={homeDesign.colors.notStarted} accessible={false} />
    </XStack>
  );
}
