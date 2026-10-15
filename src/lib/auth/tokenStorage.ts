import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "access_token";

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveAccessToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

<<<<<<< Updated upstream
=======
// Save refresh first so a later access-token write failure does not lose the rotated credential.
export async function saveTokenPair(accessToken: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    await saveRefreshToken(refreshToken);
  } else if (Platform.OS === "web") {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    // Current Identity API issues only an access token; clear the previous session refresh token.
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
  await saveAccessToken(accessToken);
  resetSessionExpiration();
}

>>>>>>> Stashed changes
export async function removeAccessToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
