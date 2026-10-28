import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { resetSessionExpiration } from "./sessionEvents";
import { assertSessionGeneration, getSessionSnapshot } from "./sessionStore";

interface CredentialChange {
  generation?: number;
  onSaved?: () => void;
}
let credentialWrites: Promise<unknown> = Promise.resolve();
function serializeCredentials<T>(operation: () => Promise<T>): Promise<T> {
  const result = credentialWrites.then(operation);
  credentialWrites = result.catch(() => undefined);
  return result;
}

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

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

// Save refresh first so a later access-token write failure does not lose the rotated credential.
export async function saveTokenPair(
  accessToken: string, refreshToken: string, options: CredentialChange = {},
): Promise<void> {
  const generation = options.generation ?? getSessionSnapshot().generation;
  return serializeCredentials(async () => {
    assertSessionGeneration(generation);
    await saveRefreshToken(refreshToken);
    await saveAccessToken(accessToken);
    assertSessionGeneration(generation);
    resetSessionExpiration();
    options.onSaved?.();
  });
}

export async function removeAccessToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function removeTokens(options: CredentialChange = {}): Promise<void> {
  const generation = options.generation ?? getSessionSnapshot().generation;
  return serializeCredentials(async () => {
    assertSessionGeneration(generation);
    if (Platform.OS === "web") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      options.onSaved?.();
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    options.onSaved?.();
  });
}
