import api from "@/lib/axios/axios";
import { toListeningAnswers } from "../utils/listening";
import type { QuestionAudioSegment } from "../types";
import { getExamHistory, getExamResult, type ExamHistoryItem, type ExamResult } from "./examResultApi";

export interface ListeningAudio {
  audioId: number;
  durationMs: number;
  streamPath: string;
}
export type QuestionAudio = QuestionAudioSegment;
export type ListeningResult = ExamResult;
export type ListeningHistoryItem = ExamHistoryItem;
export type ListeningHistoryPage = { items: ListeningHistoryItem[]; page: number; totalPages: number; totalItems: number };
const path = (year: number, test: number) => `/exam-service/exams/${year}/${test}/listening`;

export async function getListeningHistory(page = 0, size = 10): Promise<ListeningHistoryPage> {
  return getExamHistory(page, size);
}

export async function getListeningResult(resultId: number): Promise<ListeningResult> {
  return getExamResult(resultId);
}

export async function getListeningAudio(year: number, test: number) {
  return (await api.get<{ result: ListeningAudio }>(`${path(year, test)}/audio`)).data.result;
}
export async function getQuestionAudio(year: number, test: number, question: number) {
  return (await api.get<{ result: QuestionAudio }>(`${path(year, test)}/audio/questions/${question}`)).data.result;
}
export async function submitListening(year: number, test: number, answers: Record<number, string>, startedAt: string) {
  // Backend cham ca 100 cau, khong phai chi Part dang mo.
  return (await api.post<{ result: ListeningResult }>(`${path(year, test)}/submit`, {
    startedAt,
    answers: toListeningAnswers(answers),
  })).data.result;
}
