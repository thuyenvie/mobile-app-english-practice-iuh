import { Spinner, Text, YStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';
import { homeDesign } from '@/theme/tokens';

export function HomeDataMessage({ message, loading, onRetry }: { message: string; loading?: boolean; onRetry?: () => void }) {
  return (
    <YStack flex={1} minHeight={180} padding="$large" gap="$medium" alignItems="center" justifyContent="center">
      {loading && <Spinner color={homeDesign.colors.link} />}
      <Text color={homeDesign.colors.secondary} textAlign="center" role="status">{message}</Text>
      {onRetry && <AppButton onPress={onRetry}>Thử lại</AppButton>}
    </YStack>
  );
}
