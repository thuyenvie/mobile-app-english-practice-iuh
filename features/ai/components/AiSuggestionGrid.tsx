import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, XStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';

import { aiMock } from '../data/aiMock';

export function AiSuggestionGrid({ onPrompt, onCamera }: {
  onPrompt: (prompt: string) => void;
  onCamera: () => void;
}) {
  const { aiDesign, themeColor } = useThemedStyles();
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
              <MaterialCommunityIcons name="camera-outline" size={48} color={themeColor("#000000", "text")} />
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

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { aiDesign, themeColor } = appTheme;

    return { aiDesign, themeColor };
  }, [appTheme]);
}
