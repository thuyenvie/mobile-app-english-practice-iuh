import api from "@/lib/axios/axios";
import { assertSessionGeneration, requireAccount } from "@/lib/auth/sessionStore";

export type StudyTaskStatus = "PENDING" | "COMPLETED" | "SKIPPED";
export type StudySection = "LISTENING" | "READING" | "VOCABULARY";

export interface StudyPlan {
  id: number;
  targetScore: number;
  currentScore: number | null;
  targetDate: string | null;
  dailyMinutes: number;
  timezone: string;
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderDays: number[];
  quietStart: string | null;
  quietEnd: string | null;
  updatedAt: string;
}

export interface StudyTask {
  id: number;
  dueDate: string;
  taskType: string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  section: StudySection;
  partNumber: number | null;
  status: StudyTaskStatus;
  completedAt: string | null;
  completedResultId: number | null;
  source?: "SYSTEM" | "USER";
  scheduledAt?: string | null;
  reminderAt?: string | null;
  reminderMinutesBefore?: number | null;
  vocabularyCount?: number;
}

export interface StudySchedule {
  plan: StudyPlan | null;
  fromDate: string;
  toDate: string;
  targetMinutes: number;
  completedMinutes: number;
  completedTasks: number;
  totalTasks: number;
  tasks: StudyTask[];
  sessionSeconds: number;
}

export interface SaveStudyPlanInput {
  targetScore: number;
  currentScore: number | null;
  targetDate: string | null;
  dailyMinutes: number;
  timezone: string;
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderDays: number[];
  quietStart: string | null;
  quietEnd: string | null;
}

interface ApiEnvelope<T> {
  code: number;
  message?: string;
  result: T;
}

const basePath = "/exam-service/study-plans/me";

export async function getStudyPlan(generation?: number): Promise<StudyPlan | null> {
  if (generation !== undefined) assertSessionGeneration(generation);
  const response = await api.get<ApiEnvelope<StudyPlan | null>>(basePath, { sessionGeneration: generation });
  if (generation !== undefined) assertSessionGeneration(generation);
  return response.data.result;
}

export type StudyReminderInput = Pick<StudyPlan, "reminderEnabled" | "reminderTime" | "quietStart" | "quietEnd">;
/** Whitelist the reminder contract even when a caller passes an entire plan. */
export async function updateStudyReminder(input: StudyReminderInput): Promise<StudyPlan> {
  const { generation } = requireAccount();
  const { reminderEnabled, reminderTime, quietStart, quietEnd } = input;
  const response = await api.patch<ApiEnvelope<StudyPlan>>(`${basePath}/reminder`,
    { reminderEnabled, reminderTime, quietStart, quietEnd }, { sessionGeneration: generation });
  assertSessionGeneration(generation);
  return response.data.result;
}

export async function saveStudyPlan(input: SaveStudyPlanInput): Promise<StudyPlan> {
  return (await api.post<ApiEnvelope<StudyPlan>>(basePath, input)).data.result;
}

export async function getTodaySchedule(): Promise<StudySchedule> {
  return (await api.get<ApiEnvelope<StudySchedule>>(`${basePath}/today`)).data.result;
}

export async function getWeekSchedule(): Promise<StudySchedule> {
  return (await api.get<ApiEnvelope<StudySchedule>>(`${basePath}/week`)).data.result;
}

export async function completeStudyTask(taskId: number): Promise<StudyTask> {
  return (await api.patch<ApiEnvelope<StudyTask>>(`${basePath}/tasks/${taskId}/complete`)).data.result;
}
