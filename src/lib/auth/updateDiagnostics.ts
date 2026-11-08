import { recordAuthDiagnostic } from "./authDiagnostics";

type ExpoUpdatesModule = typeof import("expo-updates");

export async function recordUpdateDiagnostic(): Promise<void> {
  try {
    // Older development clients may not include the Expo Updates native module.
    // Load it lazily so diagnostics never prevent the app from starting.
    const Updates: ExpoUpdatesModule = await import("expo-updates");
    recordAuthDiagnostic("updates", {
      updatesEnabled: Updates.isEnabled,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      updateId: Updates.updateId,
    });
  } catch {
    recordAuthDiagnostic("updates");
  }
}
