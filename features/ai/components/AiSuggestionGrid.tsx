import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, XStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';
import { aiDesign } from '@/theme/tokens';
import { aiMock } from '../data/aiMock';

export function AiSuggestionGrid({ onPrompt, onCamera }: {
  onPrompt: (prompt: string) => void;
  onCamera: () => void;
}) {
  return (
    <XStack flexWrap="wrap" justifyContent="space-between" rowGap={24}>
      {aiMock.suggestions.map((suggestion) => (
        <AppButton key={suggestion.id} appearance="text" width="47.5%"
          minHeight={aiDesign.cardMinHeight} borderRadius={aiDesign.cardRadius}
          backgroundColor={aiDesign.colors.surface} padding={16}
          alignItems="center" justifyContent="center"
          pressStyle={{ opacity: 0.75 }} aria-label={suggestion.label}
          onPress={() => suggestion.type === 'camera' ? onCamera() : onPrompt(suggestion.label)}>
          <XStack alignItems="center" gap={8} width="100%">
            {suggestion.type === 'camera' && (
              <MaterialCommunityIcons name="camera-outline" size={48} color="#000000" />
            )}
            <Text flex={1} color={aiDesign.colors.text} fontSize={15} lineHeight={20} fontWeight="700">
              {suggestion.label}
            </Text>
          </XStack>
        </AppButton>
      ))}
    </XStack>
  );
}
