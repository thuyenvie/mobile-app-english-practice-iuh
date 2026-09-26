import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, YStack } from 'tamagui';

import { homeDesign } from '@/theme/tokens';

export function UserAvatar({ uri, name }: { uri?: string; name: string }) {
  const [failedUri, setFailedUri] = useState<string>();
  return (
    <YStack width={60} height={60} borderRadius={30} overflow="hidden"
      backgroundColor={homeDesign.colors.tab} alignItems="center" justifyContent="center"
      accessible accessibilityLabel={`Ảnh đại diện của ${name}`}>
      {uri && failedUri !== uri ? (
        <Image source={{ uri }} width={60} height={60} onError={() => setFailedUri(uri)} />
      ) : (
        <MaterialIcons name="person" size={42} color={homeDesign.colors.cardText} />
      )}
    </YStack>
  );
}
