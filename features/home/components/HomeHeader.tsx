import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, XStack, YStack } from 'tamagui';

import { homeDesign } from '@/theme/tokens';
import { useDeviceDate } from '../hooks/useDeviceDate';
import type { HomeProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { AppButton } from '@/components/ui/AppButton';
import { useSession } from '@/lib/auth/useSession';
import { router } from 'expo-router';

export function HomeHeader({ profile }: { profile: HomeProfile }) {
  const date = useDeviceDate();
  const isGuest = useSession().status === "guest";
  return (
    <YStack padding={homeDesign.pagePadding} gap={10}>
      <XStack alignItems="center" justifyContent="space-between" gap={12}>
        <YStack flex={1} gap={4}>
          <Text color={homeDesign.colors.secondary} fontSize={12} fontWeight="600">{date}</Text>
          <Text role="heading" color={homeDesign.colors.text} fontSize={24} fontWeight="700">
            {isGuest ? "Chào mừng bạn!" : `Chào ${profile.fullName}!`}
          </Text>
        </YStack>
        {isGuest ? <UserAvatar uri={profile.avatarUrl} name={profile.fullName} /> :
          <AppButton appearance="text" aria-label="Cài đặt nhắc lịch" color={homeDesign.colors.link}
            onPress={() => router.push("/study-plan/setup")}
            icon={<MaterialIcons name="notifications-none" size={22} color={homeDesign.colors.link} />}>
            Nhắc lịch
          </AppButton>}
      </XStack>
      {isGuest ? <>
        <AppButton onPress={() => router.push("/auth/login")}>Đăng nhập để bắt đầu học</AppButton>
        <Text color={homeDesign.colors.secondary} fontSize={12}>
          Bạn vẫn có thể học thử trong tab Học tập. Kết quả học thử không được lưu.
        </Text>
      </> : null}
    </YStack>
  );
}
