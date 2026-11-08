import { requireOptionalNativeModule } from "expo-modules-core";
import { recordAuthDiagnostic } from "./authDiagnostics";

interface ExpoUpdatesDiagnostics {
  isEnabled?: boolean;
  isEmbeddedLaunch?: boolean;
  channel?: string | null;
  runtimeVersion?: string | null;
  updateId?: string | null;
}

export function recordUpdateDiagnostic(): void {
  // Older development clients may not include Expo Updates. The optional lookup
  // returns null without importing its JS entry point or throwing during startup.
  const updates = requireOptionalNativeModule<ExpoUpdatesDiagnostics>("ExpoUpdates");
  if (!updates) {
    recordAuthDiagnostic("updates", { updatesAvailable: false });
    return;
  }

  recordAuthDiagnostic("updates", {
    updatesAvailable: true,
    updatesEnabled: updates.isEnabled,
    isEmbeddedLaunch: updates.isEmbeddedLaunch,
    channel: updates.channel,
    runtimeVersion: updates.runtimeVersion,
    updateId: updates.updateId,
  });
}
