import { useCallback, useEffect, useState } from "react";
import {
  makeRedirectUri,
  ResponseType,
  useAuthRequest,
} from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { loginWithGoogleCode } from "../api/authApi";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const redirectUri = makeRedirectUri({
  scheme: "com.dohoainho.englishpractice",
  // Web quay lại đúng màn hình login để xử lý authorization code sau reload.
  path: Platform.OS === "web" ? "auth/login" : "oauth/google",
  native: "com.dohoainho.englishpractice:/oauthredirect",
});

const GOOGLE_PKCE_KEY = "google_oauth_code_verifier";
const GOOGLE_STATE_KEY = "google_oauth_state";

function getGoogleClientId(): string | undefined {
  return Platform.select({
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
}

function isValidGoogleClientId(value?: string): value is string {
  // Client ID có đuôi này; chuỗi SHA-1 chứa dấu ':' không phải Client ID.
  return Boolean(
    value && /^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(value),
  );
}

function getBackendPlatform(): "WEB" | "ANDROID" | "IOS" {
  if (Platform.OS === "android") return "ANDROID";
  if (Platform.OS === "ios") return "IOS";
  return "WEB";
}

export function useGoogleLogin() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleResultMessage, setGoogleResultMessage] = useState<string | null>(null);
  const configuredClientId = getGoogleClientId();
  const validClientId = isValidGoogleClientId(configuredClientId)
    ? configuredClientId
    : undefined;
  const [request, , promptAsync] = useAuthRequest(
    {
      // Chuỗi tạm giúp render UI; khi bấm nút sẽ báo rõ nếu thiếu Client ID.
      clientId: validClientId ?? "missing-google-client-id",
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
      scopes: ["openid", "profile", "email"],
      extraParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
    discovery,
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const returnedState = params.get("state");
    const oauthError = params.get("error");
    if (!code && !oauthError) return;

    const codeVerifier = sessionStorage.getItem(GOOGLE_PKCE_KEY);
    const expectedState = sessionStorage.getItem(GOOGLE_STATE_KEY);

    // Xóa code khỏi address bar để refresh không exchange lại cùng một code.
    window.history.replaceState({}, document.title, window.location.pathname);
    sessionStorage.removeItem(GOOGLE_PKCE_KEY);
    sessionStorage.removeItem(GOOGLE_STATE_KEY);

    if (oauthError) {
      setGoogleResultMessage("Bạn đã hủy hoặc Google từ chối đăng nhập.");
      return;
    }
    if (!codeVerifier || !expectedState || returnedState !== expectedState) {
      setGoogleResultMessage("Phiên đăng nhập Google không hợp lệ. Vui lòng thử lại.");
      return;
    }

    setIsGoogleLoading(true);
    loginWithGoogleCode({
      code: code!,
      codeVerifier,
      redirectUri,
      platform: "WEB",
    })
      .then(() => setGoogleResultMessage("Đăng nhập Google thành công."))
      .catch((error: unknown) =>
        setGoogleResultMessage(
          error instanceof Error ? error.message : "Đăng nhập Google thất bại.",
        ),
      )
      .finally(() => setIsGoogleLoading(false));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!validClientId) {
      throw new Error(
        `Google Client ID cho ${Platform.OS} không hợp lệ. ` +
          "Hãy dùng giá trị kết thúc bằng .apps.googleusercontent.com, không dùng SHA-1.",
      );
    }
    if (!request?.codeVerifier || !request.url) {
      throw new Error("Google OAuth chưa sẵn sàng. Vui lòng thử lại.");
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      // Dùng redirect cùng tab để không bị browser chặn popup.
      sessionStorage.setItem(GOOGLE_PKCE_KEY, request.codeVerifier);
      sessionStorage.setItem(GOOGLE_STATE_KEY, request.state);
      window.location.assign(request.url);
      return null;
    }

    // Native dùng system browser; không phụ thuộc popup của browser Web.
    const authPrompt = promptAsync();
    setIsGoogleLoading(true);
    try {
      const authResult = await authPrompt;

      if (authResult.type === "cancel" || authResult.type === "dismiss") {
        return null;
      }
      if (authResult.type !== "success" || !authResult.params.code) {
        throw new Error(
          authResult.type === "error"
            ? authResult.error?.message || "Google từ chối đăng nhập."
            : "Không nhận được authorization code từ Google.",
        );
      }

      return await loginWithGoogleCode({
        code: authResult.params.code,
        codeVerifier: request.codeVerifier,
        redirectUri,
        platform: getBackendPlatform(),
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }, [promptAsync, request, validClientId]);

  return {
    isGoogleLoading,
    googleResultMessage,
    redirectUri,
    signInWithGoogle,
  };
}
