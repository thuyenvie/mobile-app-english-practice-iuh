import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from "react";
import { createSettingsStore, type SettingsStore } from "../../features/settings/storage/settingsStorage";
import type { SettingsContextValue } from "../../features/settings/types";

const deviceSettingsStore = createSettingsStore(AsyncStorage);
const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Mount outside SessionProvider. Hydration never gates/replaces the navigator. */
export function SettingsProvider({ children, store = deviceSettingsStore }: PropsWithChildren<{ store?: SettingsStore }>) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { void store.hydrate().catch(() => {}); }, [store]);
  const value = useMemo<SettingsContextValue>(() => ({
    ...snapshot, updateSettings: store.updateSettings, retryHydration: store.hydrate,
  }), [snapshot, store]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
