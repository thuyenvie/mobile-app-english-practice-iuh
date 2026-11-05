import { Text, YStack } from 'tamagui';

import { BrandedPageState } from '@/components/ui/BrandedPageState';
import { homeDesign } from '@/theme/tokens';

export function HomeDataMessage({ message, loading, onRetry }: { message: string; loading?: boolean; onRetry?: () => void }) {
  if (loading || onRetry) return <BrandedPageState compact {...{ message, loading, onRetry }} />;
  return (
    <YStack flex={1} minHeight={180} padding="$large" gap="$medium" alignItems="center" justifyContent="center">
      <Text color={homeDesign.colors.secondary} textAlign="center" role="status">{message}</Text>
    </YStack>
  );
}
