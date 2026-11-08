import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Text, XStack, YStack, type InputRef } from "tamagui";

import { useAppTheme } from "@/theme/useAppTheme";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AuthScaffold } from "../components/AuthScaffold";
import { getRegisterErrorMessage, register } from "../api/authApi";
import { validateRegisterForm } from "../utils/registerValidation";

export default function RegisterScreen() {
  const { authFormDesign: design } = useAppTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const emailInput = useRef<InputRef>(null);
  const passwordInput = useRef<InputRef>(null);
  const confirmInput = useRef<InputRef>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleRegister = async () => {
    if (submitting.current) return;
    const error = validateRegisterForm({ fullName, email, password, confirmPassword });
    if (error) { setNotice(error); return; }
    submitting.current = true;
    setIsSubmitting(true);
    setNotice("");
    try {
      await register({ fullName, email, password });
      if (mounted.current) router.replace({ pathname: "/auth/login", params: { registered: "1" } });
    } catch (error) {
      if (mounted.current) setNotice(getRegisterErrorMessage(error));
    } finally {
      submitting.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold title="Tạo tài khoản" subtitle="Đăng ký để bắt đầu lộ trình TOEIC của bạn.">
      <YStack gap={10}>
        <AppInput {...design.input} labelProps={design.label} labelGap={4}
          label="Họ và tên" placeholder="Nhập họ và tên" value={fullName} onChangeText={setFullName}
          disabled={isSubmitting} autoComplete="name" autoCapitalize="words" maxLength={100}
          returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailInput.current?.focus()} />
        <AppInput {...design.input} labelProps={design.label} labelGap={4}
          label="Email" placeholder="Nhập email" value={email} onChangeText={setEmail} inputRef={emailInput}
          disabled={isSubmitting} autoComplete="email" keyboardType="email-address" autoCapitalize="none"
          autoCorrect={false} maxLength={254} returnKeyType="next" submitBehavior="submit"
          onSubmitEditing={() => passwordInput.current?.focus()} />
        <AppInput {...design.input} labelProps={design.label} labelGap={4}
          label="Mật khẩu" placeholder="Từ 8 ký tự, tối đa 72 byte UTF-8" value={password}
          onChangeText={setPassword} inputRef={passwordInput} disabled={isSubmitting}
          secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false}
          returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => confirmInput.current?.focus()} />
        <AppInput {...design.input} labelProps={design.label} labelGap={4}
          label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" value={confirmPassword}
          onChangeText={setConfirmPassword} inputRef={confirmInput} disabled={isSubmitting}
          secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false}
          returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={handleRegister} />
        {notice ? <Text role="alert" aria-live="polite" color={design.error}>{notice}</Text> : null}
        <AppButton {...design.button} disabled={isSubmitting} opacity={isSubmitting ? 0.6 : 1}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }} onPress={handleRegister}>
          {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
        </AppButton>
      </YStack>
      <XStack alignItems="center" justifyContent="center" flexWrap="wrap" gap={6}>
        <Text color={design.muted} fontSize={14}>Đã có tài khoản?</Text>
        <AppButton appearance="text" color={design.link} disabled={isSubmitting}
          onPress={() => router.replace("/auth/login")}>Đăng nhập</AppButton>
      </XStack>
      <AppButton appearance="text" color={design.link} disabled={isSubmitting}
        onPress={() => router.replace("/(tabs)/home")}>Tiếp tục học thử</AppButton>
    </AuthScaffold>
  );
}
