import { useState } from "react";
import { router } from "expo-router";
import { Text, XStack, YStack } from "tamagui";

import { authDesign } from "@/theme/tokens";
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
      if (result) setNotice("Đăng nhập Google thành công.");
    } catch (error) {
      setNotice(getLoginErrorMessage(error));
    }
  };

  const handleGoogleIdToken = async (idToken: string) => {
    setNotice("");
    try {
      await completeGoogleSignIn(idToken);
      setNotice("Đăng nhập Google thành công.");
    } catch (error) {
      setNotice(getLoginErrorMessage(error));
    }
  };

  return (
    <AuthScaffold>
      <YStack gap={12}>
        <Text
          role="heading"
          textAlign="center"
          {...authDesign.title}
          color="$color"
        >
          Chào mừng trở lại
        </Text>
        <Text
          textAlign="center"
          {...authDesign.subtitle}
          color="$textSecondary"
        >
          Đăng nhập để đồng bộ tiến độ giữa các thiết bị
        </Text>
      </YStack>
      <YStack marginTop={authDesign.loginFormGap} gap={authDesign.fieldGap}>
        <AppInput
          {...authDesign.input}
          labelProps={authDesign.label}
          labelGap={authDesign.labelGap}
          autoCapitalize="none"
          autoCorrect={false}
          label="Tên đăng nhập"
          placeholder="Nhập tên của bạn"
          value={username}
          onChangeText={setUsername}
          autoComplete="username"
        />
        <AppInput
          {...authDesign.input}
          labelProps={authDesign.label}
          labelGap={authDesign.labelGap}
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
          {...authDesign.button}
          marginTop={8}
          disabled={isSubmitting}
          opacity={isSubmitting ? 0.6 : 1}
          onPress={handleLogin}
        >
          {isSubmitting ? "Đang đăng nhập..." : "Xác nhận"}
        </AppButton>
        <XStack
          marginTop={-18}
          marginBottom={-18}
          justifyContent="space-between"
          flexWrap="wrap"
          gap="$small"
        >
          <AppButton
            appearance="text"
            fontSize={11}
            justifyContent="center"
            color="$textSecondary"
            role="button"
            onPress={() => setNotice("Khôi phục mật khẩu chưa khả dụng.")}
          >
            Quên mật khẩu?
          </AppButton>
          <AppButton
            appearance="text"
            fontSize={11}
            justifyContent="center"
            color="$color"
            role="button"
            onPress={() => router.push("/auth/register")}
          >
            Đăng ký
          </AppButton>
        </XStack>
      </YStack>
      <YStack marginTop={authDesign.googleGap}>
        <GoogleButton
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
          color="$textSecondary"
        >
          {notice}
        </Text>
      ) : null}
      <Text
        textAlign="center"
        color="$textSecondary"
        marginTop={28}
        {...authDesign.caption}
      >
        Bằng việc đăng nhập vào ứng dụng, bạn đồng ý với{"\n"}chính sách bảo mật
        của chúng tôi
      </Text>
    </AuthScaffold>
  );
}
