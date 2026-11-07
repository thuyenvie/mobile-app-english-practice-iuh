import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState } from "react";

import { router } from "expo-router";
import { Text, XStack, YStack } from "tamagui";


import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AuthScaffold } from "../components/AuthScaffold";
import { GoogleButton } from "../components/GoogleButton";
import { getLoginErrorMessage, login } from "../api/authApi";
import { useGoogleLogin } from "../hooks/useGoogleLogin";

export default function LoginScreen() {
  const { design, themeColor } = useThemedStyles();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { completeGoogleSignIn, isGoogleLoading, signInWithGoogle } =
    useGoogleLogin();

  const handleLogin = async () => {
    const userName = username.trim();

    if (!userName || !password) {
      setNotice("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    setNotice("");

    try {
      await login({ userName, passWord: password });
      setNotice("Đăng nhập thành công.");
      router.replace("/(tabs)/home");
    } catch (error) {
      setNotice(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setNotice("");
    try {
      const result = await signInWithGoogle();
      if (result) {
        setNotice("Đăng nhập Google thành công.");
        router.replace("/(tabs)/home");
      }
    } catch (error) {
      setNotice(getLoginErrorMessage(error));
    }
  };

  const handleGoogleIdToken = async (idToken: string) => {
    setNotice("");
    try {
      await completeGoogleSignIn(idToken);
      setNotice("Đăng nhập Google thành công.");
      router.replace("/(tabs)/home");
    } catch (error) {
      setNotice(getLoginErrorMessage(error));
    }
  };

  return (
    <AuthScaffold title="Chào mừng trở lại!" subtitle="Đăng nhập để tiếp tục lộ trình TOEIC.">
      <YStack gap={10}>
        <AppInput
          {...design.input}
          labelProps={design.label}
          labelGap={4}
          autoCapitalize="none"
          autoCorrect={false}
          label="Tên đăng nhập"
          placeholder="Nhập tên đăng nhập"
          value={username}
          onChangeText={setUsername}
          autoComplete="username"
        />
        <AppInput
          {...design.input}
          labelProps={design.label}
          labelGap={4}
          autoCapitalize="none"
          autoCorrect={false}
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        {notice ? <Text aria-live="polite" color={design.error}>{notice}</Text> : null}
        <AppButton {...design.button} disabled={isSubmitting || isGoogleLoading}
          opacity={isSubmitting || isGoogleLoading ? 0.6 : 1} onPress={handleLogin}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </AppButton>
      </YStack>
      <XStack alignItems="center" gap={8} marginVertical={9}>
        <YStack flex={1} height={1} backgroundColor={themeColor("#CFDEF2", "background")} />
        <Text color={design.muted} fontSize={13}>hoặc</Text>
        <YStack flex={1} height={1} backgroundColor={themeColor("#CFDEF2", "background")} />
      </XStack>
      <GoogleButton
        variant="login"
        disabled={isGoogleLoading || isSubmitting}
        loading={isGoogleLoading}
        onPress={handleGoogleLogin}
        onIdToken={handleGoogleIdToken}
        onError={setNotice}
      />
      <AppButton appearance="text" color={design.link} onPress={() => router.replace("/(tabs)/home")}>
        Tiếp tục học thử
      </AppButton>
      <XStack alignItems="center" justifyContent="center" flexWrap="wrap" gap={6}>
        <Text color={design.muted} fontSize={14}>Chưa có tài khoản?</Text>
        <AppButton appearance="text" color={design.link} fontSize={14} onPress={() => router.push("/auth/register")}>
          Đăng ký
        </AppButton>
      </XStack>
      <Text textAlign="center" color={design.muted} fontSize={12}>
        Bằng việc đăng nhập, bạn đồng ý với chính sách bảo mật của chúng tôi.
      </Text>
    </AuthScaffold>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { authFormDesign: design, themeColor } = appTheme;

    return { design, themeColor };
  }, [appTheme]);
}
