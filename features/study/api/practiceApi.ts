import { publicApi } from "@/lib/axios/axios";
import { assertSessionGeneration, getSessionSnapshot } from "@/lib/auth/sessionStore";
import { submitReadingPart, type ExamResult } from "./examResultApi";
import { submitListening } from "./listeningApi";
import { toListeningAnswers } from "../utils/listening";
import type { ExamAnswers } from "../types";

// Matches GuestExamResultResponse in exam-service, with no invented account/result identifiers.
export type GuestExamResult = Omit<ExamResult, "resultId" | "userId">;
export type PracticeResult = GuestExamResult | ExamResult;

function isGuestAttempt(generation: number): boolean {
  assertSessionGeneration(generation);
  const status = getSessionSnapshot().status;
  if (status === "loading") throw new Error("Đang kiểm tra phiên. Vui lòng thử lại.");
  return status === "guest";
}

export async function submitReadingPractice(
  generation: number, year: number, testNumber: number, partNumber: number, answers: ExamAnswers, startedAt: string,
): Promise<PracticeResult> {
  if (!isGuestAttempt(generation)) return submitReadingPart(year, testNumber, partNumber, answers, startedAt);
  const payload = { startedAt, answers: Object.entries(answers).map(([number, selectedOption]) => ({
    questionNumber: Number(number), selectedOption,
  })) };
  const path = "/exam-service/exams/guest/" + year + "/" + testNumber + "/reading/parts/" + partNumber + "/submit";
  return (await publicApi.post<{ result: GuestExamResult }>(path, payload)).data.result;
}

export async function submitListeningPractice(
  generation: number, year: number, testNumber: number, answers: ExamAnswers, startedAt: string,
): Promise<PracticeResult> {
  if (!isGuestAttempt(generation)) return submitListening(year, testNumber, answers, startedAt);
  const path = "/exam-service/exams/guest/" + year + "/" + testNumber + "/listening/submit";
  return (await publicApi.post<{ result: GuestExamResult }>(path, {
    startedAt, answers: toListeningAnswers(answers),
  })).data.result;
}
