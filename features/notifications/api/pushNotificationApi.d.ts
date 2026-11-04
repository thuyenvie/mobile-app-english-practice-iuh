export type PushRegistrationResult =
  | "registered"
  | "permission-denied"
  | "unsupported";

export function registerStudyPushToken(): Promise<PushRegistrationResult>;
export function deactivateCurrentPushToken(): Promise<boolean>;
