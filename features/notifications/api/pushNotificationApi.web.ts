export type PushRegistrationResult = "unsupported";
export type StudyPushStatus = "ready" | "permission-denied" | "unregistered" | "unsupported";
export async function getStudyPushStatus(): Promise<StudyPushStatus> { return "unsupported"; }

export async function registerStudyPushToken(_options?: { generation?: number; preserveTokenOnDenied?: boolean }): Promise<PushRegistrationResult> {
  return "unsupported";
}

export async function deactivateCurrentPushToken(): Promise<boolean> {
  return true;
}
