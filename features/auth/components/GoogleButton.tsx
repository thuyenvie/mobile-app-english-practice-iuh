import { Text } from 'tamagui';

import { authDesign } from '@/theme/tokens';

import { AppButton } from '@/components/ui/AppButton';

export function GoogleButton({ onPress }: { onPress: () => void }) {
  return (
    <AppButton {...authDesign.button} borderRadius={100} color="$color"
      backgroundColor={authDesign.colors.surface} borderWidth={1} borderColor={authDesign.colors.border}
      hoverStyle={{ backgroundColor: authDesign.colors.surface, borderColor: authDesign.colors.border }}
      focusStyle={{ backgroundColor: authDesign.colors.surface, borderColor: authDesign.colors.border }}
      pressStyle={{ backgroundColor: '$borderColor' }} onPress={onPress}
      accessibilityLabel="Tiếp tục với Google"
      icon={<Text color={authDesign.colors.google} fontSize={26} fontWeight="700" accessible={false}>G</Text>}>
      Tiếp tục với Google
    </AppButton>
  );
}
