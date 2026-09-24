import { useState } from 'react';
import { router } from 'expo-router';
import { Text, YStack } from 'tamagui';

import { authDesign } from '@/theme/tokens';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AuthScaffold } from '../components/AuthScaffold';
import { GoogleButton } from '../components/GoogleButton';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const goToLogin = () => router.dismissTo('/auth/login');

  return (
    <AuthScaffold onBack={goToLogin}>
      <Text accessibilityRole="header" textAlign="center" {...authDesign.title} color="$color">Đăng ký</Text>
      <YStack marginTop={authDesign.registerFormGap} gap={authDesign.fieldGap}>
        <AppInput {...authDesign.input} labelProps={authDesign.label} labelGap={authDesign.labelGap} autoCapitalize="none" autoCorrect={false} label="Tên đăng nhập" placeholder="Nhập tên của bạn"
          value={username} onChangeText={setUsername} autoComplete="username" />
        <AppInput {...authDesign.input} labelProps={authDesign.label} labelGap={authDesign.labelGap} autoCapitalize="none" autoCorrect={false} label="Mật khẩu" placeholder="Nhập mật khẩu của bạn"
          value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <AppInput {...authDesign.input} labelProps={authDesign.label} labelGap={authDesign.labelGap} autoCapitalize="none" autoCorrect={false} label="Xác nhận lại mật khẩu" placeholder="Nhập lại mật khẩu"
          value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
        <AppButton {...authDesign.button} marginTop={8} onPress={() => setNotice('Đăng ký chưa khả dụng. Vui lòng thử lại sau.')}>
          Xác nhận
        </AppButton>
      </YStack>
      <YStack marginTop={authDesign.googleGap}>
        <GoogleButton onPress={() => setNotice('Đăng nhập với Google chưa khả dụng.')} />
      </YStack>
      {notice ? <Text marginTop="$medium" accessibilityLiveRegion="polite" role="status" color="$textSecondary">{notice}</Text> : null}
      <AppButton appearance="text" fontSize={11} marginTop="$medium" alignSelf="center" justifyContent="center" color="$color"
        accessibilityRole="button" onPress={goToLogin}>Đăng nhập</AppButton>
    </AuthScaffold>
  );
}
