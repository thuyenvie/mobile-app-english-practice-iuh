import { AppButton } from '@/components/ui/AppButton';
import { YStack } from 'tamagui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authDesign, loginDesign } from '@/theme/tokens';

export function AuthHeader({ onBack, variant }: { onBack?: () => void; variant?: "login" }) {
  const insets = useSafeAreaInsets();

  return (
    <YStack backgroundColor={variant === "login" ? loginDesign.colors.header : authDesign.colors.header}
      height={insets.top + (variant === "login" ? 116 : authDesign.headerHeight)} paddingTop={insets.top}
      alignItems="center" justifyContent="center"
      borderBottomLeftRadius={authDesign.headerRadius} borderBottomRightRadius={authDesign.headerRadius}>
      {onBack && (
        <AppButton appearance="text" position="absolute" top={insets.top + 8} left={0}
          minWidth="$touchTarget" aria-label="Quay lại đăng nhập" onPress={onBack}
          icon={<MaterialIcons name="arrow-back-ios" size={24} color="#000000" />} />
      )}
      {/* Neutral wireframe placeholder; replace with the team's local logo asset later. */}
      <YStack width={variant === "login" ? 88 : authDesign.logoWidth}
        height={variant === "login" ? 64 : authDesign.logoHeight}
        borderRadius={variant === "login" ? 12 : 0}
        backgroundColor={authDesign.colors.logo} overflow="hidden"
        alignItems="center" justifyContent="center">
        <YStack position="absolute" width={132} height={1}
          backgroundColor={authDesign.colors.logoLine} rotate="38deg" />
        <YStack position="absolute" width={132} height={1}
          backgroundColor={authDesign.colors.logoLine} rotate="-38deg" />
      </YStack>
    </YStack>
  );
}
