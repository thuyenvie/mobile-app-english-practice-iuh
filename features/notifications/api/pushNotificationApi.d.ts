export type PushRegistrationResult =
  | "registered"
  | "permission-denied"
  | "unsupported";

export function registerStudyPushToken(): Promise<PushRegistrationResult>;
export function deactivateCurrentPushToken(): Promise<boolean>;
export type StudyPushStatus = "ready" | "permission-denied" | "unregistered" | "unsupported";
export function getStudyPushStatus(): Promise<StudyPushStatus>;
