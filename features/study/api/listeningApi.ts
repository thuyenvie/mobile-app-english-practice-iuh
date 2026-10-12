import api from "@/lib/axios/axios";
import { toListeningAnswers } from "../utils/listening";

export interface ListeningAudio {
  audioId: number;
  durationMs: number;
  streamPath: string;
}
export interface QuestionAudio {
  firstQuestionNumber: number;
  lastQuestionNumber: number;
  startMs: number;
  endMs: number;
}
export interface ListeningResult {
  resultId: number;
  year: number;
  testNumber: number;
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  submittedAt: string;
  answers: { questionNumber: number; selectedOption: string; correct: boolean; correctOption: string | null }[];
}
export interface ListeningHistoryItem {
  resultId: number;
  year: number;
  testNumber: number;
  section: "LISTENING";
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  submittedAt: string;
}
export interface ListeningHistoryPage {
  items: ListeningHistoryItem[];
  page: number;
  totalPages: number;
  totalItems: number;
}
const path = (year: number, test: number) => `/exam-service/exams/${year}/${test}/listening`;
const historyPath = "/exam-service/exams/listening/results";

export async function getListeningHistory(page = 0, size = 10): Promise<ListeningHistoryPage> {
  return (await api.get<{ result: ListeningHistoryPage }>(historyPath, { params: { page, size } })).data.result;
}

export async function getListeningResult(resultId: number): Promise<ListeningResult> {
  return (await api.get<{ result: ListeningResult }>(`${historyPath}/${resultId}`)).data.result;
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
