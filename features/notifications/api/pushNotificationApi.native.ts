import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import api from "@/lib/axios/axios";

const LOCAL_PUSH_TOKEN_KEY = "expo_push_token_current_device";

interface ApiEnvelope<T> {
  code: number;
  message?: string;
  result: T;
}

export type PushRegistrationResult = "registered" | "permission-denied";

export async function registerStudyPushToken(): Promise<PushRegistrationResult> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-reminders", {
      name: "Nhắc lịch học",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#B7F23B",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }

  if (status !== "granted") {
    await deactivateCurrentPushToken();
    return "permission-denied";
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error("Thiếu Expo projectId trong app config.");
  }

  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  await api.put<ApiEnvelope<unknown>>("/notification-service/push-tokens/me", {
    expoPushToken,
    platform: Platform.OS.toUpperCase(),
  });
  await AsyncStorage.setItem(LOCAL_PUSH_TOKEN_KEY, expoPushToken);
  return "registered";
}

export async function deactivateCurrentPushToken(): Promise<boolean> {
  const expoPushToken = await AsyncStorage.getItem(LOCAL_PUSH_TOKEN_KEY);
  if (!expoPushToken) return true;

  await api.post<ApiEnvelope<boolean>>(
    "/notification-service/push-tokens/me/deactivate",
    { expoPushToken },
  );
  await AsyncStorage.removeItem(LOCAL_PUSH_TOKEN_KEY);
  return true;
}
