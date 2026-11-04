import api from "@/lib/axios/axios";

export interface StudySession {
  id: number;
  taskId: number;
  taskTitle: string;
  section: "READING" | "LISTENING";
  partNumber: number | null;
  estimatedMinutes: number;
  status: "RUNNING" | "PAUSED" | "ENDED";
  startedAt: string;
  lastResumedAt: string | null;
  endedAt: string | null;
  activeSeconds: number;
  elapsedSeconds: number;
  serverTime: string;
  completedTask: boolean;
  autoPaused: boolean;
}
interface Envelope<T> { result: T }
const path = "/exam-service/study-sessions";
export async function getActiveStudySession() {
  return (await api.get<Envelope<StudySession | null>>(`${path}/me/active`)).data.result;
}
export async function startStudySession(taskId: number) {
  return (await api.post<Envelope<StudySession>>(path, { taskId })).data.result;
}
export async function changeStudySession(id: number, action: "pause" | "resume" | "end", completeTask = false) {
  return (await api.post<Envelope<StudySession>>(`${path}/${id}/${action}`, action === "end" ? { completeTask } : {})).data.result;
}
