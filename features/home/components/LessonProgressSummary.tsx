import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, XStack, YStack } from 'tamagui';


import type { Lesson, LessonStatus } from '../types';

export const lessonStatuses = [
  { status: 'completed', label: 'Đã hoàn thành', icon: 'check-circle' },
  { status: 'in-progress', label: 'Đang học', icon: 'watch-later' },
  { status: 'not-started', label: 'Chưa học', icon: 'radio-button-checked' },
] as const;



export function countLessonStatuses(lessons: Lesson[]) {
  if (lessons.some((lesson) => !lesson.status)) return undefined;
  return lessons.reduce<Record<LessonStatus, number>>((counts, lesson) => {
    if (lesson.status) counts[lesson.status] += 1;
    return counts;
  }, { completed: 0, 'in-progress': 0, 'not-started': 0 });
}

export function LessonProgressSummary({ lessons }: { lessons: Lesson[] }) {
  const { homeDesign, lessonStatuses } = useThemedStyles();
  const counts = countLessonStatuses(lessons);
  return (
    <XStack backgroundColor={homeDesign.colors.surface} borderRadius={20} paddingVertical={22} paddingHorizontal={8}>
      {lessonStatuses.map((item) => (
        <YStack key={item.status} flex={1} alignItems="center" gap={10}>
          <XStack alignItems="center" gap={5}>
            <MaterialIcons name={item.icon} color={item.color} size={23} />
            <Text color={homeDesign.colors.text} fontSize={26} fontWeight="600">{counts?.[item.status] ?? '—'}</Text>
          </XStack>
          <Text color={homeDesign.colors.secondary} fontSize={12} textAlign="center">{item.label}</Text>
        </YStack>
      ))}
    </XStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;
    const lessonStatuses = [
      { status: 'completed', label: 'Đã hoàn thành', icon: 'check-circle', color: homeDesign.colors.completed },
      { status: 'in-progress', label: 'Đang học', icon: 'watch-later', color: homeDesign.colors.inProgress },
      { status: 'not-started', label: 'Chưa học', icon: 'radio-button-checked', color: homeDesign.colors.notStarted },
    ] as const;
    return { homeDesign, lessonStatuses };
  }, [appTheme]);
}
