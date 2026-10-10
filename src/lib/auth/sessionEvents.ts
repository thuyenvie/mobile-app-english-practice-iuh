import { DeviceEventEmitter } from "react-native";

const SESSION_EXPIRED_EVENT = "auth:session-expired";
let expirationNotified = false;

export function notifySessionExpired(): void {
  if (expirationNotified) return;
  expirationNotified = true;
  DeviceEventEmitter.emit(SESSION_EXPIRED_EVENT);
}

export function resetSessionExpiration(): void {
  expirationNotified = false;
}

export function subscribeToSessionExpiration(listener: () => void) {
  return DeviceEventEmitter.addListener(SESSION_EXPIRED_EVENT, listener);
}
