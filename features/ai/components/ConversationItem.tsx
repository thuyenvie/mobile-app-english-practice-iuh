import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';

import type { AiConversationSummary } from '../types';

export function ConversationItem({
  conversation,
  onOpen,
  onDelete,
}: {
  conversation: AiConversationSummary;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { aiDesign, homeDesign, themeColor } = useThemedStyles();
  return (
    <XStack
      minHeight={92}
      padding={13}
      gap={10}
      alignItems="center"
      borderRadius={15}
      backgroundColor={homeDesign.colors.surface}
    >
      <AppButton
        appearance="text"
        flex={1}
        height="auto"
        alignItems="flex-start"
        justifyContent="flex-start"
        aria-label={`Mở ${conversation.title}`}
        onPress={onOpen}
      >
        <YStack width="100%" gap={5}>
          <Text color={aiDesign.colors.text} fontSize={15} fontWeight="800" numberOfLines={1}>
            {conversation.title}
          </Text>
          <Text color={aiDesign.colors.secondary} fontSize={12} numberOfLines={2}>
            {conversation.lastMessagePreview || 'Chưa có nội dung'}
          </Text>
          <Text color={homeDesign.colors.link} fontSize={10}>
            {conversation.messageCount} tin nhắn · {formatDate(conversation.lastMessageAt)}
          </Text>
        </YStack>
      </AppButton>
      <AppButton
        appearance="text"
        width={42}
        height={42}
        alignItems="center"
        aria-label={`Xóa ${conversation.title}`}
        onPress={onDelete}
        icon={<MaterialCommunityIcons name="delete-outline" size={23} color={themeColor("#ff7777", "text")} />}
      />
    </XStack>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { aiDesign, homeDesign, themeColor } = appTheme;

    return { aiDesign, homeDesign, themeColor };
  }, [appTheme]);
}
