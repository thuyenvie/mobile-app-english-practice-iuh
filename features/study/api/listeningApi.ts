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
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  answers: { questionNumber: number; selectedOption: string; correct: boolean }[];
}
const path = (year: number, test: number) => `/exam-service/exams/${year}/${test}/listening`;

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
