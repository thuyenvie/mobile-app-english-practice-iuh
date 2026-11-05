import api from "@/lib/axios/axios";
import type { StudyTask } from "../../study/api/studyPlanApi";
import type { SavedVocabulary } from "./vocabularyApi";

export interface VocabularyTaskDetail {
  task: StudyTask;
  timezone: string;
  vocabulary: SavedVocabulary[];
}
export interface VocabularyTaskInput {
  requestId: string;
  vocabularyIds: string[];
  scheduledAt: string;
  estimatedMinutes: number;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}
interface Envelope<T> { result: T }
const path = "/exam-service/study-tasks";
export async function createVocabularyTask(input: VocabularyTaskInput) {
  return (await api.post<Envelope<VocabularyTaskDetail>>(path, input)).data.result;
}
export async function updateVocabularyTask(id: number, input: VocabularyTaskInput) {
  return (await api.patch<Envelope<VocabularyTaskDetail>>(`${path}/${id}`, input)).data.result;
}
export async function getVocabularyTask(id: number) {
  return (await api.get<Envelope<VocabularyTaskDetail>>(`${path}/${id}`)).data.result;
}
export async function getVocabularyTasks() {
  return (await api.get<Envelope<StudyTask[]>>(path)).data.result;
}
export async function cancelVocabularyTask(id: number) {
  await api.delete(`${path}/${id}`);
}
