import type { ExamAnswers } from "../types";

// Loai ban nhap hong va dap an D cua Part 2.
export function sanitizeListeningAnswers(value: unknown): ExamAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, label]) => {
    const number = Number(key);
    const labels = number >= 7 && number <= 31 ? ["A", "B", "C"] : ["A", "B", "C", "D"];
    return Number.isInteger(number) && number >= 1 && number <= 100 &&
      String(number) === key && typeof label === "string" && labels.includes(label);
  }));
}

export function toListeningAnswers(answers: ExamAnswers) {
  return Object.entries(sanitizeListeningAnswers(answers))
    .map(([questionNumber, selectedOption]) => ({ questionNumber: Number(questionNumber), selectedOption }))
    .sort((a, b) => a.questionNumber - b.questionNumber);
}

export function listeningStreamUrl(baseUrl: string, year: number, test: number) {
  // Khong gui JWT den URL bat ky tu response backend.
  return `${baseUrl.replace(/\/+$/, "")}/exam-service/exams/${year}/${test}/listening/audio/stream`;
}


// Giu dap an dung pham vi Part khi khoi phuc ban nhap Listening cu.
export function listeningPartAnswers(answers: ExamAnswers, part: number): ExamAnswers {
  const range: Record<number, [number, number]> = { 1: [1, 6], 2: [7, 31], 3: [32, 70], 4: [71, 100] };
  const bounds = range[part];
  if (!bounds) return {};
  return Object.fromEntries(Object.entries(sanitizeListeningAnswers(answers))
    .filter(([number]) => Number(number) >= bounds[0] && Number(number) <= bounds[1]));
}
