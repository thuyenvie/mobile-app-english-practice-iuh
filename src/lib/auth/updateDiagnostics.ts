import * as Updates from "expo-updates";
import { recordAuthDiagnostic } from "./authDiagnostics";

export function recordUpdateDiagnostic(): void {
  try {
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
