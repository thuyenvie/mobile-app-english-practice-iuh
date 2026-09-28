import { Text, YStack } from 'tamagui';

import { homeDesign } from '@/theme/tokens';
import { HomeScaffold } from '../components/HomeScaffold';

export function TabPlaceholderScreen({ title }: { title: string }) {
  return (
    <HomeScaffold>
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$large">
        <Text role="heading" color={homeDesign.colors.text} fontSize={24} fontWeight="700">{title}</Text>
      </YStack>
    </HomeScaffold>
  );
}
