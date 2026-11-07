import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { Text, YStack } from 'tamagui';

import { BrandedPageState } from '@/components/ui/BrandedPageState';


export function HomeDataMessage({ message, loading, onRetry }: { message: string; loading?: boolean; onRetry?: () => void }) {
  const { homeDesign } = useThemedStyles();
  if (loading || onRetry) return <BrandedPageState compact {...{ message, loading, onRetry }} />;
  return (
    <YStack flex={1} minHeight={180} padding="$large" gap="$medium" alignItems="center" justifyContent="center">
      <Text color={homeDesign.colors.secondary} textAlign="center" role="status">{message}</Text>
    </YStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
