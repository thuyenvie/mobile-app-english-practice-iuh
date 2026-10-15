import { Alert, FlatList, RefreshControl } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';
import { aiDesign, homeDesign } from '@/theme/tokens';
import { HomeScaffold } from '../../home/components/HomeScaffold';
import { ConversationItem } from '../components/ConversationItem';
import { useConversationHistory } from '../hooks/useConversationHistory';
import type { AiConversationSummary } from '../types';

export default function AiHistoryScreen() {
  const { items, loading, loadingMore, error, hasNext, refresh, loadMore, archiveConversation } =
    useConversationHistory();

  const openConversation = (conversation: AiConversationSummary) => {
    router.replace({
      pathname: '/(tabs)/ai',
      params: { conversationId: conversation.id, historyKey: Date.now().toString() },
    });
  };

  const confirmDelete = (conversation: AiConversationSummary) => {
    Alert.alert('Xóa cuộc trò chuyện', `Xóa "${conversation.title}" khỏi lịch sử?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => void archiveConversation(conversation.id),
      },
    ]);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/ai');
  };

  return (
    <HomeScaffold bottomInset>
      <XStack
        height={64}
        alignItems="center"
        gap={10}
        paddingHorizontal={10}
        borderBottomWidth={1}
        borderBottomColor={homeDesign.colors.border}
      >
        <AppButton
          appearance="text"
          width={44}
          height={44}
          alignItems="center"
          aria-label="Quay lại gia sư AI"
          onPress={goBack}
          icon={<MaterialCommunityIcons name="chevron-left" size={31} color={aiDesign.colors.text} />}
        />
        <YStack>
          <Text color={aiDesign.colors.text} fontSize={18} fontWeight="800">
            Lịch sử trò chuyện
          </Text>
          <Text color={aiDesign.colors.secondary} fontSize={11}>
            Chọn một cuộc trò chuyện để tiếp tục
          </Text>
        </YStack>
      </XStack>

      {error ? (
        <Text role="alert" color="#ffb36b" fontSize={12} padding={14}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 11, flexGrow: 1 }}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onOpen={() => openConversation(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={aiDesign.colors.accent} />
        }
        onEndReached={() => {
          if (hasNext) void loadMore();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <YStack flex={1} alignItems="center" justifyContent="center" gap={10}>
              <MaterialCommunityIcons name="chat-outline" size={48} color={aiDesign.colors.secondary} />
              <Text color={aiDesign.colors.secondary}>Chưa có cuộc trò chuyện nào.</Text>
            </YStack>
          ) : null
        }
        ListFooterComponent={loadingMore ? <Spinner color={aiDesign.colors.accent} margin={12} /> : null}
      />
    </HomeScaffold>
  );
}
