import { useState } from "react";
import { router } from "expo-router";
import { Text, XStack, YStack } from "tamagui";

import { authDesign, loginDesign } from "@/theme/tokens";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AuthScaffold } from "../components/AuthScaffold";
import { GoogleButton } from "../components/GoogleButton";
import { getLoginErrorMessage, login } from "../api/authApi";
import { useGoogleLogin } from "../hooks/useGoogleLogin";

export default function LoginScreen() {
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
    <AuthScaffold variant="login">
      <YStack gap={8}>
        <Text
          role="heading"
          textAlign="center"
          {...loginDesign.title}
          color={authDesign.colors.text}
        >
          Chào mừng trở lại
        </Text>
        <Text
          textAlign="center"
          {...loginDesign.subtitle}
          color={loginDesign.colors.secondary}
        >
          Đăng nhập để đồng bộ tiến độ giữa các thiết bị
        </Text>
      </YStack>
      <YStack marginTop={28} gap={18}>
        <AppInput
          {...loginDesign.input}
          labelProps={loginDesign.label}
          labelGap={8}
          autoCapitalize="none"
          autoCorrect={false}
          label="Tên đăng nhập"
          placeholder="Nhập tên của bạn"
          value={username}
          onChangeText={setUsername}
          autoComplete="username"
        />
        <AppInput
          {...loginDesign.input}
          labelProps={loginDesign.label}
          labelGap={8}
          autoCapitalize="none"
          autoCorrect={false}
          label="Mật khẩu"
          placeholder="Nhập mật khẩu của bạn"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        <AppButton
          {...loginDesign.button}
          marginTop={6}
          disabled={isSubmitting}
          opacity={isSubmitting ? 0.6 : 1}
          onPress={handleLogin}
        >
          {isSubmitting ? "Đang đăng nhập..." : "Xác nhận"}
        </AppButton>
        <XStack
          marginTop={0}
          justifyContent="space-between"
          flexWrap="wrap"
          gap="$small"
        >
          <AppButton
            appearance="text"
            fontSize={14}
            justifyContent="center"
            color={loginDesign.colors.link}
            role="button"
            onPress={() => setNotice("Khôi phục mật khẩu chưa khả dụng.")}
          >
            Quên mật khẩu?
          </AppButton>
          <AppButton
            appearance="text"
            fontSize={14}
            justifyContent="center"
            color={loginDesign.colors.link}
            role="button"
            onPress={() => router.push("/auth/register")}
          >
            Đăng ký
          </AppButton>
        </XStack>
      </YStack>
      <YStack marginTop={20}>
        <GoogleButton
          variant="login"
          disabled={isGoogleLoading}
          loading={isGoogleLoading}
          onPress={handleGoogleLogin}
          onIdToken={handleGoogleIdToken}
          onError={setNotice}
        />
      </YStack>
      {notice ? (
        <Text
          marginTop="$medium"
          aria-live="polite"
          role="status"
          color={loginDesign.colors.secondary}
        >
          {notice}
        </Text>
      ) : null}
      <AppButton appearance="text" marginTop={16} onPress={() => router.replace("/(tabs)/home")}>
        Tiếp tục học thử
      </AppButton>
      <Text
        textAlign="center"
        color={loginDesign.colors.secondary}
        marginTop={28}
        {...authDesign.caption}
      >
        Bằng việc đăng nhập vào ứng dụng, bạn đồng ý với chính sách bảo mật
        của chúng tôi
      </Text>
    </AuthScaffold>
  );
}
