import { Text } from "tamagui";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { AppButton } from "@/components/ui/AppButton";
import { authDesign, loginDesign } from "@/theme/tokens";

interface GoogleButtonProps {
  variant?: "login";
  disabled?: boolean;
  loading?: boolean;
  onError?: (message: string) => void;
  onIdToken?: (idToken: string) => void;
  onPress: () => void;
}

export function GoogleButton({
  variant,
  disabled,
  loading,
  onPress,
}: GoogleButtonProps) {
  const design = variant === "login" ? loginDesign : authDesign;
  return (
    <AppButton
      {...design.button}
      borderRadius={variant === "login" ? 12 : 100}
      color={design.colors.text}
      backgroundColor={design.colors.surface}
      borderWidth={1}
      borderColor={design.colors.border}
      pressStyle={{ backgroundColor: variant === "login" ? loginDesign.colors.border : "$borderColor" }}
      onPress={onPress}
      disabled={disabled}
      opacity={disabled ? 0.6 : 1}
      aria-label="Tiếp tục với Google"
      icon={
        variant === "login" ? (
          <FontAwesome name="google" size={20} color={authDesign.colors.google} />
        ) : (
          <Text color={authDesign.colors.google} fontSize={26} fontWeight="700">G</Text>
        )
      }
    >
      {loading ? "Đang kết nối Google..." : "Tiếp tục với Google"}
    </AppButton>
  );
}
