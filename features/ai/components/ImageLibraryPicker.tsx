import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Button, Image, Text, YStack } from 'tamagui';

/** Picker gon nhe de chon anh tu thu vien va xem truoc ngay tren simulator. */
export function ImageLibraryPicker() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const chooseImage = async () => {
    setLoading(true);
    setMessage('');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage('Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        setMessage('Bạn chưa chọn ảnh.');
        return;
      }

      const selectedImage = result.assets?.[0];
      if (!selectedImage?.uri) {
        setMessage('Không tìm thấy ảnh được chọn. Vui lòng thử lại.');
        return;
      }

      setImageUri(selectedImage.uri);
      setMessage('Đã chọn ảnh thành công.');
    } catch {
      setMessage('Không mở được thư viện ảnh. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack gap="$3" padding="$4" alignItems="flex-start">
      <Button onPress={() => void chooseImage()} disabled={loading}>
        {loading ? 'Đang mở thư viện…' : 'Chọn ảnh từ thư viện'}
      </Button>

      {message ? <Text accessibilityRole="text">{message}</Text> : null}

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          width={200}
          height={200}
          resizeMode="cover"
          accessibilityLabel="Ảnh vừa chọn"
          borderRadius="$3"
        />
      ) : (
        <Text>Ảnh đã chọn sẽ hiển thị ở đây.</Text>
      )}
    </YStack>
  );
}
