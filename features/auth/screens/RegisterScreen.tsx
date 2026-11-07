import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState } from "react";

import { router } from "expo-router";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AuthScaffold } from "../components/AuthScaffold";


export default function RegisterScreen() {
  const { design } = useThemedStyles();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const goToLogin = () => router.dismissTo("/auth/login");

  const handleRegister = () => {
    if (!username.trim() || !password || !confirmPassword) {
      setNotice("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password !== confirmPassword) {
      setNotice("Mật khẩu xác nhận không khớp.");
      return;
    }

    setNotice("Tạo tài khoản chưa khả dụng trên ứng dụng.");
  };

  return (
    <AuthScaffold title="Tạo tài khoản" subtitle="Bắt đầu hành trình luyện TOEIC của bạn.">
      <YStack gap={10}>
        <AppInput {...design.input} labelProps={design.label} labelGap={4}
          autoCapitalize="none" autoCorrect={false} label="Tên đăng nhập"
          placeholder="Chọn tên đăng nhập" value={username}
          onChangeText={setUsername} autoComplete="username" />
        <AppInput {...design.input} labelProps={design.label} labelGap={4}
          label="Mật khẩu" placeholder="Tạo mật khẩu" value={password}
          onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <AppInput {...design.input} labelProps={design.label} labelGap={4}
          label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu"
          value={confirmPassword} onChangeText={setConfirmPassword}
          secureTextEntry autoComplete="new-password" />
        {notice ? <Text aria-live="polite" color={design.error}>{notice}</Text> : null}
        <AppButton {...design.button} onPress={handleRegister}>Tạo tài khoản</AppButton>
      </YStack>
      <XStack alignItems="center" justifyContent="center" flexWrap="wrap" gap={6} marginTop={4}>
        <Text color={design.muted} fontSize={14}>Đã có tài khoản?</Text>
        <AppButton appearance="text" color={design.link} fontSize={14} onPress={goToLogin}>
          Đăng nhập
        </AppButton>
      </XStack>
    </AuthScaffold>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { authFormDesign: design } = appTheme;

    return { design };
  }, [appTheme]);
}
