import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';
import { aiDesign, homeDesign } from '@/theme/tokens';
import { HomeScaffold } from '../../home/components/HomeScaffold';
import { AiComposer } from '../components/AiComposer';
import { AiMessageList } from '../components/AiMessageList';
import { AiSuggestionGrid } from '../components/AiSuggestionGrid';
import { useTutorChat } from '../hooks/useTutorChat';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function AiTutorScreen() {
  const params = useLocalSearchParams<{ conversationId?: string; historyKey?: string }>();
  const loadedHistoryKey = useRef('');
  const [question, setQuestion] = useState('');
  const [localNotice, setLocalNotice] = useState('');
  const {
    messages,
    loading,
    loadingHistory,
    error,
    canShowSuggestions,
    hasOlderMessages,
    sendMessage,
    sendImage,
    loadConversation,
    loadOlderMessages,
    startNewConversation,
  } = useTutorChat();

  useEffect(() => {
    const conversationId = Array.isArray(params.conversationId)
      ? params.conversationId[0]
      : params.conversationId;
    const historyKey = `${conversationId || ''}-${params.historyKey || ''}`;
    if (conversationId && loadedHistoryKey.current !== historyKey) {
      loadedHistoryKey.current = historyKey;
      void loadConversation(conversationId);
    }
  }, [loadConversation, params.conversationId, params.historyKey]);

  const submitQuestion = async (message = question) => {
    const sent = await sendMessage(message);
    if (sent) setQuestion('');
  };

  const openImageSource = () => {
    if (loading || loadingHistory) return;
    if (Platform.OS === 'web') {
      void pickImage('library');
      return;
    }

    Alert.alert('Gửi ảnh câu hỏi', 'Chọn nguồn ảnh', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Thư viện', onPress: () => void pickImage('library') },
      { text: 'Chụp ảnh', onPress: () => void pickImage('camera') },
    ]);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    setLocalNotice('');

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setLocalNotice('Ứng dụng cần quyền camera để chụp câu hỏi.');
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setLocalNotice('Ứng dụng cần quyền thư viện để chọn ảnh câu hỏi.');
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
      setLocalNotice('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10 MB.');
      return;
    }

    const sent = await sendImage(asset, question);
    if (sent) setQuestion('');
  };

  const confirmNewConversation = () => {
    if (loading || loadingHistory) return;
    Alert.alert('Cuộc trò chuyện mới', 'Lịch sử hiện tại vẫn được giữ lại.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Bắt đầu mới',
        onPress: () => {
          startNewConversation();
          loadedHistoryKey.current = '';
          router.setParams({ conversationId: '', historyKey: '' });
        },
      },
    ]);
  };

  return (
    <HomeScaffold>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? homeDesign.tabHeight : 0}
      >
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={16}
          paddingVertical={10}
          borderBottomWidth={1}
          borderBottomColor={homeDesign.colors.border}
        >
          <YStack>
            <Text role="heading" color={aiDesign.colors.text} fontSize={18} fontWeight="800">
              Gia sư AI
            </Text>
            <Text color={aiDesign.colors.secondary} fontSize={11}>
              Chat và giải thích câu hỏi TOEIC
            </Text>
          </YStack>
          <XStack alignItems="center" gap={4}>
            <AppButton
              appearance="text"
              width={44}
              height={44}
              alignItems="center"
              aria-label="Mở lịch sử trò chuyện"
              onPress={() => router.push('/ai-history')}
              icon={
                <MaterialCommunityIcons name="history" size={29} color={aiDesign.colors.accent} />
              }
            />
            <AppButton
              appearance="text"
              width={44}
              height={44}
              alignItems="center"
              disabled={loading || loadingHistory}
              aria-label="Bắt đầu cuộc trò chuyện mới"
              onPress={confirmNewConversation}
              icon={
                <MaterialCommunityIcons
                  name="chat-plus-outline"
                  size={28}
                  color={aiDesign.colors.accent}
                />
              }
            />
          </XStack>
        </XStack>

        <AiMessageList
          messages={messages}
          loading={loading}
          loadingHistory={loadingHistory}
          hasOlderMessages={hasOlderMessages}
          onLoadOlder={() => void loadOlderMessages()}
          onSuggestion={(prompt) => void submitQuestion(prompt)}
        />

        {canShowSuggestions && !loadingHistory ? (
          <YStack paddingHorizontal={16} paddingBottom={10}>
            <AiSuggestionGrid
              onCamera={openImageSource}
              onPrompt={(prompt) => {
                setQuestion(prompt);
                setLocalNotice('');
              }}
            />
          </YStack>
        ) : null}

        <YStack
          paddingHorizontal={16}
          borderTopWidth={1}
          borderTopColor={homeDesign.colors.border}
          backgroundColor={homeDesign.colors.background}
        >
          {error || localNotice ? (
            <Text
              role="alert"
              aria-live="polite"
              color="#ffb36b"
              fontSize={12}
              lineHeight={17}
              paddingTop={8}
            >
              {localNotice || error}
            </Text>
          ) : null}
          <AiComposer
            value={question}
            loading={loading || loadingHistory}
            onChange={(value) => {
              setQuestion(value);
              setLocalNotice('');
            }}
            onCamera={openImageSource}
            onSend={() => void submitQuestion()}
          />
        </YStack>
      </KeyboardAvoidingView>
    </HomeScaffold>
  );
}
