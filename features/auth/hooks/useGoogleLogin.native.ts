import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import Constants, { ExecutionEnvironment } from "expo-constants";

import { loginWithGoogleIdToken } from "../api/authApi";

const serverClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

function validateGoogleConfiguration(): void {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error(
      "Google Sign-In không chạy trong Expo Go. Hãy cài EAS development build rồi chạy npm run android/ios.",
    );
  }
  if (!serverClientId) {
    throw new Error("Thiếu EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }
  if (androidClientId && serverClientId === androidClientId) {
    throw new Error("Web Client ID đang dùng nhầm Android Client ID.");
  }
}

function getNativeGoogleError(error: unknown): Error {
  // Preserve the backend response for getLoginErrorMessage.
  if (isAxiosError(error)) return error;
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return error instanceof Error
      ? error
      : new Error("Đăng nhập Google thất bại.");
  }
  if (error.code === "IN_PROGRESS") {
    return new Error("Đăng nhập Google đang được xử lý.");
  }
  if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
    return new Error("Google Play Services chưa có hoặc cần được cập nhật.");
  }
  if (error.code === "10" || error.code === "DEVELOPER_ERROR") {
    return new Error(
      "Google OAuth chưa khớp package name/SHA-1 của bản build Android.",
    );
  }
  return new Error(
    "message" in error && typeof error.message === "string"
      ? error.message
      : "Đăng nhập Google thất bại.",
  );
}

export function useGoogleLogin() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const completeGoogleSignIn = useCallback(async (idToken: string) => {
    return loginWithGoogleIdToken(idToken);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    validateGoogleConfiguration();
    setIsGoogleLoading(true);

    try {
      const { GoogleSignin, isSuccessResponse } = await import(
        "@react-native-google-signin/google-signin"
      );
      GoogleSignin.configure({
        webClientId: serverClientId,
        iosClientId:
          process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
        offlineAccess: false,
      });
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return null;
      if (!response.data.idToken) {
        throw new Error("Google không trả về ID token.");
      }
      return await loginWithGoogleIdToken(response.data.idToken);
    } catch (error) {
      throw getNativeGoogleError(error);
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  return { completeGoogleSignIn, isGoogleLoading, signInWithGoogle };
}
