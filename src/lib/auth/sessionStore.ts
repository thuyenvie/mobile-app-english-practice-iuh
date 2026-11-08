import { recordAuthDiagnostic } from "./authDiagnostics";

export type SessionStatus = "loading" | "guest" | "authenticated";
export interface SessionSnapshot {
  status: SessionStatus;
  subject: string | null;
  generation: number;
  error: string | null;
}

const initial: SessionSnapshot = { status: "loading", subject: null, generation: 0, error: null };
let snapshot = initial;
const listeners = new Set<() => void>();
export const getSessionSnapshot = () => snapshot;
export const getInitialSessionSnapshot = () => initial;
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(next: SessionSnapshot) {
  recordAuthDiagnostic("session", { sessionBefore: snapshot.status, sessionAfter: next.status });
  snapshot = next;
  listeners.forEach(listener => listener());
}
export function authenticateSession(subject: string) {
  publish({ status: "authenticated", subject, generation: snapshot.generation + 1, error: null });
}
export function enterGuestSession() {
  publish({ status: "guest", subject: null, generation: snapshot.generation + 1, error: null });
}
export function setSessionRestoreError(message: string | null) {
  publish({ ...snapshot, error: message });
}
export class SessionChangedError extends Error {
  constructor() {
    super("Phiên đã thay đổi. Vui lòng mở lại màn hình.");
    this.name = "SessionChangedError";
  }
}
export function assertSessionGeneration(generation: number) {
  if (snapshot.generation !== generation) throw new SessionChangedError();
}
export function requireAccount() {
  if (snapshot.status !== "authenticated" || !snapshot.subject) {
    throw new Error("Vui lòng đăng nhập để sử dụng chức năng này.");
  }
  return snapshot;
}
export function readTokenSubject(token: string): string {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Token đăng nhập không hợp lệ.");
  const value = payload.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(value.padEnd(Math.ceil(value.length / 4) * 4, "="));
  const json = decodeURIComponent(Array.from(bytes, char => "%" + char.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
  const subject: unknown = JSON.parse(json).sub;
  if (typeof subject !== "string" || !subject) throw new Error("Token thiếu thông tin tài khoản.");
  return subject;
}
