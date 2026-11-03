import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Input, XStack } from 'tamagui';

import { AppButton } from '@/components/ui/AppButton';
import { aiDesign, homeDesign } from '@/theme/tokens';
import { aiMock } from '../data/aiMock';

export function AiComposer({ value, loading, onChange, onCamera, onSend }: {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onCamera: () => void;
  onSend: () => void;
}) {
  return (
    <XStack alignItems="center" gap={16} paddingTop={18} paddingBottom={20}>
      <AppButton appearance="text" width={56} height={56} borderRadius={28}
        alignItems="center" backgroundColor={aiDesign.colors.camera}
        aria-label="Chụp ảnh câu hỏi" disabled={loading} opacity={loading ? 0.5 : 1} onPress={onCamera}
        icon={<MaterialCommunityIcons name="camera" size={30} color={homeDesign.colors.cardText} />} />
      <XStack flex={1} minHeight={56} alignItems="center" borderWidth={1}
        borderColor={homeDesign.colors.border} borderRadius={10} paddingRight={4}>
        <Input flex={1} multiline minHeight={54} maxHeight={100} paddingHorizontal={10}
          paddingVertical={10} backgroundColor="transparent" borderWidth={0}
          color={aiDesign.colors.text} placeholderTextColor="$placeholderColor"
          fontSize={13} fontWeight="600" value={value} onChangeText={onChange}
          placeholder={aiMock.inputPlaceholder} aria-label={aiMock.inputPlaceholder} />
        <AppButton appearance="text" width={44} height={44} alignItems="center"
          aria-label="Gửi câu hỏi" disabled={loading || !value.trim()}
          opacity={loading || !value.trim() ? 0.5 : 1} onPress={onSend}
          icon={<MaterialCommunityIcons name="send" size={30} color={aiDesign.colors.send} />} />
      </XStack>
    </XStack>
  );
}
