import { Text } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { authDesign } from "@/theme/tokens";

interface GoogleButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onError?: (message: string) => void;
  onIdToken?: (idToken: string) => void;
  onPress: () => void;
}

export function GoogleButton({
  disabled,
  loading,
  onPress,
}: GoogleButtonProps) {
  return (
    <AppButton
      {...authDesign.button}
      borderRadius={100}
      color="$color"
      backgroundColor={authDesign.colors.surface}
      borderWidth={1}
      borderColor={authDesign.colors.border}
      pressStyle={{ backgroundColor: "$borderColor" }}
      onPress={onPress}
      disabled={disabled}
      opacity={disabled ? 0.6 : 1}
      aria-label="Tiếp tục với Google"
      icon={
        <Text color={authDesign.colors.google} fontSize={26} fontWeight="700">
          G
        </Text>
      }
    >
      {loading ? "Đang kết nối Google..." : "Tiếp tục với Google"}
    </AppButton>
  );
}
