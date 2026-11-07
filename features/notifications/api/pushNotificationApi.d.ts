export type PushRegistrationResult =
  | "registered"
  | "permission-denied"
  | "unsupported";

export function registerStudyPushToken(options?: { generation?: number; preserveTokenOnDenied?: boolean }): Promise<PushRegistrationResult>;
export function deactivateCurrentPushToken(): Promise<boolean>;
export type StudyPushStatus = "ready" | "permission-denied" | "unregistered" | "unsupported";
export function getStudyPushStatus(): Promise<StudyPushStatus>;
