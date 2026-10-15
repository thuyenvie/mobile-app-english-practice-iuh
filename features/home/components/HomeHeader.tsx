import { Text, XStack, YStack } from 'tamagui';

import { homeDesign } from '@/theme/tokens';
import { useDeviceDate } from '../hooks/useDeviceDate';
import type { HomeProfile } from '../types';
import { UserAvatar } from './UserAvatar';

export function HomeHeader({ profile, welcomeText }: { profile: HomeProfile; welcomeText: string }) {
  const date = useDeviceDate();
  return (
    <YStack minHeight={260} padding={homeDesign.pagePadding} paddingTop={28} gap={16}>
      <XStack alignItems="flex-end" justifyContent="space-between" gap={12}>
        <Text flex={1} color={homeDesign.colors.text} fontSize={11} fontWeight="700">{date}</Text>
        <UserAvatar uri={profile.avatarUrl} name={profile.fullName} />
      </XStack>
      <Text color={homeDesign.colors.text} fontSize={16} fontWeight="600">{welcomeText}</Text>
      <Text role="heading" color={homeDesign.colors.text} fontSize={21} lineHeight={29} fontWeight="700">
        Chào mừng quay lại {profile.fullName}!
      </Text>
    </YStack>
  );
}
