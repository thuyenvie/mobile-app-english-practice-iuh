import { useCallback, useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSettings } from "@/providers/SettingsProvider";
import { useSession } from "@/lib/auth/useSession";
import { createListeningAutoplay } from "../utils/listeningAutoplay";

export function useListeningAutoplay({ unit, ready, active, start, stop, history }: {
  unit: string; ready: boolean; active: boolean; start: () => void; stop: () => void; history?: Set<string>;
}) {
  const settings = useSettings();
  const session = useSession();
  const policy = useMemo(() => createListeningAutoplay(!AppState.currentState || AppState.currentState === "active", history), [history]);
  const hydrated = settings.hydration === "ready";
  const enabled = settings.preferences.listeningAutoplay;
  useEffect(() => {
    policy.update({ unit, ready: ready && hydrated, active, enabled, generation: session.generation, start, stop });
  }, [policy, unit, ready, hydrated, active, enabled, session.generation, start, stop]);
  useFocusEffect(useCallback(() => { policy.focus(); return () => policy.blur(); }, [policy]));
  useEffect(() => {
    policy.foreground(!AppState.currentState || AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", value => policy.foreground(value === "active"));
    return () => { subscription.remove(); policy.dispose(); };
  }, [policy]);
  return policy;
}
