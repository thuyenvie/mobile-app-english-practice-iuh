import { GoogleLogin } from "@react-oauth/google";
import { YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";

interface GoogleButtonProps {
  variant?: "login";
  disabled?: boolean;
  loading?: boolean;
  onError?: (message: string) => void;
  onIdToken?: (idToken: string) => void;
  onPress: () => void;
}

export function GoogleButton({
  loading,
  onError,
  onIdToken,
}: GoogleButtonProps) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!clientId) {
    return (
      <AppButton onPress={() => onError?.("Thiếu Google Web Client ID.")}>
        Tiếp tục với Google
      </AppButton>
    );
  }

  if (loading) {
    return <AppButton disabled>Đang xác thực Google...</AppButton>;
  }

  return (
    <YStack alignItems="center">
      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) onIdToken?.(response.credential);
          else onError?.("Google không trả về ID token.");
        }}
        onError={() =>
          onError?.(
            "Không thể mở Google. Hãy mở URL trực tiếp trong Chrome/Safari và cho phép popup.",
          )
        }
        text="continue_with"
        shape="pill"
        size="large"
        width="320"
      />
    </YStack>
  );
}
