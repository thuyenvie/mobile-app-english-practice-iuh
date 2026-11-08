import { useAppTheme } from "@/theme/useAppTheme";

import { router } from "expo-router";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { AuthScaffold } from "../components/AuthScaffold";


export default function RegisterScreen() {
  const { authFormDesign: design } = useAppTheme();
  const goToLogin = () => router.dismissTo("/auth/login");

  return (
    <AuthScaffold title="Đăng ký chưa khả dụng" subtitle="Ứng dụng hiện chưa hỗ trợ tạo tài khoản mới.">
      <YStack gap={16}>
        <Text color={design.muted} fontSize={16}>Bạn có thể đăng nhập bằng tài khoản hiện có hoặc tiếp tục học thử.</Text>
        <AppButton onPress={goToLogin}>Về đăng nhập</AppButton>
        <AppButton appearance="text" color={design.link} onPress={() => router.replace("/(tabs)/home")}>Tiếp tục học thử</AppButton>
      </YStack>
    </AuthScaffold>
  );
}
