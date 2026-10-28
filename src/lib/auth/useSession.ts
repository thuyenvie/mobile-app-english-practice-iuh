import { useSyncExternalStore } from "react";
import { getInitialSessionSnapshot, getSessionSnapshot, subscribeSession } from "./sessionStore";

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getInitialSessionSnapshot);
}
