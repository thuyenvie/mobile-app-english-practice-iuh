import { useState } from "react";
import { Modal } from "react-native";
import { router } from "expo-router";
import { Text, YStack } from "tamagui";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/lib/auth/useSession";
import { homeDesign } from "@/theme/tokens";

export function GuestPracticeNotice({ hasAnswers, busy = false }: { hasAnswers: boolean; busy?: boolean }) {
  const session = useSession();
  const [confirm, setConfirm] = useState(false);
  if (session.status !== "guest") return null;
  const openLogin = () => router.replace("/auth/login");
  return <>
    <YStack paddingHorizontal={14} paddingVertical={6} gap={4}>
      <Text color={homeDesign.colors.secondary} fontSize={12}>Học thử · Bài làm và kết quả không được lưu.</Text>
      <AppButton appearance="text" disabled={busy} onPress={() => hasAnswers ? setConfirm(true) : openLogin()}>
        Đăng nhập để lưu các bài học tiếp theo
      </AppButton>
    </YStack>
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
      <YStack flex={1} justifyContent="center" padding={24} backgroundColor="#000b">
        <YStack padding={20} borderRadius={16} gap={16} backgroundColor={homeDesign.colors.surface}>
          <Text color={homeDesign.colors.text}>Đăng nhập sẽ hủy bài học thử hiện tại. Bài làm và kết quả sẽ không được chuyển vào tài khoản.</Text>
          <AppButton onPress={openLogin}>Hủy bài và đăng nhập</AppButton>
          <AppButton appearance="text" onPress={() => setConfirm(false)}>Tiếp tục làm bài</AppButton>
        </YStack>
      </YStack>
    </Modal>
  </>;
}
