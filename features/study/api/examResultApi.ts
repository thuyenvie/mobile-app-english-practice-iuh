import api from "@/lib/axios/axios";
import type { ExamAnswers } from "../types";

export interface ExamOptionSnapshot {
  label: string;
  text: string | null;
}

export interface ExamAnswerResult {
  questionNumber: number;
  selectedOption: string;
  correct: boolean;
  correctOption: string | null;
  questionContent: string | null;
  passageContent: string | null;
  options: ExamOptionSnapshot[];
}

export interface ExamResult {
  resultId: number;
  userId: string;
  year: number;
  testNumber: number;
  section: "LISTENING" | "READING";
  partNumber: number | null;
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  startedAt: string;
  submittedAt: string;
  answers: ExamAnswerResult[];
}

export type ExamHistoryItem = Omit<ExamResult, "userId" | "startedAt" | "answers">;

interface ExamHistoryPage {
  items: ExamHistoryItem[];
  page: number;
  totalPages: number;
  totalItems: number;
}

interface ExamApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

const resultsPath = "/exam-service/exams/results";

export async function getExamHistory(page = 0, size = 10): Promise<ExamHistoryPage> {
  return (await api.get<ExamApiResponse<ExamHistoryPage>>(resultsPath, { params: { page, size } })).data.result;
}

export async function getExamResult(resultId: number): Promise<ExamResult> {
  return (await api.get<ExamApiResponse<ExamResult>>(`${resultsPath}/${resultId}`)).data.result;
}

export async function submitReadingPart(
  year: number,
  testNumber: number,
  partNumber: number,
  answers: ExamAnswers,
  startedAt: string,
): Promise<ExamResult> {
  const payload = {
    startedAt,
    answers: Object.entries(answers).map(([questionNumber, selectedOption]) => ({
      questionNumber: Number(questionNumber),
      selectedOption,
    })),
  };
  const path = `/exam-service/exams/${year}/${testNumber}/reading/parts/${partNumber}/submit`;
  return (await api.post<ExamApiResponse<ExamResult>>(path, payload)).data.result;
}
