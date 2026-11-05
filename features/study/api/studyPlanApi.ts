import api from "@/lib/axios/axios";

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

export async function getStudyPlan(): Promise<StudyPlan | null> {
  return (await api.get<ApiEnvelope<StudyPlan | null>>(basePath)).data.result;
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
