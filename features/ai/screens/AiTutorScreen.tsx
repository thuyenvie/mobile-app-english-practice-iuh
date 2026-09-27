import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';
import { aiDesign } from '@/theme/tokens';
import { HomeScaffold } from '../../home/components/HomeScaffold';
import { AiComposer } from '../components/AiComposer';
import { AiSuggestionGrid } from '../components/AiSuggestionGrid';
import { aiMock } from '../data/aiMock';

export default function AiTutorScreen() {
  const [question, setQuestion] = useState('');
  const [notice, setNotice] = useState('');
  const showCameraNotice = () => setNotice(aiMock.notices.camera);

  return (
    <HomeScaffold>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}>
          <XStack alignItems="center" justifyContent="space-between" paddingTop={20} paddingBottom={32}>
            <Text role="heading" color={aiDesign.colors.text} fontSize={18} fontWeight="700">{aiMock.title}</Text>
            <AppButton appearance="text" width={44} height={44} alignItems="center"
              aria-label="Lịch sử trò chuyện" onPress={() => setNotice(aiMock.notices.history)}
              icon={<MaterialCommunityIcons name="history" size={36} color={aiDesign.colors.accent} />} />
          </XStack>

          <XStack alignItems="flex-start" gap={14} paddingRight={44}>
            <YStack width={58} height={58} borderRadius={29} borderWidth={2}
              borderColor={aiDesign.colors.accent} backgroundColor={aiDesign.colors.avatar}
              alignItems="center" justifyContent="center" accessible accessibilityLabel="Avatar gia sư AI">
              <MaterialCommunityIcons name="robot" size={38} color={aiDesign.colors.robot} />
            </YStack>
            <YStack flex={1} backgroundColor={aiDesign.colors.surface} borderRadius={aiDesign.cardRadius}
              paddingHorizontal={12} paddingVertical={24}>
              <Text color={aiDesign.colors.text} fontSize={16} fontWeight="700" lineHeight={23}>
                {aiMock.greeting}
              </Text>
            </YStack>
          </XStack>

          <YStack flex={1} minHeight={100} />

          <AiSuggestionGrid onCamera={showCameraNotice} onPrompt={(prompt) => {
            setQuestion(prompt);
            setNotice('');
          }} />
          <YStack height={36} />
        </ScrollView>

        <YStack paddingHorizontal={16}>
          {notice ? (
            <Text role="status" aria-live="polite" color={aiDesign.colors.secondary} fontSize={12}
              paddingTop={8}>{notice}</Text>
          ) : null}
          <AiComposer value={question} onChange={(value) => { setQuestion(value); setNotice(''); }}
            onCamera={showCameraNotice} onSend={() => setNotice(aiMock.notices.send)} />
        </YStack>
      </KeyboardAvoidingView>
    </HomeScaffold>
  );
}
